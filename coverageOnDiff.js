'use strict';

const _ = require('lodash');
const parseDiff = require('parse-diff');
const path = require('path');

const coverageOnDiff = {};

coverageOnDiff.getNewLines = (rawFile) => {
  const newLines = {};
  const diff = parseDiff(rawFile);
  for (const file of diff) {
    if (file.to.match(/.*\.[jt]s$/) && !file.to.match(/test[A-Za-z0-9]*\.[jt]s$/) && !file.to.match(/spec\.[jt]s$/)) {
      for (const chunk of file.chunks) {
        for (const change of chunk.changes) {
          if (change.type === 'add') {
            if (!newLines[file.to]) {
              newLines[file.to] = [];
            }
            newLines[file.to].push(change.ln);
          }
        }
      }
    }
  }
  return newLines;
};

coverageOnDiff.getCodeCoverage = (coverage, rootDir) => {
  return _.mapKeys(JSON.parse(coverage), (value, key) => {
    const relativePath = path.relative(rootDir, key);
    if (!key.includes(relativePath)) {
      throw new Error('invalid root dir used against code coverage file');
    }
    return relativePath;
  });
};

function changedStmtCoverage(coverage, changedLines) {
  const coveredLines = [];
  const uncoveredLines = [];

  for (const [s, count] of Object.entries(coverage.s)) {
    const c = coverage.statementMap[s];
    for (let i = c.start.line; i <= c.end.line; i++) {
      if (count > 0 && !uncoveredLines.includes(i)) {
        coveredLines.push(i);
      } else {
        uncoveredLines.push(i);
        _.remove(coveredLines, (value) => {
          return value === i;
        });
      }
    }
  }

  let nCovered = 0;
  let nUncovered = 0;
  const changedCoveredLines = [];
  const unchangedCoveredLines = [];

  for (const line of changedLines) {
    if (coveredLines.includes(line)) {
      changedCoveredLines.push(line);
      nCovered++;
    }
    if (uncoveredLines.includes(line)) {
      unchangedCoveredLines.push(line);
      nUncovered++;
    }
  }

  return {
    nCovered,
    nUncovered,
    coveredLines: changedCoveredLines,
    unCoveredLines: unchangedCoveredLines,
  };
}

function changedBranchCoverage(coverage, changedLines) {
  const coveredLines = [];
  const uncoveredLines = [];

  for (const [b, count] of Object.entries(coverage.b)) {
    const c = coverage.branchMap[b];
    for (let i = c.loc.start.line; i <= c.loc.end.line; i++) {
      if (_.sum(count) >= count.length && !count.includes(0) && !uncoveredLines.includes(i)) {
        coveredLines.push(i);
      } else {
        uncoveredLines.push(i);
        _.remove(coveredLines, (value) => {
          return value === i;
        });
      }
    }
  }

  let nCovered = 0;
  let nUncovered = 0;
  const changedCoveredLines = [];
  const unchangedCoveredLines = [];

  for (const line of changedLines) {
    if (coveredLines.includes(line)) {
      changedCoveredLines.push(line);
      nCovered++;
    }
    if (uncoveredLines.includes(line)) {
      unchangedCoveredLines.push(line);
      nUncovered++;
    }
  }

  return {
    nCovered,
    nUncovered,
    coveredLines: changedCoveredLines,
    unCoveredLines: unchangedCoveredLines,
  };
}

coverageOnDiff.evaluateCodeCoverage = (coverage, newLine) => {
  const diffCodeCoverage = {};
  for (const [file, changedLines] of Object.entries(newLine)) {
    if (coverage[file]) {
      diffCodeCoverage[file] = {};
      diffCodeCoverage[file].lines = changedLines;
      diffCodeCoverage[file].stmt = changedStmtCoverage(coverage[file], changedLines);
      diffCodeCoverage[file].branch = changedBranchCoverage(coverage[file], changedLines);
    }
  }
  return diffCodeCoverage;
};

coverageOnDiff.calculateTotalCoverage = (diffCodeCoverage) => {
  let totalCoveredStmt = 0;
  let totalStmt = 0;
  let totalCoveredBranch = 0;
  let totalBranch = 0;

  _.forEach(diffCodeCoverage, (value) => {
    totalCoveredStmt += value.stmt.nCovered;
    totalStmt += (value.stmt.nCovered + value.stmt.nUncovered);
    totalCoveredBranch += value.branch.nCovered;
    totalBranch += (value.branch.nCovered + value.branch.nUncovered);
  });

  const totalStmtPercentage = totalStmt === 0
                                ? 100
                                : _.round((totalCoveredStmt/totalStmt)*100, 2);
  const totalBranchPercentage = totalBranch === 0
                                ? 100
                                :_.round((totalCoveredBranch/totalBranch)*100, 2);

  return {
    totalCoveredStmt,
    totalStmt,
    totalStmtPercentage,
    totalCoveredBranch,
    totalBranch,
    totalBranchPercentage,
  };
};

module.exports = coverageOnDiff;
