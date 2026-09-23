"use strict";

// ============================================================
// server/tests/idwInterpolation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// IDW Interpolation Engine Tests
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ZERO_DISTANCE_TOLERANCE,
  MIN_SAMPLE_COUNT,
  METHOD_IDENTIFIER,
  DEFAULT_POWER,
  MIN_POWER,
  MAX_POWER,
  isFiniteNumericValue,
  validateSample,
  validateSamples,
  validateTarget,
  calculateDistance,
  buildIDWDistances,
  validatePower,
  calculateIDWPrediction,
  validatePrediction,
  interpolateIDW,
  idwInterpolation,
} = require("../services/interpolation/idwInterpolation");

// ============================================================
// FIXTURES
// ============================================================

function buildSamples() {
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
      longitude: 83.32,
      value: 30,
    },
  ];
}

// ============================================================
// CONSTANTS
// ============================================================

test("IDW constants are defined correctly", () => {
  assert.equal(ZERO_DISTANCE_TOLERANCE, 1e-12);
  assert.equal(MIN_SAMPLE_COUNT, 1);
  assert.equal(METHOD_IDENTIFIER, "idw");
  assert.equal(DEFAULT_POWER, 2);
  assert.equal(MIN_POWER, 0.5);
  assert.equal(MAX_POWER, 10);
});

// ============================================================
// NUMERIC VALIDATION
// ============================================================

test("isFiniteNumericValue accepts finite numbers", () => {
  assert.equal(isFiniteNumericValue(0), true);
  assert.equal(isFiniteNumericValue(10.5), true);
  assert.equal(isFiniteNumericValue(-10.5), true);
});

test("isFiniteNumericValue rejects non-numbers", () => {
  assert.equal(isFiniteNumericValue("10"), false);
  assert.equal(isFiniteNumericValue(null), false);
  assert.equal(isFiniteNumericValue(undefined), false);
  assert.equal(isFiniteNumericValue(NaN), false);
  assert.equal(isFiniteNumericValue(Infinity), false);
});

// ============================================================
// SAMPLE VALIDATION
// ============================================================

