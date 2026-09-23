"use strict";

// ============================================================
// server/tests/comparativeValidationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.3 — Common Comparative Validation Service Tests
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const service = require(
  "../services/interpolation/comparativeValidationService",
);

const {
  SUPPORTED_METHODS,
  VALIDATION_TYPE,
  DIAGNOSTIC_TYPE,
  isFiniteNumericValue,
  isSupportedMethod,
  normalizeMethod,
  normalizeStatus,
  determineApplicability,
  normalizeErrors,
  normalizeMetrics,
  normalizeFolds,
  normalizeSuccessfulFolds,
  normalizeFailedFolds,
  normalizeSampleCount,
  normalizeMethodResult,
  normalizeMethodResults,
  validateMethodResults,
  calculateComparativeSummary,
  performComparativeValidation,
  comparativeInterpolationValidation,
} = service;

/* ============================================================
   FIXTURES
   ============================================================ */

function buildCompleteResult(
  method,
  sampleCount = 5,
) {
  return {
    success: true,
    status: "complete",
    method,
    sampleCount,
    successfulFolds: sampleCount,
    failedFolds: 0,
    metrics: {
      meanError: 0.1,
      meanAbsoluteError: 0.2,
      rmse: 0.3,
      maxAbsoluteError: 0.5,
    },
    folds: [
      {
        success: true,
        index: 0,
        observed: 10,
        predicted: 10.1,
        error: 0.1,
        absoluteError: 0.1,
        squaredError: 0.01,
      },
    ],
    error: null,
    errors: [],
  };
}

function buildNotApplicableResult(
  method,
  sampleCount = 1,
) {
  return {
    success: true,
    status: "not_applicable",
    method,
    sampleCount,
    successfulFolds: 0,
    failedFolds: 0,
    metrics: null,
    folds: [],
    error: null,
    errors: [],
  };
}

function buildFailedResult(
  method,
  sampleCount = 5,
) {
  return {
    success: false,
    status: "failed",
    method,
    sampleCount,
    successfulFolds: 0,
    failedFolds: 1,
    metrics: null,
    folds: [],
    error: "Technical validation failure.",
    errors: [
      "Technical validation failure.",
    ],
  };
}

function buildAllCompleteResults() {
  return {
    idw: buildCompleteResult("idw"),
    kriging: buildCompleteResult("kriging"),
    spline: buildCompleteResult("spline"),
    nearest_neighbour:
      buildCompleteResult(
        "nearest_neighbour",
      ),
  };
}

/* ============================================================
   CONSTANTS
   ============================================================ */

