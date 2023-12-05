'use strict';
require('should');
require('should-sinon');
const _ = require('lodash');
const parseDiff = require('parse-diff');
const rewire = require('rewire');
const sinon = require('sinon');
const dataFactory = require('./dataFactory');
const coverageOnDiff = rewire('../coverageOnDiff');

describe('CoverageOnDiff Test', () => {
  describe('precheck', () => {
    it('non-js-change.diff should contain test files', () => {
      const diff = parseDiff(dataFactory.getNonJsChangeDiff());
      const hasTestFile = _.some(diff, (file) => {
        return file.to.match(/test[A-Za-z0-9]*\.[jt]s$/);
      });
      const hasSpecFile = _.some(diff, (file) => {
        return file.to.match(/spec\.[jt]s$/);
      });
      hasTestFile.should.be.true();
      hasSpecFile.should.be.true();
    });
  });

  describe('getNewLines', () => {
    it('should return empty object if no js/ts changes were made', () => {
      const newLines = coverageOnDiff.getNewLines(dataFactory.getNonJsChangeDiff());
      newLines.should.eql({});
    });
    it('should return object with file and lines added', () => {
      const newLines = coverageOnDiff.getNewLines(dataFactory.getGoodBranchDiff());
      newLines.should.eql({
        'dummy/dummyUtil.js': [27, 28, 29],
      });
    });
  });

  describe('getCodeCoverage', () => {
    it('should create a code coverage dictionary', () => {
      const coverage = coverageOnDiff.getCodeCoverage(dataFactory.getCoverageExample(), '/dev');
      coverage.should.have.keys('dummy/dummyUtil.js');
    });

    it('should error since bad root dir', () => {
      (() => coverageOnDiff.getCodeCoverage(dataFactory.getCoverageExample(), '/buster')).should.throw();
    });
  });

  describe('evaluateCodeCoverage', () => {
    let changedStmtCoverageStub;
    let changedBranchCoverageStub;
    let revertChangedStmtCoverage;
    let revertChangedBranchCoverage;
    beforeEach(() => {
      changedStmtCoverageStub = sinon.stub().returns(dataFactory.getEvaluatedStmtCoverage());
      changedBranchCoverageStub = sinon.stub().returns(dataFactory.getEvaluatedBranchCoverage());
      revertChangedStmtCoverage = coverageOnDiff.__set__('changedStmtCoverage', changedStmtCoverageStub);
      revertChangedBranchCoverage = coverageOnDiff.__set__('changedBranchCoverage', changedBranchCoverageStub);
    });

    afterEach(() => {
      revertChangedStmtCoverage();
      revertChangedBranchCoverage();
      changedStmtCoverageStub.reset();
      changedBranchCoverageStub.reset();
    });

    it('should return an empty object', () => {
      const diffCodeCoverage = coverageOnDiff.evaluateCodeCoverage({}, {});
      changedStmtCoverageStub.should.not.be.calledOnce();
      changedBranchCoverageStub.should.not.be.calledOnce();
      diffCodeCoverage.should.eql({});
    });

    it('should return evaluated code coverage', () => {
      const diffCodeCoverage = coverageOnDiff.evaluateCodeCoverage(dataFactory.getParsedCodeCoverage(), {
        'dummy/dummyUtil.js': [10],
      });
      changedStmtCoverageStub.should.be.calledOnce();
      changedBranchCoverageStub.should.be.calledOnce();
      changedStmtCoverageStub.should.be.calledWith(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], [10]);
      changedBranchCoverageStub.should.be.calledWith(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], [10]);
      diffCodeCoverage.should.eql({
        'dummy/dummyUtil.js': {
          lines: [10],
          stmt: dataFactory.getEvaluatedStmtCoverage(),
          branch: dataFactory.getEvaluatedBranchCoverage(),
        },
      });
    });

    it('should not include changed files that are not in the coverage', () => {
      const diffCodeCoverage = coverageOnDiff.evaluateCodeCoverage(dataFactory.getParsedCodeCoverage(), {
        'buster/dummyUtil.js': [10],
      });
      changedStmtCoverageStub.should.not.be.calledOnce();
      changedBranchCoverageStub.should.not.be.calledOnce();
      diffCodeCoverage.should.not.have.property('buster/dummyUtil.js');
    });
  });

  describe('calculateTotalCoverage', () => {
    it('should be able to calculate the total stmt and branch coverage percentage', () => {
      const totalCoverage = coverageOnDiff.calculateTotalCoverage(dataFactory.getEvaluatedCodeCoverage());
      totalCoverage.should.eql({
        totalCoveredStmt: 1,
        totalStmt: 3,
        totalStmtPercentage: 33.33,
        totalCoveredBranch: 1,
        totalBranch: 1,
        totalBranchPercentage: 100,
      });
    });
    it('should default to 100% if there were no stmt or branch changes', () => {
      const totalCoverage = coverageOnDiff.calculateTotalCoverage(dataFactory.getEvaluatedCodeCoverageNoChange());
      totalCoverage.should.eql({
        totalCoveredStmt: 0,
        totalStmt: 0,
        totalStmtPercentage: 100,
        totalCoveredBranch: 0,
        totalBranch: 0,
        totalBranchPercentage: 100,
      });
    });
  });

  describe('private methods', () => {
    describe('changedStmtCoverage', () => {
      const changedStmtCoverage = coverageOnDiff.__get__('changedStmtCoverage');

      it('should have no line changes', () => {
        const result = changedStmtCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getNoChangedStmt());
        result.should.eql({
          nCovered: 0,
          nUncovered: 0,
          coveredLines: [],
          unCoveredLines: [],
        });
      });
      it('should be a covered line', () => {
        const result = changedStmtCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getGoodChangedStmt());
        result.should.eql({
          nCovered: 1,
          nUncovered: 0,
          coveredLines: [10],
          unCoveredLines: [],
        });
      });
      it('should be an uncovered line', () => {
        const result = changedStmtCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getBadChangedStmt());
        result.should.eql({
          nCovered: 0,
          nUncovered: 1,
          coveredLines: [],
          unCoveredLines: [15],
        });
      });
      it('should be covered and uncovered lines', () => {
        const result = changedStmtCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getMixChangedStmt());
        result.should.eql({
          nCovered: 4,
          nUncovered: 1,
          coveredLines: [21, 22, 24, 25],
          unCoveredLines: [23],
        });
      });
    });

    describe('changedBranchCoverage', () => {
      const changedBranchCoverage = coverageOnDiff.__get__('changedBranchCoverage');
      it('should have no branch changes', () => {
        const result = changedBranchCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getNoChangedStmt());
        result.should.eql({
          nCovered: 0,
          nUncovered: 0,
          coveredLines: [],
          unCoveredLines: [],
        });
      });
      it('should have covered branch changes', () => {
        const result = changedBranchCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getGoodChangedStmt());
        result.should.eql({
          nCovered: 1,
          nUncovered: 0,
          coveredLines: [10],
          unCoveredLines: [],
        });
      });
      it('should have uncovered branch changes', () => {
        const result = changedBranchCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getBadChangedStmt());
        result.should.eql({
          nCovered: 0,
          nUncovered: 1,
          coveredLines: [],
          unCoveredLines: [15],
        });
      });
      it('should be uncovered branch when there is at least 1 uncovered path', () => {
        const result = changedBranchCoverage(dataFactory.getParsedCodeCoverage()['dummy/dummyUtil.js'], dataFactory.getBadChangedStmtBranch());
        result.should.eql({
          nCovered: 0,
          nUncovered: 1,
          coveredLines: [],
          unCoveredLines: [30],
        });
      });
    });
  });
});