test("validateSample accepts a valid sample", () => {
  const result = validateSample({
    latitude: 17.70,
    longitude: 83.30,
    value: 10,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateSample accepts numeric strings", () => {
  const result = validateSample({
    latitude: "17.70",
    longitude: "83.30",
    value: "10",
  });

  assert.equal(result.valid, true);
});

test("validateSample rejects missing sample", () => {
  const result = validateSample(null);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateSample rejects invalid latitude", () => {
  const result = validateSample({
    latitude: 91,
    longitude: 83.30,
    value: 10,
  });

  assert.equal(result.valid, false);
});

test("validateSample rejects invalid longitude", () => {
  const result = validateSample({
    latitude: 17.70,
    longitude: 181,
    value: 10,
  });

  assert.equal(result.valid, false);
});

test("validateSample rejects invalid value", () => {
  const result = validateSample({
    latitude: 17.70,
    longitude: 83.30,
    value: NaN,
  });

  assert.equal(result.valid, false);
});

// ============================================================
// SAMPLE COLLECTION VALIDATION
// ============================================================

test("validateSamples accepts valid samples", () => {
  const result = validateSamples(buildSamples());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateSamples rejects non-array input", () => {
  const result = validateSamples(null);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateSamples rejects an empty array", () => {
  const result = validateSamples([]);

  assert.equal(result.valid, false);
});

test("validateSamples identifies invalid samples", () => {
  const result = validateSamples([
    ...buildSamples(),
    {
      latitude: 999,
      longitude: 83,
      value: 10,
    },
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// ============================================================
// TARGET VALIDATION
// ============================================================

test("validateTarget accepts a valid target", () => {
  const result = validateTarget({
    latitude: 17.71,
    longitude: 83.31,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateTarget rejects missing target", () => {
  const result = validateTarget(null);

  assert.equal(result.valid, false);
});

test("validateTarget rejects invalid latitude", () => {
  const result = validateTarget({
    latitude: 91,
    longitude: 83,
  });

  assert.equal(result.valid, false);
});

test("validateTarget rejects invalid longitude", () => {
  const result = validateTarget({
    latitude: 17,
    longitude: 181,
  });

  assert.equal(result.valid, false);
});

// ============================================================
// DISTANCE
// ============================================================

test("calculateDistance returns zero for identical coordinates", () => {
  const distance = calculateDistance(
    17.70,
    83.30,
    17.70,
    83.30,
  );

  assert.equal(distance, 0);
});

test("calculateDistance is symmetric", () => {
  const forward = calculateDistance(
    17.70,
    83.30,
    17.71,
    83.31,
  );

  const reverse = calculateDistance(
    17.71,
    83.31,
    17.70,
    83.30,
  );

  assert.equal(forward, reverse);
});

test("calculateDistance returns a positive distance for distinct coordinates", () => {
  const distance = calculateDistance(
    17.70,
    83.30,
    17.71,
    83.31,
  );

  assert.ok(distance > 0);
  assert.ok(Number.isFinite(distance));
});

// ============================================================
// DISTANCE VECTOR
// ============================================================

test("buildIDWDistances returns one distance per sample", () => {
  const samples = buildSamples();

  const distances = buildIDWDistances(
    {
      latitude: 17.715,
      longitude: 83.315,
    },
    samples,
  );

  assert.equal(distances.length, samples.length);
  assert.ok(distances.every(Number.isFinite));
});

test("buildIDWDistances returns zero for an exact sample location", () => {
  const samples = buildSamples();

  const distances = buildIDWDistances(
    {
      latitude: samples[0].latitude,
      longitude: samples[0].longitude,
    },
    samples,
  );

  assert.equal(distances[0], 0);
});

test("buildIDWDistances returns empty array for invalid samples input", () => {
  const distances = buildIDWDistances(
    {
      latitude: 17.70,
      longitude: 83.30,
    },
    null,
  );

  assert.deepEqual(distances, []);
});

test("buildIDWDistances returns empty array for missing target", () => {
  const distances = buildIDWDistances(
    null,
    buildSamples(),
  );

  assert.deepEqual(distances, []);
});

// ============================================================
// POWER VALIDATION
// ============================================================

test("validatePower accepts default power", () => {
  assert.equal(validatePower(DEFAULT_POWER), true);
});

test("validatePower accepts minimum power", () => {
  assert.equal(validatePower(MIN_POWER), true);
});

test("validatePower accepts maximum power", () => {
  assert.equal(validatePower(MAX_POWER), true);
});

test("validatePower rejects power below minimum", () => {
  assert.equal(validatePower(MIN_POWER - 0.01), false);
});

test("validatePower rejects power above maximum", () => {
  assert.equal(validatePower(MAX_POWER + 0.01), false);
});

test("validatePower rejects non-numeric power", () => {
  assert.equal(validatePower("abc"), false);
});

// ============================================================
// IDW PREDICTION
// ============================================================

test("calculateIDWPrediction returns exact sample value at zero distance", () => {
  const samples = buildSamples();

  const distances = [
    0,
    calculateDistance(
      samples[0].latitude,
      samples[0].longitude,
      samples[1].latitude,
      samples[1].longitude,
    ),
    calculateDistance(
      samples[0].latitude,
      samples[0].longitude,
      samples[2].latitude,
      samples[2].longitude,
    ),
  ];

  const prediction = calculateIDWPrediction(
    samples,
    distances,
    2,
  );

  assert.equal(prediction, samples[0].value);
});

test("calculateIDWPrediction produces a finite weighted prediction", () => {
  const samples = buildSamples();

  const distances = buildIDWDistances(
    {
      latitude: 17.715,
      longitude: 83.315,
    },
    samples,
  );

  const prediction = calculateIDWPrediction(
    samples,
    distances,
    2,
  );

  assert.ok(Number.isFinite(prediction));
});

test("calculateIDWPrediction gives the midpoint of two equally distant values", () => {
  const samples = [
    {
      latitude: 0,
      longitude: 0,
      value: 10,
    },
    {
      latitude: 0,
      longitude: 2,
      value: 30,
    },
  ];

  const distances = [
    calculateDistance(0, 1, 0, 0),
    calculateDistance(0, 1, 0, 2),
  ];

  const prediction = calculateIDWPrediction(
    samples,
    distances,
    2,
  );

  assert.ok(Math.abs(prediction - 20) < 1e-12);
});

test("calculateIDWPrediction changes with distance weighting", () => {
  const samples = [
    {
      latitude: 0,
      longitude: 0,
      value: 10,
    },
    {
      latitude: 0,
      longitude: 10,
      value: 30,
    },
  ];

  const distances = [
    1,
    2,
  ];

  const predictionPower1 =
    calculateIDWPrediction(
      samples,
      distances,
      1,
    );

  const predictionPower2 =
    calculateIDWPrediction(
      samples,
      distances,
      2,
    );

  assert.ok(
    predictionPower2 < predictionPower1,
  );
});

test("calculateIDWPrediction rejects mismatched arrays", () => {
  const result = calculateIDWPrediction(
    buildSamples(),
    [1, 2],
    2,
  );

  assert.equal(result, null);
});

test("calculateIDWPrediction rejects invalid distance", () => {
  const distances = [
    1,
    NaN,
    2,
  ];

  const result = calculateIDWPrediction(
    buildSamples(),
    distances,
    2,
  );

  assert.equal(result, null);
});

test("calculateIDWPrediction rejects invalid power", () => {
  const result = calculateIDWPrediction(
    buildSamples(),
    [1, 2, 3],
    100,
  );

  assert.equal(result, null);
});

test("calculateIDWPrediction rejects empty samples", () => {
  const result = calculateIDWPrediction(
    [],
    [],
    2,
  );

  assert.equal(result, null);
});

// ============================================================
// PREDICTION VALIDATION
// ============================================================

test("validatePrediction accepts finite prediction", () => {
  assert.equal(validatePrediction(10), true);
});

test("validatePrediction rejects null", () => {
  assert.equal(validatePrediction(null), false);
});

test("validatePrediction rejects NaN", () => {
  assert.equal(validatePrediction(NaN), false);
});

test("validatePrediction rejects Infinity", () => {
  assert.equal(validatePrediction(Infinity), false);
});

// ============================================================
// HIGH-LEVEL INTERPOLATION
// ============================================================

test("interpolateIDW returns successful result", () => {
  const result = interpolateIDW(
    buildSamples(),
    {
      latitude: 17.715,
      longitude: 83.315,
    },
    {
      power: 2,
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.method, "idw");
  assert.ok(Number.isFinite(result.prediction));
  assert.equal(result.sampleCount, 3);
  assert.equal(result.power, 2);
});

test("interpolateIDW defaults power to 2", () => {
  const result = interpolateIDW(
    buildSamples(),
    {
      latitude: 17.715,
      longitude: 83.315,
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.power, DEFAULT_POWER);
});

test("interpolateIDW rejects invalid samples", () => {
  assert.throws(
    () =>
      interpolateIDW(
        [],
        {
          latitude: 17.71,
          longitude: 83.31,
        },
      ),
  );
});

test("interpolateIDW rejects invalid target", () => {
  assert.throws(
    () =>
      interpolateIDW(
        buildSamples(),
        {
          latitude: 91,
          longitude: 83.31,
        },
      ),
  );
});

test("interpolateIDW rejects invalid power", () => {
  assert.throws(
    () =>
      interpolateIDW(
        buildSamples(),
        {
          latitude: 17.71,
          longitude: 83.31,
        },
        {
          power: 100,
        },
      ),
  );
});

test("interpolateIDW preserves exact sample value", () => {
  const samples = buildSamples();

  const result = interpolateIDW(
    samples,
    {
      latitude: samples[1].latitude,
      longitude: samples[1].longitude,
    },
  );

  assert.equal(result.success, true);
  assert.equal(
    result.prediction,
    samples[1].value,
  );
});

test("interpolateIDW returns target coordinates", () => {
  const target = {
    latitude: 17.715,
    longitude: 83.315,
  };

  const result = interpolateIDW(
    buildSamples(),
    target,
  );

  assert.deepEqual(
    result.target,
    target,
  );
});

test("interpolateIDW does not mutate samples", () => {
  const samples = buildSamples();
  const original = structuredClone(samples);

  interpolateIDW(
    samples,
    {
      latitude: 17.715,
      longitude: 83.315,
    },
  );

  assert.deepEqual(samples, original);
});

test("interpolateIDW does not mutate target", () => {
  const target = {
    latitude: 17.715,
    longitude: 83.315,
  };

  const original = structuredClone(target);

  interpolateIDW(
    buildSamples(),
    target,
  );

  assert.deepEqual(target, original);
});

// ============================================================
// PUBLIC ALIAS
// ============================================================

test("idwInterpolation is equivalent to interpolateIDW", () => {
  const samples = buildSamples();

  const target = {
    latitude: 17.715,
    longitude: 83.315,
  };

  const direct = interpolateIDW(
    samples,
    target,
    { power: 2 },
  );

  const alias = idwInterpolation(
    samples,
    target,
    { power: 2 },
  );

  assert.deepEqual(alias, direct);
});
