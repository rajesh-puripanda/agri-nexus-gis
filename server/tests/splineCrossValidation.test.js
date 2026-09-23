"use strict";

// ============================================================
// server/tests/splineCrossValidation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.6.5  Thin-Plate Spline Cross-Validation
//
// Tests:
//   1. LOOCV input validation
//   2. Training-set construction
//   3. Sample identification
//   4. Individual fold evaluation
//   5. Cross-validation metrics
//   6. Complete LOOCV execution
//   7. Failure diagnostics
//   8. Input immutability
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MIN_LOOCV_SAMPLE_COUNT,
  validateLOOCVSamples,
  buildTrainingSamples,
  getSampleIdentifier,
  evaluateLOOCVFold,
  calculateCrossValidationMetrics,
  performLeaveOneOutCrossValidation,
  splineCrossValidation,
} = require("../services/interpolation/splineCrossValidationService");

// ------------------------------------------------------------
// Test data
// ------------------------------------------------------------

function buildSamples() {
  return [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 0.35,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3100,
      value: 0.42,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.7200,
      longitude: 83.3000,
      value: 0.51,
    },
    {
      id: 4,
      sample_code: "S-004",
      latitude: 17.7100,
      longitude: 83.3200,
      value: 0.47,
    },
    {
      id: 5,
      sample_code: "S-005",
      latitude: 17.7300,
      longitude: 83.3150,
      value: 0.58,
    },
  ];
}

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------

test("LOOCV minimum sample count is four", () => {
  assert.equal(
    MIN_LOOCV_SAMPLE_COUNT,
    4,
  );
});

test("valid LOOCV samples are accepted", () => {
  const result =
    validateLOOCVSamples(
      buildSamples(),
    );

  assert.equal(
    result.valid,
    true,
  );

  assert.deepEqual(
    result.errors,
    [],
  );
});

test("non-array LOOCV input is rejected", () => {
  const result =
    validateLOOCVSamples(null);

  assert.equal(
    result.valid,
    false,
  );

  assert.match(
    result.errors[0],
    /must be an array/i,
  );
});

test("fewer than four samples are rejected", () => {
  const result =
    validateLOOCVSamples(
      buildSamples().slice(0, 3),
    );

  assert.equal(
    result.valid,
    false,
  );

  assert.ok(
    result.errors.some(
      (error) =>
        /at least 4 samples/i.test(
          error,
        ),
    ),
  );
});

test("invalid coordinates are rejected", () => {
  const samples = buildSamples();

  samples[0].latitude = NaN;

  const result =
    validateLOOCVSamples(
      samples,
    );

  assert.equal(
    result.valid,
    false,
  );

  assert.ok(
    result.errors.some(
      (error) =>
        /finite latitude and longitude/i.test(
          error,
        ),
    ),
  );
});

test("invalid sample values are rejected", () => {
  const samples = buildSamples();

  samples[0].value = Infinity;

  const result =
    validateLOOCVSamples(
      samples,
    );

  assert.equal(
    result.valid,
    false,
  );

  assert.ok(
    result.errors.some(
      (error) =>
        /finite numeric value/i.test(
          error,
        ),
    ),
  );
});

// ------------------------------------------------------------
// Training-set construction
// ------------------------------------------------------------

test("training set excludes the omitted sample", () => {
  const samples =
    buildSamples();

  const training =
    buildTrainingSamples(
      samples,
      2,
    );

  assert.equal(
    training.length,
    samples.length - 1,
  );

  assert.deepEqual(
    training.map(
      (sample) =>
        sample.sample_code,
    ),
    [
      "S-001",
      "S-002",
      "S-004",
      "S-005",
    ],
  );
});

test("invalid omitted index returns null", () => {
  const samples =
    buildSamples();

  assert.equal(
    buildTrainingSamples(
      samples,
      -1,
    ),
    null,
  );

  assert.equal(
    buildTrainingSamples(
      samples,
      samples.length,
    ),
    null,
  );

  assert.equal(
    buildTrainingSamples(
      samples,
      1.5,
    ),
    null,
  );
});

// ------------------------------------------------------------
// Sample identifiers
// ------------------------------------------------------------

test("sample_code is preferred as sample identifier", () => {
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
});