test(
  "SUPPORTED_METHODS contains all four interpolation methods",
  () => {
    assert.deepEqual(
      SUPPORTED_METHODS,
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
  "VALIDATION_TYPE is correct",
  () => {
    assert.equal(
      VALIDATION_TYPE,
      "comparative_interpolation_validation",
    );
  },
);

/* ============================================================
   BASIC HELPERS
   ============================================================ */

test(
  "isFiniteNumericValue accepts finite numbers",
  () => {
    assert.equal(
      isFiniteNumericValue(10),
      true,
    );

    assert.equal(
      isFiniteNumericValue(-2.5),
      true,
    );
  },
);

test(
  "isFiniteNumericValue rejects non-numeric values",
  () => {
    assert.equal(
      isFiniteNumericValue("10"),
      false,
    );

    assert.equal(
      isFiniteNumericValue(NaN),
      false,
    );

    assert.equal(
      isFiniteNumericValue(Infinity),
      false,
    );

    assert.equal(
      isFiniteNumericValue(null),
      false,
    );
  },
);

test(
  "isSupportedMethod recognizes supported methods",
  () => {
    assert.equal(
      isSupportedMethod("idw"),
      true,
    );

    assert.equal(
      isSupportedMethod("kriging"),
      true,
    );

    assert.equal(
      isSupportedMethod("spline"),
      true,
    );

    assert.equal(
      isSupportedMethod(
        "nearest_neighbour",
      ),
      true,
    );
  },
);

test(
  "isSupportedMethod rejects unsupported methods",
  () => {
    assert.equal(
      isSupportedMethod("foo"),
      false,
    );

    assert.equal(
      isSupportedMethod(""),
      false,
    );

    assert.equal(
      isSupportedMethod(null),
      false,
    );
  },
);

test(
  "normalizeMethod trims and normalizes supported method names",
  () => {
    assert.equal(
      normalizeMethod(" IDW "),
      "idw",
    );

    assert.equal(
      normalizeMethod("KRIGING"),
      "kriging",
    );

    assert.equal(
      normalizeMethod(
        " nearest_neighbour ",
      ),
      "nearest_neighbour",
    );
  },
);

test(
  "normalizeMethod returns null for unsupported methods",
  () => {
    assert.equal(
      normalizeMethod("foo"),
      null,
    );

    assert.equal(
      normalizeMethod(""),
      null,
    );

    assert.equal(
      normalizeMethod(null),
      null,
    );
  },
);

/* ============================================================
   STATUS
   ============================================================ */

test(
  "normalizeStatus preserves explicit status",
  () => {
    assert.equal(
      normalizeStatus({
        status: "complete",
        success: false,
      }),
      "complete",
    );
  },
);

test(
  "normalizeStatus derives complete from success",
  () => {
    assert.equal(
      normalizeStatus({
        success: true,
      }),
      "complete",
    );
  },
);

test(
  "normalizeStatus derives failed from unsuccessful result",
  () => {
    assert.equal(
      normalizeStatus({
        success: false,
      }),
      "failed",
    );
  },
);

test(
  "normalizeStatus returns failed for invalid result",
  () => {
    assert.equal(
      normalizeStatus(null),
      "failed",
    );
  },
);

test(
  "determineApplicability returns false for not_applicable",
  () => {
    assert.equal(
      determineApplicability({
        status: "not_applicable",
      }),
      false,
    );
  },
);

test(
  "determineApplicability returns true for complete",
  () => {
    assert.equal(
      determineApplicability({
        status: "complete",
      }),
      true,
    );
  },
);

test(
  "determineApplicability returns true for failed technical result",
  () => {
    assert.equal(
      determineApplicability({
        status: "failed",
      }),
      true,
    );
  },
);

/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

test(
  "normalizeErrors copies errors array",
  () => {
    const source = [
      "first",
      "second",
    ];

    const result =
      normalizeErrors({
        errors: source,
      });

    assert.deepEqual(
      result,
      source,
    );

    assert.notStrictEqual(
      result,
      source,
    );
  },
);

test(
  "normalizeErrors converts singular error to array",
  () => {
    assert.deepEqual(
      normalizeErrors({
        error: "Something failed.",
      }),
      ["Something failed."],
    );
  },
);

test(
  "normalizeErrors returns empty array when no error exists",
  () => {
    assert.deepEqual(
      normalizeErrors({
        success: true,
      }),
      [],
    );
  },
);

test(
  "normalizeErrors handles invalid result",
  () => {
    assert.deepEqual(
      normalizeErrors(null),
      [
        "Validation result is unavailable or invalid.",
      ],
    );
  },
);

/* ============================================================
   METRICS
   ============================================================ */

test(
  "normalizeMetrics preserves finite metrics",
  () => {
    const result =
      normalizeMetrics({
        metrics: {
          meanError: 0.1,
          meanAbsoluteError: 0.2,
          rmse: 0.3,
          maxAbsoluteError: 0.4,
        },
      });

    assert.deepEqual(
      result,
      {
        meanError: 0.1,
        meanAbsoluteError: 0.2,
        rmse: 0.3,
        maxAbsoluteError: 0.4,
      },
    );
  },
);

test(
  "normalizeMetrics converts invalid metrics to null",
  () => {
    const result =
      normalizeMetrics({
        metrics: {
          meanError: NaN,
          meanAbsoluteError: "bad",
          rmse: Infinity,
          maxAbsoluteError: null,
        },
      });

    assert.deepEqual(
      result,
      {
        meanError: null,
        meanAbsoluteError: null,
        rmse: null,
        maxAbsoluteError: null,
      },
    );
  },
);

test(
  "normalizeMetrics returns null when metrics are absent",
  () => {
    assert.equal(
      normalizeMetrics({
        success: true,
      }),
      null,
    );
  },
);

/* ============================================================
   FOLDS
   ============================================================ */

test(
  "normalizeFolds copies valid folds",
  () => {
    const folds = [
      {
        success: true,
        index: 0,
        error: 0.25,
      },
    ];

    const result =
      normalizeFolds({
        folds,
      });

    assert.deepEqual(
      result,
      folds,
    );

    assert.notStrictEqual(
      result,
      folds,
    );

    assert.notStrictEqual(
      result[0],
      folds[0],
    );
  },
);

test(
  "normalizeFolds returns empty array when folds are absent",
  () => {
    assert.deepEqual(
      normalizeFolds({
        success: true,
      }),
      [],
    );
  },
);

test(
  "normalizeFolds normalizes invalid fold entries",
  () => {
    assert.deepEqual(
      normalizeFolds({
        folds: [
          null,
        ],
      }),
      [
        {
          success: false,
          error: "Validation fold is invalid.",
        },
      ],
    );
  },
);

/* ============================================================
   METHOD RESULT
   ============================================================ */

test(
  "normalizeMethodResult normalizes a complete method result",
  () => {
    const result =
      normalizeMethodResult(
        "idw",
        buildCompleteResult("idw"),
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.method,
      "idw",
    );

    assert.equal(
      result.status,
      "complete",
    );

    assert.equal(
      result.applicable,
      true,
    );

    assert.equal(
      result.sampleCount,
      5,
    );

    assert.equal(
      result.successfulFolds,
      5,
    );

    assert.equal(
      result.failedFolds,
      0,
    );

    assert.deepEqual(
      result.metrics,
      {
        meanError: 0.1,
        meanAbsoluteError: 0.2,
        rmse: 0.3,
        maxAbsoluteError: 0.5,
      },
    );

    assert.equal(
      result.folds.length,
      1,
    );

    assert.deepEqual(
      result.errors,
      [],
    );
  },
);

test(
  "normalizeMethodResult normalizes not-applicable result",
  () => {
    const result =
      normalizeMethodResult(
        "spline",
        buildNotApplicableResult(
          "spline",
        ),
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.method,
      "spline",
    );

    assert.equal(
      result.status,
      "not_applicable",
    );

    assert.equal(
      result.applicable,
      false,
    );

    assert.equal(
      result.sampleCount,
      1,
    );

    assert.equal(
      result.metrics,
      null,
    );
  },
);

test(
  "normalizeMethodResult normalizes failed result",
  () => {
    const result =
      normalizeMethodResult(
        "kriging",
        buildFailedResult("kriging"),
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.method,
      "kriging",
    );

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.applicable,
      true,
    );

    assert.deepEqual(
      result.errors,
      [
        "Technical validation failure.",
      ],
    );
  },
);

test(
  "normalizeMethodResult handles missing result",
  () => {
    const result =
      normalizeMethodResult(
        "idw",
        null,
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.method,
      "idw",
    );

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.applicable,
      false,
    );

    assert.equal(
      result.sampleCount,
      null,
    );

    assert.deepEqual(
      result.folds,
      [],
    );

    assert.deepEqual(
      result.errors,
      [
        "Method-specific validation result is unavailable.",
      ],
    );
  },
);

