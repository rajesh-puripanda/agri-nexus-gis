"use strict";

// ============================================================
// server/tests/nearestNeighbourCrossValidation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.7.5.3  Nearest-Neighbour LOOCV Validation
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
  nearestNeighbourCrossValidation,
} = require("../services/interpolation/nearestNeighbourCrossValidationService");

// ------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------

function buildSamples() {
  return [
    {
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3100,
      value: 20,
    },
    {
      sample_code: "S-003",
      latitude: 17.7200,
      longitude: 83.3200,
      value: 30,
    },
    {
      sample_code: "S-004",
      latitude: 17.7300,
      longitude: 83.3300,
      value: 40,
    },
  ];
}

// ============================================================
// 1. Constants
// ============================================================

test("Minimum NN LOOCV sample count is 2", () => {
  assert.equal(
    MIN_LOOCV_SAMPLE_COUNT,
    2,
  );
});

// ============================================================
// 2. Validation
// ============================================================

test("Valid NN LOOCV samples are accepted", () => {
  const result =
    validateLOOCVSamples(
      buildSamples(),
    );

  assert.equal(result.valid, true);
  assert.deepEqual(
    result.errors,
    [],
  );
});

test("Less than two samples is rejected", () => {
  const result =
    validateLOOCVSamples([
      buildSamples()[0],
    ]);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.includes(
          "At least 2 samples",
        ),
    ),
  );
});

test("Non-array samples are rejected", () => {
  const result =
    validateLOOCVSamples(null);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "LOOCV samples must be an array.",
    ),
  );
});

test("Invalid coordinates are rejected", () => {
  const samples =
    buildSamples();

  samples[0].latitude =
    Number.NaN;

  const result =
    validateLOOCVSamples(
      samples,
    );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.includes(
          "finite latitude and longitude",
        ),
    ),
  );
});

test("Invalid observed values are rejected", () => {
  const samples =
    buildSamples();

  samples[0].value =
    Number.POSITIVE_INFINITY;

  const result =
    validateLOOCVSamples(
      samples,
    );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.includes(
          "finite numeric value",
        ),
    ),
  );
});

// ============================================================
// 3. Training-set construction
// ============================================================

test("Training samples exclude the held-out observation", () => {
  const samples =
    buildSamples();

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
});

test("Invalid omitted index returns null", () => {
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
      99,
    ),
    null,
  );
});

// ============================================================
// 4. Sample identifiers
// ============================================================