test("id is used when sample_code is unavailable", () => {
  assert.equal(
    getSampleIdentifier(
      {
        id: 100,
      },
      2,
    ),
    100,
  );
});

test("index is used when sample_code and id are unavailable", () => {
  assert.equal(
    getSampleIdentifier(
      {},
      3,
    ),
    3,
  );
});

// ------------------------------------------------------------
// Metrics
// ------------------------------------------------------------

test("cross-validation metrics calculate correctly", () => {
  const folds = [
    {
      success: true,
      error: 1,
      absoluteError: 1,
      squaredError: 1,
    },
    {
      success: true,
      error: -2,
      absoluteError: 2,
      squaredError: 4,
    },
    {
      success: true,
      error: 3,
      absoluteError: 3,
      squaredError: 9,
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
    3,
  );

  assert.equal(
    result.failedFolds,
    0,
  );

  assert.equal(
    result.meanError,
    2 / 3,
  );

  assert.equal(
    result.meanAbsoluteError,
    2,
  );

  assert.equal(
    result.rmse,
    Math.sqrt(14 / 3),
  );

  assert.equal(
    result.maxAbsoluteError,
    3,
  );
});

test("failed folds are excluded from metric calculation", () => {
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
});

test("no successful folds produce invalid metrics", () => {
  const result =
    calculateCrossValidationMetrics([
      {
        success: false,
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
    result.rmse,
    null,
  );
});

test("non-array folds are rejected", () => {
  const result =
    calculateCrossValidationMetrics(
      null,
    );

  assert.equal(
    result.valid,
    false,
  );

  assert.match(
    result.error,
    /must be an array/i,
  );
});

// ------------------------------------------------------------
// Individual LOOCV fold
// ------------------------------------------------------------

test("LOOCV fold produces a structured result", () => {
  const samples =
    buildSamples();

  const result =
    evaluateLOOCVFold(
      samples,
      0,
    );

  assert.equal(
    result.index,
    0,
  );

  assert.equal(
    result.sampleCode,
    "S-001",
  );

  assert.equal(
    result.observed,
    0.35,
  );

  if (result.success) {
    assert.equal(
      Number.isFinite(
        result.predicted,
      ),
      true,
    );

    assert.equal(
      Number.isFinite(
        result.error,
      ),
      true,
    );

    assert.equal(
      Number.isFinite(
        result.absoluteError,
      ),
      true,
    );

    assert.equal(
      Number.isFinite(
        result.squaredError,
      ),
      true,
    );
  } else {
    assert.ok(
      result.errorType,
    );
  }
});

test("invalid omitted sample produces structured failure", () => {
  const result =
    evaluateLOOCVFold(
      buildSamples(),
      99,
    );

  assert.equal(
    result.success,
    false,
  );

  assert.equal(
    result.errorType,
    "invalid_omitted_sample",
  );
});

// ------------------------------------------------------------
// Complete LOOCV
// ------------------------------------------------------------

test("complete LOOCV returns one fold per sample", () => {
  const samples =
    buildSamples();

  const result =
    performLeaveOneOutCrossValidation(
      samples,
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.method,
    "thin_plate_spline_loocv",
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
    result.successfulFolds +
      result.failedFolds,
    samples.length,
  );

  assert.ok(
    result.metrics,
  );
});

test("complete LOOCV exposes per-fold diagnostics", () => {
  const result =
    splineCrossValidation(
      buildSamples(),
    );

  assert.equal(
    result.success,
    true,
  );

  result.folds.forEach(
    (fold, index) => {
      assert.equal(
        fold.index,
        index,
      );

      assert.ok(
        fold.sampleCode,
      );

      assert.equal(
        fold.observed !== null,
        true,
      );
    },
  );
});

test("invalid complete LOOCV input returns technical failure", () => {
  const result =
    performLeaveOneOutCrossValidation(
      buildSamples().slice(0, 3),
    );

  assert.equal(
    result.success,
    false,
  );

  assert.equal(
    result.error,
    "Invalid LOOCV samples.",
  );

  assert.equal(
    result.folds.length,
    0,
  );

  assert.equal(
    result.metrics,
    null,
  );
});

// ------------------------------------------------------------
// Input immutability
// ------------------------------------------------------------

test("LOOCV does not mutate input samples", () => {
  const samples =
    buildSamples();

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
});
