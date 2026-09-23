"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../services/interpolation/variogramValidationService");

const {
  VALIDATION_STATUS,
  DEFAULT_VALIDATION_OPTIONS,
  validateMinimumUsableLags,
  validatePairSupport,
  validateNonFlatVariogram,
  validateMonotonicVariogram,
  validateDuplicateDistances,
  validateStructuredVariance,
  validatePracticalRange,
  validateModelFit,
  validateParameters,
  buildValidationCriteria,
  summarizeCriteria,
  collectWarnings,
  collectErrors,
  validateVariogramEstimation,
  validateVariogramModel,
} = service;

const validParameters = {
  nugget: 0.2,
  sill: 0.8,
  range: 4000,
};

function makeDataQuality(overrides = {}) {
  return {
    usableLagCount: 5,
    totalPairCount: 50,
    invalidLagCount: 0,
    duplicateDistanceCount: 0,
    flatVariogram: false,
    nonMonotonicVariogram: false,
    ...overrides,
  };
}

function makeEstimation(overrides = {}) {
  const dataQuality = makeDataQuality(
    overrides.dataQuality,
  );

  const estimationQuality = {
    rangeFallbackUsed: false,
    earlyRangeDetection: false,
    sillNuggetSeparation: true,
    ...(overrides.estimationQuality ?? {}),
  };

  const parameters = {
    ...validParameters,
    structuredVariance: 0.6,
    ...(overrides.parameters ?? {}),
  };

  const fit = {
    success: true,
    weightedSSE: 1.5,
    weightedRMSE: 0.173,
    totalPairs: 50,
    ...(overrides.fit ?? {}),
  };

  return {
    model: overrides.model ?? "spherical",
    parameters,
    fit,
    diagnostics: {
      dataQuality,
      estimationQuality,
      ...(overrides.diagnostics ?? {}),
    },
  };
}

/* ============================================================
   EXPORT CONTRACT
   ============================================================ */

test("exports required validation API", () => {
  assert.equal(
    typeof validateVariogramEstimation,
    "function",
  );

  assert.equal(
    typeof validateVariogramModel,
    "function",
  );

  assert.equal(
    typeof buildValidationCriteria,
    "function",
  );

  assert.equal(
    typeof summarizeCriteria,
    "function",
  );

  assert.equal(
    VALIDATION_STATUS.PASSED,
    "passed",
  );

  assert.equal(
    VALIDATION_STATUS.WARNING,
    "warning",
  );

  assert.equal(
    VALIDATION_STATUS.FAILED,
    "failed",
  );
});

/* ============================================================
   DEFAULT OPTIONS
   ============================================================ */

test("default validation options are defined", () => {
  assert.equal(
    DEFAULT_VALIDATION_OPTIONS.minUsableLags,
    3,
  );

  assert.equal(
    DEFAULT_VALIDATION_OPTIONS.minTotalPairs,
    10,
  );
});

/* ============================================================
   MINIMUM USABLE LAGS
   ============================================================ */