test(
  "normalizeMethodResult rejects unsupported method",
  () => {
    const result =
      normalizeMethodResult(
        "unknown",
        buildCompleteResult(
          "unknown",
        ),
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.method,
      null,
    );

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.applicable,
      false,
    );
  },
);

/* ============================================================
   RAW RESULT OPTION
   ============================================================ */

test(
  "normalizeMethodResult can preserve raw result when requested",
  () => {
    const source =
      buildCompleteResult("idw");

    const result =
      normalizeMethodResult(
        "idw",
        source,
        {
          includeRawResult: true,
        },
      );

    assert.strictEqual(
      result.rawResult,
      source,
    );
  },
);

test(
  "normalizeMethodResult omits raw result by default",
  () => {
    const result =
      normalizeMethodResult(
        "idw",
        buildCompleteResult("idw"),
      );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "rawResult",
      ),
      false,
    );
  },
);

/* ============================================================
   METHOD RESULTS
   ============================================================ */

test(
  "validateMethodResults accepts object",
  () => {
    const result =
      validateMethodResults({
        idw: {},
      });

    assert.equal(
      result.valid,
      true,
    );

    assert.deepEqual(
      result.errors,
      [],
    );
  },
);

test(
  "validateMethodResults rejects null",
  () => {
    const result =
      validateMethodResults(null);

    assert.equal(
      result.valid,
      false,
    );

    assert.equal(
      result.errors.length,
      1,
    );
  },
);

