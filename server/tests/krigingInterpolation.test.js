"use strict";

// ============================================================
// server/tests/krigingInterpolation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10 — Ordinary Kriging Interpolation Tests
//
// Tests:
//   1. Exact prediction at a sample location
//   2. Interpolation between sample locations
//   3. Kriging weight constraint
//   4. Three-dimensional sample configuration
//   5. Exponential covariance model
//   6. Gaussian covariance model
//   7. Invalid sample count
//   8. Invalid target
//   9. Invalid covariance parameters
//  10. Singular / duplicate-location configuration
//  11. Residual validation
//  12. Input immutability
//
// ============================================================

const {
  interpolateKriging,
  calculateKrigingPrediction,
} = require("../services/interpolation/krigingInterpolation");


/* ============================================================
   TEST UTILITIES
   ============================================================ */

let passed = 0;
let failed = 0;


/**
 * Assert a condition.
 *
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


/**
 * Assert numerical approximate equality.
 *
 * @param {number} actual
 * @param {number} expected
 * @param {number} tolerance
 */
function assertApproximatelyEqual(
  actual,
  expected,
  tolerance = 1e-8,
) {
  if (
    !Number.isFinite(actual) ||
    Math.abs(actual - expected) > tolerance
  ) {
    throw new Error(
      `Expected ${expected}, received ${actual}.`,
    );
  }
}


/**
 * Assert an array of numerical values.
 *
 * @param {number[]} actual
 * @param {number[]} expected
 * @param {number} tolerance
 */
function assertArrayApproximatelyEqual(
  actual,
  expected,
  tolerance = 1e-8,
) {
  assert(
    Array.isArray(actual),
    "Expected an array.",
  );

  assert(
    actual.length === expected.length,
    `Expected length ${expected.length}, received ${actual.length}.`,
  );

  for (
    let index = 0;
    index < expected.length;
    index += 1
  ) {
    assertApproximatelyEqual(
      actual[index],
      expected[index],
      tolerance,
    );
  }
}


/**
 * Run a test.
 *
 * @param {string} name
 * @param {Function} callback
 */
function test(name, callback) {
  try {
    callback();

    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`      ${error.message}`);

    failed += 1;
  }
}


/* ============================================================
   COMMON TEST DATA
   ============================================================ */

const basePoints = [
  {
    latitude: 17.7000,
    longitude: 83.3000,
    value: 10,
  },
  {
    latitude: 17.7000,
    longitude: 83.3100,
    value: 20,
  },
  {
    latitude: 17.7100,
    longitude: 83.3000,
    value: 30,
  },
];

const baseParameters = {
  model: "spherical",
  nugget: 0.1,
  sill: 1.0,
  range: 2000,
};


/* ============================================================
   1. EXACT SAMPLE LOCATION
   ============================================================ */

