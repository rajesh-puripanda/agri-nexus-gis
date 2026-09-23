"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const comparativeValidationService =
  require("../services/interpolation/comparativeValidationService");

const comparativeAnalysisService =
  require("../services/interpolation/comparativeAnalysisService");

/* ============================================================
   COMMON FIXTURES
   ============================================================ */

function createCommonSamples() {
  return [
    {
      id: 1,
      sample_code: "CV-001",
      latitude: 17.6800,
      longitude: 83.2000,
      value: 10,
    },

    {
      id: 2,
      sample_code: "CV-002",
      latitude: 17.7000,
      longitude: 83.2200,
      value: 15,
    },

    {
      id: 3,
      sample_code: "CV-003",
      latitude: 17.7200,
      longitude: 83.2000,
      value: 20,
    },

    {
      id: 4,
      sample_code: "CV-004",
      latitude: 17.6900,
      longitude: 83.2500,
      value: 25,
    },

    {
      id: 5,
      sample_code: "CV-005",
      latitude: 17.7300,
      longitude: 83.2600,
      value: 30,
    },

    {
      id: 6,
      sample_code: "CV-006",
      latitude: 17.7500,
      longitude: 83.2300,
      value: 35,
    },
  ];
}

function createKrigingParameters() {
  return {
    model: "spherical",
    nugget: 0.2,
    sill: 0.8,
    range: 4000,
  };
}

function runRealComparativeValidation() {
  return comparativeValidationService
    .runComparativeValidation({
      samples:
        createCommonSamples(),

      kriging: {
        parameters:
          createKrigingParameters(),
      },
    });
}

/* ============================================================
   BASIC CONTRACT
   ============================================================ */

test(
  "12.9 analysis returns the comparative analysis contract",
  () => {
    const validation =
      runRealComparativeValidation();

    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          validation,
        );

    assert.ok(result);

    assert.equal(
      result.analysisType,
      "comparative_interpolation_analysis",
    );

    assert.equal(
      result.diagnosticType,
      "loocv_analysis",
    );

    assert.equal(
      result.sampleCount,
      6,
    );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.status,
      "complete",
    );
  },
);

/* ============================================================
   METHOD COVERAGE
   ============================================================ */

test(
  "12.9 analysis contains all four supported methods",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    assert.deepEqual(
      Object.keys(result.methods),
      [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ],
    );
  },
);

test(
  "12.9 preserves method execution status",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    for (
      const method of [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ]
    ) {
      assert.ok(
        result.methods[method],
      );

      assert.equal(
        result.methods[method].status,
        "complete",
      );

      assert.equal(
        result.methods[method].applicable,
        true,
      );
    }
  },
);

/* ============================================================
   ERROR ANALYSIS
   ============================================================ */

test(
  "12.9 preserves normalized error metrics",
  () => {
    const validation =
      runRealComparativeValidation();

    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          validation,
        );

    for (
      const method of [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ]
    ) {
      const sourceMetrics =
        validation.methods[
          method
        ].metrics;

      const analysisMetrics =
        result.methods[
          method
        ].errorAnalysis;

      assert.equal(
        analysisMetrics.meanError,
        sourceMetrics.meanError,
      );

      assert.equal(
        analysisMetrics.meanAbsoluteError,
        sourceMetrics.meanAbsoluteError,
      );

      assert.equal(
        analysisMetrics.rmse,
        sourceMetrics.rmse,
      );

      assert.equal(
        analysisMetrics.maxAbsoluteError,
        sourceMetrics.maxAbsoluteError,
      );
    }
  },
);

/* ============================================================
   FOLD COVERAGE
   ============================================================ */