test(
  "validateMethodResults rejects arrays",
  () => {
    const result =
      validateMethodResults([]);

    assert.equal(
      result.valid,
      false,
    );
  },
);

test(
  "normalizeMethodResults creates all four method entries",
  () => {
    const result =
      normalizeMethodResults(
        buildAllCompleteResults(),
      );

    assert.deepEqual(
      Object.keys(result),
      [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ],
    );

    assert.equal(
      result.idw.method,
      "idw",
    );

    assert.equal(
      result.kriging.method,
      "kriging",
    );

    assert.equal(
      result.spline.method,
      "spline",
    );

    assert.equal(
      result.nearest_neighbour.method,
      "nearest_neighbour",
    );
  },
);

test(
  "normalizeMethodResults preserves missing method as failed",
  () => {
    const result =
      normalizeMethodResults({
        idw: buildCompleteResult("idw"),
      });

    assert.equal(
      result.idw.status,
      "complete",
    );

    assert.equal(
      result.kriging.status,
      "failed",
    );

    assert.equal(
      result.spline.status,
      "failed",
    );

    assert.equal(
      result.nearest_neighbour.status,
      "failed",
    );
  },
);

/* ============================================================
   SUMMARY
   ============================================================ */

test(
  "calculateComparativeSummary counts complete methods",
  () => {
    const methods =
      normalizeMethodResults(
        buildAllCompleteResults(),
      );

    const summary =
      calculateComparativeSummary(
        methods,
      );

    assert.deepEqual(
      summary,
      {
        methodCount: 4,
        applicableMethodCount: 4,
        completeMethodCount: 4,
        failedMethodCount: 0,
        notApplicableMethodCount: 0,
      },
    );
  },
);

test(
  "calculateComparativeSummary counts not-applicable methods",
  () => {
    const methods =
      normalizeMethodResults({
        idw: buildCompleteResult("idw"),
        kriging:
          buildNotApplicableResult(
            "kriging",
          ),
        spline:
          buildNotApplicableResult(
            "spline",
          ),
        nearest_neighbour:
          buildCompleteResult(
            "nearest_neighbour",
          ),
      });

    const summary =
      calculateComparativeSummary(
        methods,
      );

    assert.deepEqual(
      summary,
      {
        methodCount: 4,
        applicableMethodCount: 2,
        completeMethodCount: 2,
        failedMethodCount: 0,
        notApplicableMethodCount: 2,
      },
    );
  },
);

test(
  "calculateComparativeSummary counts technical failures",
  () => {
    const methods =
      normalizeMethodResults({
        idw: buildCompleteResult("idw"),
        kriging:
          buildFailedResult(
            "kriging",
          ),
        spline:
          buildCompleteResult("spline"),
        nearest_neighbour:
          buildFailedResult(
            "nearest_neighbour",
          ),
      });

    const summary =
      calculateComparativeSummary(
        methods,
      );

    assert.deepEqual(
      summary,
      {
        methodCount: 4,
        applicableMethodCount: 4,
        completeMethodCount: 2,
        failedMethodCount: 2,
        notApplicableMethodCount: 0,
      },
    );
  },
);