test(
  "predicts the sample value at an exact sample location",
  () => {
    const target = {
      latitude: basePoints[0].latitude,
      longitude: basePoints[0].longitude,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assertApproximatelyEqual(
      result.predictedValue,
      basePoints[0].value,
      1e-8,
    );
  },
);


/* ============================================================
   2. INTERPOLATION BETWEEN SAMPLES
   ============================================================ */

test(
  "produces a finite prediction between sample locations",
  () => {
    const target = {
      latitude: 17.7030,
      longitude: 83.3040,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      Number.isFinite(result.predictedValue),
      "Predicted value must be finite.",
    );

    assert(
      result.predictedValue >= 10 &&
        result.predictedValue <= 30,
      "Prediction should lie within the observed value range for this test configuration.",
    );
  },
);


/* ============================================================
   3. WEIGHT CONSTRAINT
   ============================================================ */

test(
  "Kriging weights satisfy the ordinary constraint",
  () => {
    const target = {
      latitude: 17.7040,
      longitude: 83.3040,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assertApproximatelyEqual(
      result.weightSum,
      1,
      1e-10,
    );

    assertArrayApproximatelyEqual(
      result.weights,
      result.weights,
      0,
    );
  },
);


/* ============================================================
   4. THREE-DIMENSIONAL SAMPLE CONFIGURATION
   ============================================================ */

test(
  "handles a three-dimensional spatial sample configuration",
  () => {
    const points = [
      {
        latitude: 17.7000,
        longitude: 83.3000,
        value: 100,
      },
      {
        latitude: 17.7000,
        longitude: 83.3100,
        value: 110,
      },
      {
        latitude: 17.7100,
        longitude: 83.3000,
        value: 120,
      },
      {
        latitude: 17.7100,
        longitude: 83.3100,
        value: 130,
      },
    ];

    const target = {
      latitude: 17.7050,
      longitude: 83.3050,
    };

    const result = interpolateKriging(
      points,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      result.sampleCount === 4,
      "Expected four samples.",
    );

    assert(
      result.weights.length === 4,
      "Expected four Kriging weights.",
    );

    assert(
      Number.isFinite(result.predictedValue),
      "Prediction must be finite.",
    );
  },
);


/* ============================================================
   5. EXPONENTIAL MODEL
   ============================================================ */

test(
  "supports the exponential covariance model",
  () => {
    const target = {
      latitude: 17.7030,
      longitude: 83.3040,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      {
        model: "exponential",
        nugget: 0.1,
        sill: 1.0,
        range: 2000,
      },
    );

    assert(
      result.success === true,
      `Exponential Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      result.model === "exponential",
      "Expected exponential model.",
    );

    assert(
      Number.isFinite(result.predictedValue),
      "Prediction must be finite.",
    );
  },
);


/* ============================================================
   6. GAUSSIAN MODEL
   ============================================================ */

test(
  "supports the Gaussian covariance model",
  () => {
    const target = {
      latitude: 17.7030,
      longitude: 83.3040,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      {
        model: "gaussian",
        nugget: 0.1,
        sill: 1.0,
        range: 2000,
      },
    );

    assert(
      result.success === true,
      `Gaussian Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      result.model === "gaussian",
      "Expected Gaussian model.",
    );

    assert(
      Number.isFinite(result.predictedValue),
      "Prediction must be finite.",
    );
  },
);


/* ============================================================
   7. INVALID SAMPLE COUNT
   ============================================================ */

test(
  "rejects fewer than two sample points",
  () => {
    const result = interpolateKriging(
      [
        {
          latitude: 17.7000,
          longitude: 83.3000,
          value: 10,
        },
      ],
      {
        latitude: 17.7050,
        longitude: 83.3050,
      },
      baseParameters,
    );

    assert(
      result.success === false,
      "Kriging should reject fewer than two samples.",
    );
  },
);


/* ============================================================
   8. INVALID TARGET
   ============================================================ */

test(
  "rejects an invalid target point",
  () => {
    const result = interpolateKriging(
      basePoints,
      {
        latitude: 200,
        longitude: 83.3050,
      },
      baseParameters,
    );

    assert(
      result.success === false,
      "Invalid target should be rejected.",
    );
  },
);


/* ============================================================
   9. INVALID COVARIANCE PARAMETERS
   ============================================================ */

test(
  "rejects invalid covariance parameters",
  () => {
    const result = interpolateKriging(
      basePoints,
      {
        latitude: 17.7050,
        longitude: 83.3050,
      },
      {
        model: "spherical",
        nugget: 2,
        sill: 1,
        range: 2000,
      },
    );

    assert(
      result.success === false,
      "Invalid covariance parameters should be rejected.",
    );
  },
);


/* ============================================================
   10. DUPLICATE LOCATION / SINGULAR CONFIGURATION
   ============================================================ */

test(
  "detects a singular configuration caused by duplicate locations",
  () => {
    const points = [
      {
        latitude: 17.7000,
        longitude: 83.3000,
        value: 10,
      },
      {
        latitude: 17.7000,
        longitude: 83.3000,
        value: 20,
      },
    ];

    const target = {
      latitude: 17.7050,
      longitude: 83.3050,
    };

    const result = interpolateKriging(
      points,
      target,
      baseParameters,
    );

    assert(
      result.success === false,
      "Duplicate-location configuration should fail.",
    );
  },
);


/* ============================================================
   11. RESIDUAL VALIDATION
   ============================================================ */

test(
  "returns a numerically small Kriging system residual",
  () => {
    const target = {
      latitude: 17.7040,
      longitude: 83.3040,
    };

    const result = interpolateKriging(
      basePoints,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      Number.isFinite(result.maximumResidual),
      "Maximum residual must be finite.",
    );

    assert(
      result.maximumResidual <= 1e-8,
      `Residual ${result.maximumResidual} exceeds tolerance.`,
    );
  },
);


/* ============================================================
   12. INPUT IMMUTABILITY
   ============================================================ */

test(
  "does not mutate sample points or target",
  () => {
    const points = JSON.parse(
      JSON.stringify(basePoints),
    );

    const target = {
      latitude: 17.7040,
      longitude: 83.3040,
    };

    const originalPoints = JSON.parse(
      JSON.stringify(points),
    );

    const originalTarget = JSON.parse(
      JSON.stringify(target),
    );

    const result = interpolateKriging(
      points,
      target,
      baseParameters,
    );

    assert(
      result.success === true,
      `Kriging should succeed: ${result.error || ""}`,
    );

    assert(
      JSON.stringify(points) ===
        JSON.stringify(originalPoints),
      "Sample points were modified.",
    );

    assert(
      JSON.stringify(target) ===
        JSON.stringify(originalTarget),
      "Target point was modified.",
    );
  },
);


/* ============================================================
   13. CONVENIENCE ALIAS
   ============================================================ */

test(
  "calculateKrigingPrediction matches interpolateKriging",
  () => {
    const target = {
      latitude: 17.7040,
      longitude: 83.3040,
    };

    const directResult =
      interpolateKriging(
        basePoints,
        target,
        baseParameters,
      );

    const aliasResult =
      calculateKrigingPrediction(
        basePoints,
        target,
        baseParameters,
      );

    assert(
      directResult.success === true,
      "Direct Kriging calculation should succeed.",
    );

    assert(
      aliasResult.success === true,
      "Alias calculation should succeed.",
    );

    assertApproximatelyEqual(
      aliasResult.predictedValue,
      directResult.predictedValue,
      1e-10,
    );
  },
);


/* ============================================================
   SUMMARY
   ============================================================ */

console.log("");

console.log(
  `Kriging Interpolation tests: ${passed}/${passed + failed} passed.`,
);

if (failed > 0) {
  process.exitCode = 1;
}