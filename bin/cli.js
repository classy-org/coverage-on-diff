#!/usr/bin/env node
'use strict';
const fs = require('fs');
const argv = require('yargs')
    .usage('Run diff against current code coverage\nUsage: $0 -d [file]')
    .option('diff', {
      alias: 'd',
      describe: 'diff file to compare code coverage to',
      string: true,
      coerce: (arg) => {
        if (!fs.existsSync(arg)) {
          throw Error('diff: file does not exist');
        }
        return fs.readFileSync(arg, 'utf-8');
      },
    })
    .option('coverage', {
      alias: 'c',
      describe: 'instanbul full json code coverage report to use against diff',
      string: true,
      default: './coverage/coverage-final.json',
      coerce: (arg) => {
        if (!fs.existsSync(arg)) {
          throw Error('coverage: file does not exist');
        }
        return fs.readFileSync(arg, 'utf-8');
      },
    })
    .option('path', {
      alias: 'p',
      describe: 'relative root dir for code coverage',
      string: true,
      default: process.cwd(),
    })
    .option('report', {
      alias: 'r',
      describe: 'type of report',
      choices: ['text', 'text-summary'],
      array: true,
      default: 'text-summary',
    })
    .option('stmt', {
      alias: 's',
      describe: 'percentage threshold for stmt coverage',
      number: true,
      default: 80,
      coerce: (arg) => {
        if (isNaN(arg)) {
          throw Error('stmt: must pass in a number');
        }
        if (arg < 0 || arg > 100) {
          throw Error('stmt: percentage must be between 0-100 ');
        }
        return arg;
      },
    })
    .option('branch', {
      alias: 'b',
      describe: 'percentage threshold for branch coverage',
      number: true,
      default: 0,
      coerce: (arg) => {
        if (isNaN(arg)) {
          throw Error('branch: must pass in a number');
        }
        if (arg < 0 || arg > 100) {
          throw Error('branch: percentage must be between 0-100 ');
        }
        return arg;
      },
    })
    .option('ignore', {
      alias: 'i',
      describe: 'ignore threshold checks',
      boolean: true,
    })
    .demandOption(['d'])
    .help()
    .argv;
const table = require('table');
const chalk = require('chalk');
const _ = require('lodash');

const coverageOnDiff = require('../coverageOnDiff');

function getColorMessage(percentage, msg) {
  if (percentage >= 80) {
    return chalk.green(msg);
  } else if (percentage >= 50) {
    return chalk.yellow(msg);
  } else {
    return chalk.red(msg);
  }
}

try {
  /*
   * Start of script
   */
  const newLines = coverageOnDiff.getNewLines(argv.diff);
  const coverage = coverageOnDiff.getCodeCoverage(argv.coverage, argv.path);
  const diffCodeCoverage = coverageOnDiff.evaluateCodeCoverage(coverage, newLines);

  if (_.isEmpty(diffCodeCoverage)) {
    console.log(getColorMessage(100, `No new js or ts files added`));
    process.exit();
  }

  const {
    totalCoveredStmt,
    totalStmt,
    totalStmtPercentage,
    totalCoveredBranch,
    totalBranch,
    totalBranchPercentage,
  } = coverageOnDiff.calculateTotalCoverage(diffCodeCoverage);

  /*
   * Coverage Reporting
   */
  if (argv.report.includes('text')) {
    const data = [];
    data.push(['File', '% Stmt', '% Branch', 'Uncovered Line #s', 'Uncovered Branch Line #s', 'Lines Changed']);
    data.push(['All changed files',
      getColorMessage(totalStmtPercentage, `${totalStmtPercentage}%`),
      getColorMessage(totalBranchPercentage, `${totalBranchPercentage}%`),
      '',
      '',
      '']);

    _.forEach(diffCodeCoverage, (value, key) => {
      const stmtChanged = value.stmt.nCovered + value.stmt.nUncovered;
      const branchChanged = value.branch.nCovered + value.branch.nUncovered;
      const stmtPercentage = stmtChanged === 0
                              ? 100
                              : _.round((value.stmt.nCovered / stmtChanged) * 100, 2);
      const branchPercentage = branchChanged === 0
                                ? 100
                                : _.round((value.branch.nCovered / branchChanged) * 100, 2);
      data.push([`    ${key}`,
        getColorMessage(stmtPercentage, `${stmtPercentage}%`),
        getColorMessage(branchPercentage, `${branchPercentage}%`),
        value.stmt.unCoveredLines.toString(),
        value.branch.unCoveredLines.toString(),
        value.lines]);
    });
    const options = {
      columns: {
        4: {
          truncate: 150,
        },
      },
      drawHorizontalLine: (index, size) => {
        return index === 0 || index === 1 || index === size;
      },
    };

    console.log(table.table(data, options));
  }
  if (argv.report.includes('text-summary')) {
    console.log(`=============================== Diff Coverage summary ===============================`);
    console.log(getColorMessage((totalStmtPercentage), `Statements   : ${totalStmtPercentage}% ( ${totalCoveredStmt}/${totalStmt} )`));
    console.log(getColorMessage((totalBranchPercentage), `Branches     : ${totalBranchPercentage}% ( ${totalCoveredBranch}/${totalBranch} )`));
    console.log(`=====================================================================================`);
  }

  /*
   * Threshold Checks
   */
  if (!argv.ignore) {
    if (totalStmtPercentage < argv.stmt) {
      console.log(getColorMessage(0, `Failed statement percentage threshold check: ${totalStmtPercentage}% of minimum ${argv.stmt}%`));
      process.exit(1);
    }
    if (totalBranchPercentage < argv.branch) {
      console.log(getColorMessage(0, `Failed branch percentage threshold check: ${totalStmtPercentage}% of minimum ${argv.branch}%`));
      process.exit(1);
    }
    console.log(getColorMessage(100, `Threshold checks pass: Stmt Threshold ${argv.stmt}% - Branch Threshold ${argv.branch}%`));
  } else {
    console.log(getColorMessage(100, `Threshold checks disabled`));
  }
} catch (e) {
  console.log(getColorMessage(0, `Error: ${e.message}`));
}