test("Sample code is preferred as identifier", () => {
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

test("ID is used when sample code is unavailable", () => {
  assert.equal(
    getSampleIdentifier(
      {
        id: 100,
      },
      0,
    ),
    100,
  );
});

test("Index is used when sample code and ID are unavailable", () => {
  assert.equal(
    getSampleIdentifier(
      {},
      7,
    ),
    7,
  );
});

// ============================================================
// 5. Fold evaluation
// ============================================================

test("LOOCV fold predicts using a remaining nearest sample", () => {
  const samples =
    buildSamples();

  const fold =
    evaluateLOOCVFold(
      samples,
      0,
    );

  assert.equal(
    fold.success,
    true,
  );

  assert.equal(
    fold.index,
    0,
  );

  assert.equal(
    fold.sampleCode,
    "S-001",
  );

  assert.equal(
    fold.observed,
    10,
  );

  assert.equal(
    fold.predicted,
    20,
  );

  assert.equal(
    fold.error,
    10,
  );

  assert.equal(
    fold.absoluteError,
    10,
  );

  assert.equal(
    fold.squaredError,
    100,
  );

  assert.equal(
    fold.nearestSample.index,
    0,
  );
});

test("Fold preserves nearest-sample diagnostics", () => {
  const fold =
    evaluateLOOCVFold(
      buildSamples(),
      1,
    );

  assert.equal(
    fold.success,
    true,
  );

  assert.ok(
    fold.nearestSample,
  );

  assert.equal(
    typeof fold.nearestSample.index,
    "number",
  );

  assert.equal(
    typeof fold.nearestSample.latitude,
    "number",
  );

  assert.equal(
    typeof fold.nearestSample.longitude,
    "number",
  );

  assert.equal(
    typeof fold.nearestSample.value,
    "number",
  );

  assert.ok(
    Number.isFinite(
      fold.nearestSample.distanceMetres,
    ),
  );
});

test("Fold error convention is predicted minus observed", () => {
  const samples = [
    {
      sample_code: "A",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 100,
    },
    {
      sample_code: "B",
      latitude: 17.7001,
      longitude: 83.3001,
      value: 70,
    },
  ];

  const fold =
    evaluateLOOCVFold(
      samples,
      0,
    );

  assert.equal(
    fold.predicted,
    70,
  );

  assert.equal(
    fold.observed,
    100,
  );

  assert.equal(
    fold.error,
    -30,
  );

  assert.equal(
    fold.absoluteError,
    30,
  );

  assert.equal(
    fold.squaredError,
    900,
  );
});

// ============================================================
// 6. Two-sample LOOCV
// ============================================================

test("Two samples are sufficient for complete LOOCV", () => {
  const samples = [
    {
      sample_code: "A",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      sample_code: "B",
      latitude: 17.7100,
      longitude: 83.3100,
      value: 20,
    },
  ];

  const result =
    performLeaveOneOutCrossValidation(
      samples,
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.sampleCount,
    2,
  );

  assert.equal(
    result.folds.length,
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
    result.metrics.valid,
    true,
  );
});

// ============================================================
// 7. Metrics
// ============================================================

test("LOOCV metrics are calculated correctly", () => {
  const folds = [
    {
      success: true,
      error: 10,
      absoluteError: 10,
      squaredError: 100,
    },
    {
      success: true,
      error: -20,
      absoluteError: 20,
      squaredError: 400,
    },
    {
      success: true,
      error: 30,
      absoluteError: 30,
      squaredError: 900,
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
    20 / 3,
  );

  assert.equal(
    result.meanAbsoluteError,
    20,
  );

  assert.equal(
    result.rmse,
    Math.sqrt(1400 / 3),
  );

  assert.equal(
    result.maxAbsoluteError,
    30,
  );
});

test("Failed folds are excluded from metric calculation", () => {
  const folds = [
    {
      success: true,
      error: 10,
      absoluteError: 10,
      squaredError: 100,
    },
    {
      success: false,
      error: null,
      absoluteError: null,
      squaredError: null,
    },
    {
      success: true,
      error: -20,
      absoluteError: 20,
      squaredError: 400,
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
    -5,
  );

  assert.equal(
    result.meanAbsoluteError,
    15,
  );

  assert.equal(
    result.rmse,
    Math.sqrt(250),
  );

  assert.equal(
    result.maxAbsoluteError,
    20,
  );
});

test("No successful folds produce invalid metrics", () => {
  const result =
    calculateCrossValidationMetrics([
      {
        success: false,
        error: null,
        absoluteError: null,
        squaredError: null,
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

// ============================================================
// 8. Full LOOCV
// ============================================================

test("Full NN LOOCV returns all folds and metrics", () => {
  const result =
    performLeaveOneOutCrossValidation(
      buildSamples(),
    );

  assert.equal(
    result.success,
    true,
  );

  assert.equal(
    result.method,
    "nearest_neighbour_loocv",
  );

  assert.equal(
    result.sampleCount,
    4,
  );

  assert.equal(
    result.folds.length,
    4,
  );

  assert.equal(
    result.successfulFolds,
    4,
  );

  assert.equal(
    result.failedFolds,
    0,
  );

  assert.equal(
    result.metrics.valid,
    true,
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
});

// ============================================================
// 9. Exact nearest-neighbour behaviour
// ============================================================

test("LOOCV uses the geographically nearest remaining observation", () => {
  const samples = [
    {
      sample_code: "TARGET",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 100,
    },
    {
      sample_code: "NEAR",
      latitude: 17.7001,
      longitude: 83.3001,
      value: 25,
    },
    {
      sample_code: "FAR",
      latitude: 17.8000,
      longitude: 83.4000,
      value: 999,
    },
  ];

  const fold =
    evaluateLOOCVFold(
      samples,
      0,
    );

  assert.equal(
    fold.success,
    true,
  );

  assert.equal(
    fold.predicted,
    25,
  );

  assert.equal(
    fold.nearestSample.value,
    25,
  );
});

test("Exact zero-distance duplicate location is handled deterministically", () => {
  const samples = [
    {
      sample_code: "TARGET",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 100,
    },
    {
      sample_code: "DUPLICATE",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 50,
    },
    {
      sample_code: "FAR",
      latitude: 17.8000,
      longitude: 83.4000,
      value: 999,
    },
  ];

  const fold =
    evaluateLOOCVFold(
      samples,
      0,
    );

  assert.equal(
    fold.success,
    true,
  );

  assert.equal(
    fold.predicted,
    50,
  );

  assert.equal(
    fold.nearestSample.value,
    50,
  );

  assert.equal(
    fold.nearestSample.distanceMetres,
    0,
  );
});

// ============================================================
// 10. Invalid full LOOCV
// ============================================================

test("Invalid samples produce technical LOOCV failure", () => {
  const result =
    performLeaveOneOutCrossValidation([
      {
        latitude: 17.7,
        longitude: 83.3,
        value: 10,
      },
    ]);

  assert.equal(
    result.success,
    false,
  );

  assert.equal(
    result.folds.length,
    0,
  );

  assert.equal(
    result.metrics,
    null,
  );

  assert.ok(
    Array.isArray(
      result.errors,
    ),
  );
});

// ============================================================
// 11. Input immutability
// ============================================================

test("LOOCV does not mutate the input samples", () => {
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

// ============================================================
// 12. Public alias
// ============================================================

test("Public alias is equivalent to the main LOOCV function", () => {
  assert.equal(
    nearestNeighbourCrossValidation,
    performLeaveOneOutCrossValidation,
  );
});