test(
  "12.9 calculates fold coverage from normalized folds",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    const idw =
      result.methods.idw;

    const kriging =
      result.methods.kriging;

    const spline =
      result.methods.spline;

    const nearestNeighbour =
      result.methods.nearest_neighbour;

    assert.equal(
      idw.foldCoverage.totalFolds,
      6,
    );

    assert.equal(
      idw.foldCoverage.successfulFolds,
      6,
    );

    assert.equal(
      idw.foldCoverage.failedFolds,
      0,
    );

    assert.equal(
      kriging.foldCoverage.totalFolds,
      6,
    );

    assert.equal(
      kriging.foldCoverage.successfulFolds,
      6,
    );

    assert.equal(
      kriging.foldCoverage.failedFolds,
      0,
    );

    assert.equal(
      nearestNeighbour.foldCoverage.totalFolds,
      6,
    );

    assert.equal(
      nearestNeighbour.foldCoverage.successfulFolds,
      6,
    );

    assert.equal(
      nearestNeighbour.foldCoverage.failedFolds,
      0,
    );

    assert.equal(
      spline.foldCoverage.totalFolds,
      6,
    );

    assert.equal(
      spline.foldCoverage.successfulFolds +
        spline.foldCoverage.failedFolds,
      6,
    );
  },
);

test(
  "12.9 reports a bounded fold success rate",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    for (
      const method of Object.values(
        result.methods,
      )
    ) {
      const rate =
        method.foldCoverage.successRate;

      assert.ok(
        rate === null ||
        (
          rate >= 0 &&
          rate <= 1
        ),
      );
    }
  },
);

/* ============================================================
   NORMALIZED FOLDS
   ============================================================ */

test(
  "12.9 normalizes observed and predicted values across methods",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    const idwFirst =
      result.methods.idw.folds[0];

    const krigingFirst =
      result.methods.kriging.folds[0];

    const nearestFirst =
      result.methods
        .nearest_neighbour
        .folds[0];

    assert.equal(
      idwFirst.identifier,
      "CV-001",
    );

    assert.equal(
      krigingFirst.identifier,
      "CV-001",
    );

    assert.equal(
      nearestFirst.identifier,
      "CV-001",
    );

    assert.equal(
      idwFirst.observed,
      10,
    );

    assert.equal(
      krigingFirst.observed,
      10,
    );

    assert.equal(
      nearestFirst.observed,
      10,
    );

    assert.ok(
      Number.isFinite(
        idwFirst.predicted,
      ),
    );

    assert.ok(
      Number.isFinite(
        krigingFirst.predicted,
      ),
    );

    assert.ok(
      Number.isFinite(
        nearestFirst.predicted,
      ),
    );
  },
);

/* ============================================================
   PREDICTION CONSISTENCY
   ============================================================ */

test(
  "12.9 reports common successful fold coverage",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    const consistency =
      result.predictionConsistency;

    assert.ok(
      Number.isInteger(
        consistency.commonSuccessfulFoldCount,
      ),
    );

    assert.ok(
      consistency.commonSuccessfulFoldCount >=
        0,
    );

    assert.ok(
      consistency.commonSuccessfulFoldCount <=
        6,
    );

    assert.equal(
      consistency.commonSuccessfulFolds.length,
      consistency.commonSuccessfulFoldCount,
    );
  },
);

test(
  "12.9 reports common failed folds without inventing failures",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    const consistency =
      result.predictionConsistency;

    assert.equal(
      consistency.commonFailedFolds.length,
      consistency.commonFailedFoldCount,
    );

    assert.ok(
      consistency.commonFailedFoldCount >=
        0,
    );
  },
);

/* ============================================================
   PAIRWISE DIFFERENCES
   ============================================================ */

test(
  "12.9 creates all six pairwise method comparisons",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    assert.deepEqual(
      Object.keys(
        result.methodDifferences,
      ),
      [
        "idw_vs_kriging",
        "idw_vs_spline",
        "idw_vs_nearest_neighbour",
        "kriging_vs_spline",
        "kriging_vs_nearest_neighbour",
        "spline_vs_nearest_neighbour",
      ],
    );
  },
);

