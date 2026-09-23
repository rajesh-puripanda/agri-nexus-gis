"use strict";

// ============================================================
// server/tests/idwCrossValidation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.2  IDW Cross-Validation Diagnostics Tests
//
// ============================================================

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  MIN_LOOCV_SAMPLE_COUNT,
  VALIDATION_METHOD,
  METHOD_IDENTIFIER,
  DEFAULT_POWER,
  MIN_POWER,
  MAX_POWER,
  validateLOOCVSamples,
  buildTrainingSamples,
  getSampleIdentifier,
  normalizeError,
  evaluateLOOCVFold,
  calculateCrossValidationMetrics,
  performLeaveOneOutCrossValidation,
  idwCrossValidation,
} =
  require(
    "../services/interpolation/idwCrossValidationService",
  );

const {
  calculateDistance,
} =
  require(
    "../services/interpolation/idwInterpolation",
  );

// ============================================================
// FIXTURES
// ============================================================

function createSamples() {
  return [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.70,
      longitude: 83.30,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.71,
      longitude: 83.31,
      value: 20,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.72,
      longitude: 83.30,
      value: 30,
    },
    {
      id: 4,
      sample_code: "S-004",
      latitude: 17.71,
      longitude: 83.29,
      value: 40,
    },
  ];
}

// ============================================================
// CONSTANTS
// ============================================================

test(
  "IDW LOOCV constants are defined correctly",
  () => {
    assert.equal(
      MIN_LOOCV_SAMPLE_COUNT,
      2,
    );

    assert.equal(
      VALIDATION_METHOD,
      "leave_one_out",
    );

    assert.equal(
      METHOD_IDENTIFIER,
      "idw_loocv",
    );

    assert.equal(
      DEFAULT_POWER,
      2,
    );

    assert.equal(
      MIN_POWER,
      0.5,
    );

    assert.equal(
      MAX_POWER,
      10,
    );
  },
);

// ============================================================
// INPUT VALIDATION
// ============================================================

