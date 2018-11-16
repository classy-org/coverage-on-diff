'use strict';

const fs = require('fs');

const dataFactory = {};

const badBranchDiff = fs.readFileSync(`${process.cwd()}/examples/bad-branch-added.diff`, 'utf-8');
const badStmtDiff = fs.readFileSync(`${process.cwd()}/examples/bad-stmt-added.diff`, 'utf-8');
const goodStmtDiff = fs.readFileSync(`${process.cwd()}/examples/good-stmt-added.diff`, 'utf-8');
const goodBranchDiff = fs.readFileSync(`${process.cwd()}/examples/good-branch-added.diff`, 'utf-8');
const nonJsChangeDiff = fs.readFileSync(`${process.cwd()}/examples/non-js-change.diff`, 'utf-8');
const coverageExample = fs.readFileSync(`${process.cwd()}/examples/coverage-example.json`);
const parsedCodeCoverage = JSON.parse(fs.readFileSync(`${process.cwd()}/test/files/parsed-code-coverage.json`));

dataFactory.getBadBranchDiff = () => badBranchDiff;
dataFactory.getBadStmtDiff = () => badStmtDiff;
dataFactory.getGoodBranchDiff = () => goodBranchDiff;
dataFactory.getGoodStmtDiff = () => goodStmtDiff;
dataFactory.getNonJsChangeDiff = () => nonJsChangeDiff;
dataFactory.getCoverageExample = () => coverageExample;

dataFactory.getParsedCodeCoverage = () => parsedCodeCoverage;
dataFactory.getEvaluatedStmtCoverage = () => {
  return {
    nCovered: 1,
    nUncovered: 2,
    coveredLines: [10],
    unCoveredLines: [11, 12],
  };
};
dataFactory.getEvaluatedBranchCoverage = () => {
  return {
    nCovered: 1,
    nUncovered: 0,
  };
};
dataFactory.getEvaluatedStmtCoverageNoChange = () => {
  return {
    nCovered: 0,
    nUncovered: 0,
    coveredLines: [],
    unCoveredLines: [],
  };
};
dataFactory.getEvaluatedBranchCoverageNoChange = () => {
  return {
    nCovered: 0,
    nUncovered: 0,
  };
};
dataFactory.getEvaluatedCodeCoverage = () => {
  return {
    'dummy/dummyUtil.js': {
      lines: [10],
      stmt: dataFactory.getEvaluatedStmtCoverage(),
      branch: dataFactory.getEvaluatedBranchCoverage(),
    },
  };
};
dataFactory.getEvaluatedCodeCoverageNoChange = () => {
  return {
    'dummy/dummyUtil.js': {
      lines: [10],
      stmt: dataFactory.getEvaluatedStmtCoverageNoChange(),
      branch: dataFactory.getEvaluatedBranchCoverageNoChange(),
    },
  };
};

dataFactory.getNoChangedStmt = () => {
  return [7];
};
dataFactory.getGoodChangedStmt = () => {
  return [10];
};
dataFactory.getBadChangedStmt = () => {
  return [15];
};
dataFactory.getMixChangedStmt = () => {
  return [21, 22, 23, 24, 25];
};
dataFactory.getBadChangedStmtBranch = () => {
  return [30];
};

module.exports = dataFactory;