test("minimum usable lag support passes at threshold", () => {
  const result =
    validateMinimumUsableLags({
      usableLagCount: 3,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, 3);
  assert.equal(result.required, 3);
});

test("minimum usable lag support fails below threshold", () => {
  const result =
    validateMinimumUsableLags({
      usableLagCount: 2,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );

  assert.equal(result.actual, 2);
  assert.equal(result.required, 3);
});

/* ============================================================
   PAIR SUPPORT
   ============================================================ */

test("pair support passes at threshold", () => {
  const result =
    validatePairSupport({
      totalPairCount: 10,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, 10);
  assert.equal(result.required, 10);
});

test("pair support fails below threshold", () => {
  const result =
    validatePairSupport({
      totalPairCount: 9,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );

  assert.equal(result.actual, 9);
});

/* ============================================================
   FLAT VARIOGRAM
   ============================================================ */

test("non-flat variogram passes", () => {
  const result =
    validateNonFlatVariogram({
      flatVariogram: false,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, false);
});

test("flat variogram produces warning", () => {
  const result =
    validateNonFlatVariogram({
      flatVariogram: true,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.WARNING,
  );

  assert.equal(result.actual, true);
});

/* ============================================================
   MONOTONICITY
   ============================================================ */

test("monotonic variogram passes", () => {
  const result =
    validateMonotonicVariogram({
      nonMonotonicVariogram: false,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );
});

test("non-monotonic variogram produces warning", () => {
  const result =
    validateMonotonicVariogram({
      nonMonotonicVariogram: true,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.WARNING,
  );
});

/* ============================================================
   DUPLICATE DISTANCES
   ============================================================ */

test("zero duplicate distances pass", () => {
  const result =
    validateDuplicateDistances({
      duplicateDistanceCount: 0,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, 0);
});

test("duplicate distances produce warning", () => {
  const result =
    validateDuplicateDistances({
      duplicateDistanceCount: 2,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.WARNING,
  );

  assert.equal(result.actual, 2);
});

/* ============================================================
   STRUCTURED VARIANCE
   ============================================================ */

test("positive structured variance passes", () => {
  const result =
    validateStructuredVariance({
      structuredVariance: 0.6,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, 0.6);
});

test("zero structured variance fails", () => {
  const result =
    validateStructuredVariance({
      structuredVariance: 0,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

test("negative structured variance fails", () => {
  const result =
    validateStructuredVariance({
      structuredVariance: -0.1,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

/* ============================================================
   PRACTICAL RANGE
   ============================================================ */

test("valid practical range passes", () => {
  const result =
    validatePracticalRange(
      { range: 4000 },
      {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
      },
    );

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.actual, 4000);
});

test("range fallback produces warning", () => {
  const result =
    validatePracticalRange(
      { range: 4000 },
      {
        rangeFallbackUsed: true,
        earlyRangeDetection: false,
      },
    );

  assert.equal(
    result.status,
    VALIDATION_STATUS.WARNING,
  );

  assert.equal(
    result.fallbackUsed,
    true,
  );
});

test("early range detection produces warning", () => {
  const result =
    validatePracticalRange(
      { range: 4000 },
      {
        rangeFallbackUsed: false,
        earlyRangeDetection: true,
      },
    );

  assert.equal(
    result.status,
    VALIDATION_STATUS.WARNING,
  );

  assert.equal(
    result.earlyDetection,
    true,
  );
});

test("invalid practical range fails", () => {
  const result =
    validatePracticalRange(
      { range: 0 },
      {},
    );

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

/* ============================================================
   MODEL FIT
   ============================================================ */

test("valid model-fit diagnostics pass", () => {
  const result =
    validateModelFit({
      success: true,
      weightedSSE: 2,
      weightedRMSE: 0.2,
      totalPairs: 50,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(
    result.weightedSSE,
    2,
  );

  assert.equal(
    result.weightedRMSE,
    0.2,
  );
});

test("unsuccessful model fit fails", () => {
  const result =
    validateModelFit({
      success: false,
      weightedSSE: 2,
      weightedRMSE: 0.2,
      totalPairs: 50,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

test("negative weighted SSE fails", () => {
  const result =
    validateModelFit({
      success: true,
      weightedSSE: -1,
      weightedRMSE: 0.2,
      totalPairs: 50,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

test("zero pair count fails model-fit validation", () => {
  const result =
    validateModelFit({
      success: true,
      weightedSSE: 1,
      weightedRMSE: 0.2,
      totalPairs: 0,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );
});

/* ============================================================
   PARAMETER VALIDATION
   ============================================================ */

test("valid variogram parameters pass", () => {
  const result =
    validateParameters(
      validParameters,
    );

  assert.equal(
    result.status,
    VALIDATION_STATUS.PASSED,
  );

  assert.equal(result.nugget, 0.2);
  assert.equal(result.sill, 0.8);
  assert.equal(result.range, 4000);
});

test("invalid variogram parameters fail", () => {
  const result =
    validateParameters({
      nugget: -1,
      sill: 0.5,
      range: 4000,
    });

  assert.equal(
    result.status,
    VALIDATION_STATUS.FAILED,
  );

  assert.ok(
    Array.isArray(result.errors),
  );
});

/* ============================================================
   COMPLETE CRITERIA
   ============================================================ */

test("all nine validation criteria are present", () => {
  const criteria =
    buildValidationCriteria(
      makeEstimation(),
    );

  assert.deepEqual(
    Object.keys(criteria),
    [
      "minimumUsableLags",
      "pairSupport",
      "nonFlatVariogram",
      "monotonicVariogram",
      "duplicateDistances",
      "structuredVariance",
      "practicalRange",
      "modelFit",
      "parameters",
    ],
  );
});

test("complete valid estimation passes all criteria", () => {
  const result =
    validateVariogramEstimation(
      makeEstimation(),
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.summary.passedCount,
    9,
  );

  assert.equal(
    result.summary.warningCount,
    0,
  );

  assert.equal(
    result.summary.failedCount,
    0,
  );

  assert.deepEqual(
    result.warnings,
    [],
  );

  assert.deepEqual(
    result.errors,
    [],
  );
});

/* ============================================================
   WARNING CONDITIONS
   ============================================================ */

test("warning conditions are reported without validation failure", () => {
  const result =
    validateVariogramEstimation(
      makeEstimation({
        dataQuality: {
          flatVariogram: true,
          nonMonotonicVariogram: true,
          duplicateDistanceCount: 2,
        },
        estimationQuality: {
          rangeFallbackUsed: true,
          earlyRangeDetection: true,
        },
      }),
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.summary.warningCount,
    4,
  );

  assert.equal(
    result.summary.failedCount,
    0,
  );

  assert.equal(
    result.warnings.length,
    4,
  );
});

/* ============================================================
   FAILED CRITERIA
   ============================================================ */

test("failed criteria are reported without changing success meaning", () => {
  const result =
    validateVariogramEstimation(
      makeEstimation({
        dataQuality: {
          usableLagCount: 2,
          totalPairCount: 5,
        },
        parameters: {
          structuredVariance: 0,
        },
        fit: {
          success: false,
        },
      }),
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.summary.failedCount,
    4,
  );

  assert.ok(
    result.errors.length >= 4,
  );
});

/* ============================================================
   INPUT VALIDATION
   ============================================================ */

test("missing estimation input returns unsuccessful validation operation", () => {
  const result =
    validateVariogramEstimation();

  assert.equal(
    result.success,
    false,
  );

  assert.equal(
    result.summary.failedCount,
    1,
  );

  assert.ok(
    result.errors.length > 0,
  );
});

test("null estimation input is rejected", () => {
  const result =
    validateVariogramEstimation(null);

  assert.equal(
    result.success,
    false,
  );
});

/* ============================================================
   ALIAS
   ============================================================ */

test("validateVariogramModel is an equivalent validation alias", () => {
  const estimation =
    makeEstimation();

  const direct =
    validateVariogramEstimation(
      estimation,
    );

  const alias =
    validateVariogramModel(
      estimation,
    );

  assert.deepEqual(
    alias,
    direct,
  );
});

/* ============================================================
   CUSTOM THRESHOLDS
   ============================================================ */

test("custom validation thresholds are respected", () => {
  const result =
    validateVariogramEstimation(
      makeEstimation({
        dataQuality: {
          usableLagCount: 5,
          totalPairCount: 50,
        },
      }),
      {
        minUsableLags: 6,
        minTotalPairs: 60,
      },
    );

  assert.equal(
    result.criteria.minimumUsableLags.status,
    VALIDATION_STATUS.FAILED,
  );

  assert.equal(
    result.criteria.pairSupport.status,
    VALIDATION_STATUS.FAILED,
  );
});

/* ============================================================
   SUMMARY
   ============================================================ */

test("summary counts criteria by status", () => {
  const summary =
    summarizeCriteria({
      one: {
        status: VALIDATION_STATUS.PASSED,
      },
      two: {
        status: VALIDATION_STATUS.PASSED,
      },
      three: {
        status: VALIDATION_STATUS.WARNING,
      },
      four: {
        status: VALIDATION_STATUS.FAILED,
      },
    });

  assert.deepEqual(
    summary,
    {
      passedCount: 2,
      warningCount: 1,
      failedCount: 1,
    },
  );
});

/* ============================================================
   WARNING COLLECTION
   ============================================================ */

test("warning collection supports string warnings", () => {
  const warnings =
    collectWarnings({
      one: {
        status: VALIDATION_STATUS.WARNING,
        warning: "Warning one",
      },
      two: {
        status: VALIDATION_STATUS.PASSED,
      },
    });

  assert.deepEqual(
    warnings,
    ["Warning one"],
  );
});

test("warning collection supports warning arrays", () => {
  const warnings =
    collectWarnings({
      one: {
        status: VALIDATION_STATUS.WARNING,
        warning: [
          "Warning one",
          "Warning two",
        ],
      },
    });

  assert.deepEqual(
    warnings,
    [
      "Warning one",
      "Warning two",
    ],
  );
});

/* ============================================================
   ERROR COLLECTION
   ============================================================ */

test("error collection supports string errors", () => {
  const errors =
    collectErrors({
      one: {
        status: VALIDATION_STATUS.FAILED,
        error: "Error one",
      },
    });

  assert.deepEqual(
    errors,
    ["Error one"],
  );
});

test("error collection supports error arrays", () => {
  const errors =
    collectErrors({
      one: {
        status: VALIDATION_STATUS.FAILED,
        errors: [
          "Error one",
          "Error two",
        ],
      },
    });

  assert.deepEqual(
    errors,
    [
      "Error one",
      "Error two",
    ],
  );
});

/* ============================================================
   DETERMINISM
   ============================================================ */

test("validation is deterministic", () => {
  const estimation =
    makeEstimation();

  const first =
    validateVariogramEstimation(
      estimation,
    );

  const second =
    validateVariogramEstimation(
      estimation,
    );

  assert.deepEqual(
    second,
    first,
  );
});

/* ============================================================
   INPUT IMMUTABILITY
   ============================================================ */

test("validation does not mutate estimation input", () => {
  const estimation =
    makeEstimation();

  const before =
    JSON.parse(
      JSON.stringify(estimation),
    );

  validateVariogramEstimation(
    estimation,
  );

  assert.deepEqual(
    estimation,
    before,
  );
});