/* ============================================================
   MAIN COMPARATIVE VALIDATION
   ============================================================ */

test(
  "performComparativeValidation returns complete result for four complete methods",
  () => {
    const result =
      performComparativeValidation(
        buildAllCompleteResults(),
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.status,
      "complete",
    );

    assert.equal(
      result.validationType,
      "comparative_interpolation_validation",
    );

    assert.equal(
      result.sampleCount,
      5,
    );

    assert.equal(
      Object.keys(result.methods).length,
      4,
    );

    assert.deepEqual(
      result.errors,
      [],
    );
  },
);

test(
  "performComparativeValidation preserves all method metrics",
  () => {
    const result =
      performComparativeValidation(
        buildAllCompleteResults(),
      );

    for (const method of [
      "idw",
      "kriging",
      "spline",
      "nearest_neighbour",
    ]) {
      assert.deepEqual(
        result.methods[method].metrics,
        {
          meanError: 0.1,
          meanAbsoluteError: 0.2,
          rmse: 0.3,
          maxAbsoluteError: 0.5,
        },
      );
    }
  },
);

test(
  "performComparativeValidation reports not-applicable methods without treating them as failures",
  () => {
    const result =
      performComparativeValidation({
        idw: buildCompleteResult("idw"),
        kriging:
          buildNotApplicableResult(
            "kriging",
          ),
        spline:
          buildNotApplicableResult(
            "spline",
          ),
        nearest_neighbour:
          buildCompleteResult(
            "nearest_neighbour",
          ),
      });

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.status,
      "complete",
    );

    assert.equal(
      result.summary.notApplicableMethodCount,
      2,
    );

    assert.equal(
      result.summary.failedMethodCount,
      0,
    );
  },
);

test(
  "performComparativeValidation reports technical failures",
  () => {
    const result =
      performComparativeValidation({
        idw: buildCompleteResult("idw"),
        kriging:
          buildFailedResult(
            "kriging",
          ),
        spline:
          buildCompleteResult("spline"),
        nearest_neighbour:
          buildCompleteResult(
            "nearest_neighbour",
          ),
      });

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.status,
      "completed_with_failures",
    );

    assert.equal(
      result.summary.failedMethodCount,
      1,
    );

    assert.deepEqual(
      result.errors,
      [
        "Technical validation failure.",
      ],
    );
  },
);