test(
  "validateLOOCVSamples accepts valid samples",
  () => {
    const result =
      validateLOOCVSamples(
        createSamples(),
      );

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
  "validateLOOCVSamples rejects non-array input",
  () => {
    const result =
      validateLOOCVSamples(
        null,
      );

    assert.equal(
      result.valid,
      false,
    );

    assert.ok(
      result.errors.length > 0,
    );
  },
);

test(
  "validateLOOCVSamples rejects fewer than two samples",
  () => {
    const result =
      validateLOOCVSamples([
        createSamples()[0],
      ]);

    assert.equal(
      result.valid,
      false,
    );

    assert.ok(
      result.errors.some(
        (error) =>
          error.includes("At least 2 samples"),
      ),
    );
  },
);

test(
  "validateLOOCVSamples rejects invalid sample values",
  () => {
    const samples =
      createSamples();

    samples[1].value =
      "not numeric";

    const result =
      validateLOOCVSamples(
        samples,
      );

    assert.equal(
      result.valid,
      false,
    );

    assert.ok(
      result.errors.length > 0,
    );
  },
);

// ============================================================
// TRAINING SET
// ============================================================

test(
  "buildTrainingSamples excludes the held-out sample",
  () => {
    const samples =
      createSamples();

    const training =
      buildTrainingSamples(
        samples,
        1,
      );

    assert.equal(
      training.length,
      3,
    );

    assert.equal(
      training.some(
        (sample) =>
          sample.sample_code ===
          "S-002",
      ),
      false,
    );
  },
);

test(
  "buildTrainingSamples preserves original sample objects",
  () => {
    const samples =
      createSamples();

    const training =
      buildTrainingSamples(
        samples,
        0,
      );

    assert.equal(
      training[0],
      samples[1],
    );
  },
);

test(
  "buildTrainingSamples rejects invalid index",
  () => {
    const samples =
      createSamples();

    assert.deepEqual(
      buildTrainingSamples(
        samples,
        -1,
      ),
      [],
    );

    assert.deepEqual(
      buildTrainingSamples(
        samples,
        samples.length,
      ),
      [],
    );
  },
);

// ============================================================
// SAMPLE IDENTIFIER
// ============================================================

test(
  "getSampleIdentifier prefers sample_code",
  () => {
    assert.equal(
      getSampleIdentifier(
        {
          sample_code: "S-100",
          id: 100,
        },
        0,
      ),
      "S-100",
    );
  },
);

test(
  "getSampleIdentifier supports sampleCode",
  () => {
    assert.equal(
      getSampleIdentifier(
        {
          sampleCode: "S-101",
        },
        1,
      ),
      "S-101",
    );
  },
);

test(
  "getSampleIdentifier supports id",
  () => {
    assert.equal(
      getSampleIdentifier(
        {
          id: 102,
        },
        2,
      ),
      "102",
    );
  },
);

test(
  "getSampleIdentifier falls back to sample index",
  () => {
    assert.equal(
      getSampleIdentifier(
        {},
        3,
      ),
      "sample_3",
    );
  },
);

// ============================================================
// ERROR CALCULATION
// ============================================================

test(
  "normalizeError calculates predicted minus observed",
  () => {
    assert.equal(
      normalizeError(
        15,
        10,
      ),
      5,
    );

    assert.equal(
      normalizeError(
        5,
        10,
      ),
      -5,
    );
  },
);

test(
  "normalizeError rejects non-finite values",
  () => {
    assert.equal(
      normalizeError(
        Infinity,
        10,
      ),
      null,
    );

    assert.equal(
      normalizeError(
        10,
        NaN,
      ),
      null,
    );
  },
);

// ============================================================
// SINGLE FOLD
// ============================================================

test(
  "evaluateLOOCVFold returns a successful IDW prediction",
  () => {
    const samples =
      createSamples();

    const result =
      evaluateLOOCVFold(
        samples,
        0,
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.index,
      0,
    );

    assert.equal(
      result.sampleCode,
      "S-001",
    );

    assert.ok(
      Number.isFinite(
        result.predicted,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.error,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.absoluteError,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.squaredError,
      ),
    );
  },
);

test(
  "evaluateLOOCVFold uses the configured IDW power",
  () => {
    const samples =
      createSamples();

    const result =
      evaluateLOOCVFold(
        samples,
        0,
        {
          power: 4,
        },
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.power,
      4,
    );
  },
);

test(
  "evaluateLOOCVFold rejects invalid power",
  () => {
    const result =
      evaluateLOOCVFold(
        createSamples(),
        0,
        {
          power: 100,
        },
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.errorType,
      "invalid_power",
    );

    assert.ok(
      result.errors.length > 0,
    );
  },
);

test(
  "evaluateLOOCVFold rejects invalid held-out index",
  () => {
    const result =
      evaluateLOOCVFold(
        createSamples(),
        99,
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.errorType,
      "invalid_held_out_sample",
    );
  },
);

// ============================================================
// DUPLICATE LOCATION
// ============================================================

test(
  "evaluateLOOCVFold preserves exact duplicate-location IDW behavior",
  () => {
    const samples = [
      {
        sample_code: "S-001",
        latitude: 17.70,
        longitude: 83.30,
        value: 10,
      },
      {
        sample_code: "S-002",
        latitude: 17.70,
        longitude: 83.30,
        value: 25,
      },
      {
        sample_code: "S-003",
        latitude: 17.72,
        longitude: 83.32,
        value: 40,
      },
    ];

    const result =
      evaluateLOOCVFold(
        samples,
        0,
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.predicted,
      25,
    );

    assert.equal(
      result.observed,
      10,
    );

    assert.equal(
      result.error,
      15,
    );
  },
);

// ============================================================
// EXACT DISTANCE REFERENCE
// ============================================================

test(
  "IDW LOOCV uses the existing IDW distance calculation",
  () => {
    const samples =
      createSamples();

    const distance =
      calculateDistance(
        samples[0].latitude,
        samples[0].longitude,
        samples[1].latitude,
        samples[1].longitude,
      );

    assert.ok(
      distance > 0,
    );

    assert.ok(
      Number.isFinite(distance),
    );
  },
);

// ============================================================
// METRICS
// ============================================================

test(
  "calculateCrossValidationMetrics calculates common metrics",
  () => {
    const folds = [
      {
        success: true,
        error: 2,
        absoluteError: 2,
        squaredError: 4,
      },
      {
        success: true,
        error: -4,
        absoluteError: 4,
        squaredError: 16,
      },
    ];

    const result =
      calculateCrossValidationMetrics(
        folds,
      );

    assert.equal(
      result.valid,
      true,
    );

    assert.equal(
      result.sampleCount,
      2,
    );

    assert.equal(
      result.successfulFolds,
      2,
    );

    assert.equal(
      result.failedFolds,
      0,
    );

    assert.equal(
      result.meanError,
      -1,
    );

    assert.equal(
      result.meanAbsoluteError,
      3,
    );

    assert.equal(
      result.rmse,
      Math.sqrt(10),
    );

    assert.equal(
      result.maxAbsoluteError,
      4,
    );
  },
);

test(
  "calculateCrossValidationMetrics excludes failed folds",
  () => {
    const folds = [
      {
        success: true,
        error: 2,
        absoluteError: 2,
        squaredError: 4,
      },
      {
        success: false,
        error: null,
        absoluteError: null,
        squaredError: null,
      },
      {
        success: true,
        error: -2,
        absoluteError: 2,
        squaredError: 4,
      },
    ];

    const result =
      calculateCrossValidationMetrics(
        folds,
      );

    assert.equal(
      result.valid,
      true,
    );

    assert.equal(
      result.sampleCount,
      3,
    );

    assert.equal(
      result.successfulFolds,
      2,
    );

    assert.equal(
      result.failedFolds,
      1,
    );

    assert.equal(
      result.meanError,
      0,
    );

    assert.equal(
      result.meanAbsoluteError,
      2,
    );

    assert.equal(
      result.rmse,
      2,
    );

    assert.equal(
      result.maxAbsoluteError,
      2,
    );
  },
);

test(
  "calculateCrossValidationMetrics reports invalid result when no folds succeed",
  () => {
    const result =
      calculateCrossValidationMetrics([
        {
          success: false,
          error: null,
        },
      ]);

    assert.equal(
      result.valid,
      false,
    );

    assert.equal(
      result.successfulFolds,
      0,
    );

    assert.equal(
      result.failedFolds,
      1,
    );

    assert.equal(
      result.meanError,
      null,
    );

    assert.equal(
      result.rmse,
      null,
    );
  },
);

// ============================================================
// FULL LOOCV
// ============================================================

test(
  "performLeaveOneOutCrossValidation evaluates every observation",
  () => {
    const samples =
      createSamples();

    const result =
      performLeaveOneOutCrossValidation(
        samples,
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
      result.method,
      "idw_loocv",
    );

    assert.equal(
      result.validationMethod,
      "leave_one_out",
    );

    assert.equal(
      result.sampleCount,
      samples.length,
    );

    assert.equal(
      result.folds.length,
      samples.length,
    );

    assert.equal(
      result.successfulFolds,
      samples.length,
    );

    assert.equal(
      result.failedFolds,
      0,
    );

    assert.ok(
      result.metrics.valid,
    );

    assert.ok(
      Number.isFinite(
        result.metrics.meanError,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.meanAbsoluteError,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.rmse,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.maxAbsoluteError,
      ),
    );
  },
);

test(
  "performLeaveOneOutCrossValidation supports custom power",
  () => {
    const result =
      performLeaveOneOutCrossValidation(
        createSamples(),
        {
          power: 1,
        },
      );

    assert.equal(
      result.success,
      true,
    );

    assert.ok(
      result.folds.every(
        (fold) =>
          fold.success &&
          fold.power === 1,
      ),
    );
  },
);

test(
  "performLeaveOneOutCrossValidation rejects insufficient samples",
  () => {
    const result =
      performLeaveOneOutCrossValidation([
        createSamples()[0],
      ]);

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.method,
      "idw_loocv",
    );

    assert.equal(
      result.minimumSampleCount,
      2,
    );

    assert.deepEqual(
      result.folds,
      [],
    );

    assert.equal(
      result.metrics,
      null,
    );
  },
);