test(
  "12.9 pairwise differences use only common successful folds",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    for (
      const comparison of Object.values(
        result.methodDifferences,
      )
    ) {
      assert.ok(
        Number.isInteger(
          comparison.comparableFoldCount,
        ),
      );

      assert.ok(
        comparison.comparableFoldCount >=
          0,
      );

      assert.equal(
        comparison.differences.length,
        comparison.comparableFoldCount,
      );

      if (
        comparison.comparableFoldCount >
        0
      ) {
        assert.ok(
          Number.isFinite(
            comparison.meanAbsoluteDifference,
          ),
        );

        assert.ok(
          Number.isFinite(
            comparison.maxAbsoluteDifference,
          ),
        );
      } else {
        assert.equal(
          comparison.meanAbsoluteDifference,
          null,
        );

        assert.equal(
          comparison.maxAbsoluteDifference,
          null,
        );
      }
    }
  },
);

/* ============================================================
   PAIRWISE DIFFERENCE MATH
   ============================================================ */

test(
  "12.9 pairwise differences preserve signed and absolute differences",
  () => {
    const validation =
      runRealComparativeValidation();

    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          validation,
        );

    const comparison =
      result.methodDifferences
        .idw_vs_kriging;

    for (
      const difference of
        comparison.differences
    ) {
      assert.equal(
        difference.difference,
        difference.predictionA -
          difference.predictionB,
      );

      assert.equal(
        difference.absoluteDifference,
        Math.abs(
          difference.difference,
        ),
      );
    }
  },
);

/* ============================================================
   FAILURE DIAGNOSTICS
   ============================================================ */

test(
  "12.9 preserves method errors",
  () => {
    const validation =
      runRealComparativeValidation();

    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          validation,
        );

    for (
      const method of Object.values(
        result.methods,
      )
    ) {
      assert.deepEqual(
        method.errors,
        validation.methods[
          method.method
        ].errors,
      );
    }
  },
);

/* ============================================================
   INVALID INPUT
   ============================================================ */

test(
  "12.9 rejects a missing comparative validation result",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          null,
        );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.status,
      "failed",
    );

    assert.ok(
      Array.isArray(
        result.errors,
      ),
    );

    assert.ok(
      result.errors.length > 0,
    );
  },
);

test(
  "12.9 rejects missing methods",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          {
            success: true,
            status: "complete",
            sampleCount: 6,
          },
        );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.status,
      "failed",
    );
  },
);

/* ============================================================
   DIAGNOSTIC-ONLY DESIGN
   ============================================================ */

test(
  "12.9 does not add ranking or selection fields",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    for (
      const field of [
        "ranking",
        "rank",
        "score",
        "bestMethod",
        "winner",
        "selectedMethod",
        "recommendedMethod",
      ]
    ) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          field,
        ),
        false,
        `Unexpected field: ${field}`,
      );
    }
  },
);

/* ============================================================
   INPUT IMMUTABILITY
   ============================================================ */

test(
  "12.9 does not mutate the comparative validation result",
  () => {
    const validation =
      runRealComparativeValidation();

    const original =
      JSON.parse(
        JSON.stringify(
          validation,
        ),
      );

    comparativeAnalysisService
      .analyzeComparativeValidation(
        validation,
      );

    assert.deepEqual(
      validation,
      original,
    );
  },
);

/* ============================================================
   METHOD PAIR SYMMETRY
   ============================================================ */

test(
  "12.9 exposes deterministic method-pair ordering",
  () => {
    const result =
      comparativeAnalysisService
        .analyzeComparativeValidation(
          runRealComparativeValidation(),
        );

    assert.deepEqual(
      Object.keys(
        result.methodDifferences,
      ),
      [
        "idw_vs_kriging",
        "idw_vs_spline",
        "idw_vs_nearest_neighbour",
        "kriging_vs_spline",
        "kriging_vs_nearest_neighbour",
        "spline_vs_nearest_neighbour",
      ],
    );
  },
);