test(
  "performComparativeValidation rejects invalid top-level input",
  () => {
    const result =
      performComparativeValidation(
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

    assert.equal(
      result.sampleCount,
      null,
    );

    assert.equal(
      result.validationType,
      "comparative_interpolation_validation",
    );

    assert.equal(
      result.errors.length,
      1,
    );
  },
);

/* ============================================================
   ALIAS
   ============================================================ */

test(
  "comparativeInterpolationValidation is equivalent to main API",
  () => {
    const input =
      buildAllCompleteResults();

    const primary =
      performComparativeValidation(
        input,
      );

    const alias =
      comparativeInterpolationValidation(
        input,
      );

    assert.deepEqual(
      alias,
      primary,
    );
  },
);

/* ============================================================
   IMMUTABILITY
   ============================================================ */

test(
  "performComparativeValidation does not mutate input results",
  () => {
    const input =
      buildAllCompleteResults();

    const before =
      JSON.parse(
        JSON.stringify(input),
      );

    performComparativeValidation(
      input,
    );

    assert.deepEqual(
      input,
      before,
    );
  },
);

test(
  "normalizeMethodResults does not mutate input results",
  () => {
    const input =
      buildAllCompleteResults();

    const before =
      JSON.parse(
        JSON.stringify(input),
      );

    normalizeMethodResults(
      input,
    );

    assert.deepEqual(
      input,
      before,
    );
  },
);

/* ============================================================
   KRIGING CONTRACT NORMALIZATION
   ============================================================ */

test(
  "normalizes Kriging validation counts into common fold counts",
  () => {
    const result =
      service.normalizeMethodResult(
        "kriging",
        {
          success: true,
          method: "ordinary_kriging",
          validationMethod:
            "leave_one_out",
          sampleCount: 4,
          successfulValidationCount: 3,
          failedValidationCount: 1,
          predictions: [
            {
              index: 0,
              success: true,
              predictedValue: 12,
            },
            {
              index: 1,
              success: true,
              predictedValue: 22,
            },
            {
              index: 2,
              success: true,
              predictedValue: 32,
            },
            {
              index: 3,
              success: false,
              predictedValue: null,
            },
          ],
          metrics: {
            meanError: 1,
            meanAbsoluteError: 2,
            rootMeanSquareError: 3,
          },
          parameters: {
            model: "spherical",
          },
        },
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.method,
      "kriging",
    );

    assert.equal(
      result.diagnosticType,
      "loocv",
    );

    assert.equal(
      result.sampleCount,
      4,
    );

    assert.equal(
      result.successfulFolds,
      3,
    );

    assert.equal(
      result.failedFolds,
      1,
    );

    assert.equal(
      result.folds.length,
      4,
    );
  },
);

test(
  "normalizes Kriging rootMeanSquareError to rmse",
  () => {
    const result =
      service.normalizeMethodResult(
        "kriging",
        {
          success: true,
          sampleCount: 4,
          successfulValidationCount: 4,
          failedValidationCount: 0,
          predictions: [],
          metrics: {
            meanError: 1.5,
            meanAbsoluteError: 2.5,
            rootMeanSquareError: 3.5,
          },
        },
      );

    assert.deepEqual(
      result.metrics,
      {
        meanError: 1.5,
        meanAbsoluteError: 2.5,
        rmse: 3.5,
        maxAbsoluteError: null,
      },
    );
  },
);

test(
  "normalizes Kriging predictions into common folds",
  () => {
    const predictions = [
      {
        index: 0,
        success: true,
        predictedValue: 10,
      },
      {
        index: 1,
        success: false,
        predictedValue: null,
      },
    ];

    const result =
      service.normalizeMethodResult(
        "kriging",
        {
          success: true,
          sampleCount: 2,
          successfulValidationCount: 1,
          failedValidationCount: 1,
          predictions,
          metrics: {
            meanError: 0,
            meanAbsoluteError: 0,
            rootMeanSquareError: 0,
          },
        },
      );

    assert.deepEqual(
      result.folds,
      predictions,
    );
  },
);

/* ============================================================
   COMMON DIAGNOSTIC CONTRACT
   ============================================================ */

test(
  "all normalized interpolation methods identify LOOCV diagnostics",
  () => {
    const methodFixtures = {
      idw: {
        success: true,
        sampleCount: 4,
        successfulFolds: 4,
        failedFolds: 0,
        folds: [],
        metrics: {
          meanError: 0,
          meanAbsoluteError: 1,
          rmse: 1,
          maxAbsoluteError: 2,
        },
      },

      kriging: {
        success: true,
        sampleCount: 4,
        successfulValidationCount: 4,
        failedValidationCount: 0,
        predictions: [],
        metrics: {
          meanError: 0,
          meanAbsoluteError: 1,
          rootMeanSquareError: 1,
        },
      },

      spline: {
        success: true,
        sampleCount: 4,
        successfulFolds: 4,
        failedFolds: 0,
        folds: [],
        metrics: {
          meanError: 0,
          meanAbsoluteError: 1,
          rmse: 1,
          maxAbsoluteError: 2,
        },
      },

      nearest_neighbour: {
        success: true,
        sampleCount: 4,
        successfulFolds: 4,
        failedFolds: 0,
        folds: [],
        metrics: {
          meanError: 0,
          meanAbsoluteError: 1,
          rmse: 1,
          maxAbsoluteError: 2,
        },
      },
    };

    Object.entries(
      methodFixtures,
    ).forEach(
      ([method, fixture]) => {
        const result =
          service.normalizeMethodResult(
            method,
            fixture,
          );

        assert.equal(
          result.diagnosticType,
          "loocv",
        );
      },
    );
  },
);