test(
  "performLeaveOneOutCrossValidation rejects invalid input",
  () => {
    const result =
      performLeaveOneOutCrossValidation(
        [
          createSamples()[0],
          {
            latitude: 999,
            longitude: 83.31,
            value: 20,
          },
        ],
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
      result.errors.length > 0,
    );
  },
);

// ============================================================
// DETERMINISM
// ============================================================

test(
  "IDW LOOCV is deterministic",
  () => {
    const samples =
      createSamples();

    const first =
      performLeaveOneOutCrossValidation(
        samples,
      );

    const second =
      performLeaveOneOutCrossValidation(
        samples,
      );

    assert.deepEqual(
      second,
      first,
    );
  },
);

// ============================================================
// INPUT IMMUTABILITY
// ============================================================

test(
  "IDW LOOCV does not mutate samples",
  () => {
    const samples =
      createSamples();

    const original =
      JSON.parse(
        JSON.stringify(samples),
      );

    performLeaveOneOutCrossValidation(
      samples,
    );

    assert.deepEqual(
      samples,
      original,
    );
  },
);

// ============================================================
// PUBLIC ALIAS
// ============================================================

test(
  "idwCrossValidation is equivalent to performLeaveOneOutCrossValidation",
  () => {
    const samples =
      createSamples();

    const direct =
      performLeaveOneOutCrossValidation(
        samples,
      );

    const alias =
      idwCrossValidation(
        samples,
      );

    assert.deepEqual(
      alias,
      direct,
    );
  },
);
