"use strict";

// ============================================================
// server/tests/covariance.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Covariance Model Tests
//
// Tests:
//   1. Covariance parameter validation
//   2. Covariance model validation
//   3. Spherical covariance
//   4. Exponential covariance
//   5. Gaussian covariance
//   6. Zero-distance covariance
//   7. Covariance monotonicity
//   8. Spherical range behavior
//   9. Covariance / semivariogram relationship
//  10. Covariance matrix construction
//  11. Covariance matrix symmetry
//  12. Target covariance vector
//  13. Invalid distance handling
//  14. Covariance value validation
//
// ============================================================

const assert = require("assert");

const covariance = require("../services/interpolation/covariance");
const variogram = require("../services/interpolation/variogram");

// ============================================================
// TEST HELPERS
// ============================================================

let passed = 0;

function test(name, callback) {
  try {
    callback();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

function approximatelyEqual(actual, expected, tolerance = 1e-10) {
  return Math.abs(actual - expected) <= tolerance;
}

// ============================================================
// COMMON PARAMETERS
// ============================================================

const parameters = {
  nugget: 0.1,
  sill: 1.0,
  range: 1000,
};

// ============================================================
// 1. COVARIANCE PARAMETER VALIDATION
// ============================================================

test("Covariance parameter validation", () => {
  const valid =
    covariance.validateCovarianceParameters(parameters);

  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.errors.length, 0);
  assert.strictEqual(valid.nugget, 0.1);
  assert.strictEqual(valid.sill, 1.0);
  assert.strictEqual(valid.range, 1000);

  const invalid =
    covariance.validateCovarianceParameters({
      nugget: -1,
      sill: 0,
      range: 0,
    });

  assert.strictEqual(invalid.valid, false);
  assert.ok(invalid.errors.length > 0);
});

// ============================================================
// 2. COVARIANCE MODEL VALIDATION
// ============================================================

test("Covariance model validation", () => {
  const spherical =
    covariance.validateCovarianceModel("spherical");

  assert.strictEqual(spherical.valid, true);
  assert.strictEqual(spherical.model.key, "spherical");
  assert.strictEqual(spherical.model.label, "Spherical");

  const exponential =
    covariance.validateCovarianceModel("exponential");

  assert.strictEqual(exponential.valid, true);
  assert.strictEqual(exponential.model.key, "exponential");

  const gaussian =
    covariance.validateCovarianceModel("gaussian");

  assert.strictEqual(gaussian.valid, true);
  assert.strictEqual(gaussian.model.key, "gaussian");

  const invalid =
    covariance.validateCovarianceModel("invalid-model");

  assert.strictEqual(invalid.valid, false);
  assert.strictEqual(invalid.model, null);
});

// ============================================================
// 3. SPHERICAL COVARIANCE
// ============================================================

test("Spherical covariance", () => {
  const value =
    covariance.sphericalCovariance(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  // Validated spherical semivariogram:
  //
  // γ(500) = 0.71875
  //
  // Therefore:
  //
  // C(500) = 1.0 - 0.71875
  //        = 0.28125

  assert.ok(
    approximatelyEqual(value, 0.28125),
    `Expected 0.28125, received ${value}`,
  );
});

// ============================================================
// 4. EXPONENTIAL COVARIANCE
// ============================================================

test("Exponential covariance", () => {
  const value =
    covariance.exponentialCovariance(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  const expected =
    parameters.sill -
    variogram.exponentialVariogram(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  assert.ok(
    approximatelyEqual(value, expected),
    `Expected ${expected}, received ${value}`,
  );

  assert.ok(value > 0);
  assert.ok(value < parameters.sill);
});

// ============================================================
// 5. GAUSSIAN COVARIANCE
// ============================================================

test("Gaussian covariance", () => {
  const value =
    covariance.gaussianCovariance(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  const expected =
    parameters.sill -
    variogram.gaussianVariogram(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  assert.ok(
    approximatelyEqual(value, expected),
    `Expected ${expected}, received ${value}`,
  );

  assert.ok(value > 0);
  assert.ok(value < parameters.sill);
});

// ============================================================
// 6. ZERO-DISTANCE COVARIANCE
// ============================================================

test("Zero-distance covariance equals total sill", () => {
  const models = [
    "spherical",
    "exponential",
    "gaussian",
  ];

  for (const model of models) {
    const value =
      covariance.calculateCovariance(
        0,
        model,
        parameters,
      );

    assert.ok(
      approximatelyEqual(value, parameters.sill),
      `${model}: expected ${parameters.sill}, received ${value}`,
    );
  }
});

// ============================================================
// 7. COVARIANCE MONOTONICITY
// ============================================================

test("Covariance decreases with distance", () => {
  const models = [
    "spherical",
    "exponential",
    "gaussian",
  ];

  for (const model of models) {
    const c0 =
      covariance.calculateCovariance(
        0,
        model,
        parameters,
      );

    const c250 =
      covariance.calculateCovariance(
        250,
        model,
        parameters,
      );

    const c500 =
      covariance.calculateCovariance(
        500,
        model,
        parameters,
      );

    const c750 =
      covariance.calculateCovariance(
        750,
        model,
        parameters,
      );

    assert.ok(c0 >= c250);
    assert.ok(c250 >= c500);
    assert.ok(c500 >= c750);
  }
});

// ============================================================
// 8. SPHERICAL RANGE BEHAVIOR
// ============================================================

test("Spherical covariance reaches zero at and beyond range", () => {
  const atRange =
    covariance.sphericalCovariance(
      parameters.range,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  const beyondRange =
    covariance.sphericalCovariance(
      parameters.range * 2,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  assert.ok(
    approximatelyEqual(atRange, 0),
    `Expected 0 at range, received ${atRange}`,
  );

  assert.ok(
    approximatelyEqual(beyondRange, 0),
    `Expected 0 beyond range, received ${beyondRange}`,
  );
});

// ============================================================
// 9. COVARIANCE / SEMIVARIOGRAM RELATIONSHIP
// ============================================================

test("Covariance equals sill minus semivariogram", () => {
  const models = [
    "spherical",
    "exponential",
    "gaussian",
  ];

  const distances = [
    0,
    100,
    250,
    500,
    750,
    1000,
  ];

  for (const model of models) {
    for (const distance of distances) {
      const semivariance =
        variogram.evaluateVariogram(
          model,
          distance,
          parameters,
        );

      const covarianceValue =
        covariance.calculateCovariance(
          distance,
          model,
          parameters,
        );

      const expected =
        parameters.sill - semivariance;

      assert.ok(
        approximatelyEqual(
          covarianceValue,
          expected,
        ),
        `${model} at ${distance}m: expected ${expected}, received ${covarianceValue}`,
      );
    }
  }
});

// ============================================================
// 10. COVARIANCE MATRIX CONSTRUCTION
// ============================================================

test("Covariance matrix construction", () => {
  const distanceMatrix = [
    [0, 500, 1000],
    [500, 0, 750],
    [1000, 750, 0],
  ];

  const matrix =
    covariance.buildCovarianceMatrix(
      distanceMatrix,
      "spherical",
      parameters,
    );

  assert.ok(Array.isArray(matrix));
  assert.strictEqual(matrix.length, 3);

  for (const row of matrix) {
    assert.strictEqual(row.length, 3);
  }

  assert.ok(
    approximatelyEqual(matrix[0][0], 1.0),
  );

  assert.ok(
    approximatelyEqual(matrix[0][1], 0.28125),
  );

  assert.ok(
    approximatelyEqual(matrix[0][2], 0),
  );

  assert.ok(
    approximatelyEqual(matrix[1][2], 0.07734375),
  );
});

// ============================================================
// 11. COVARIANCE MATRIX SYMMETRY
// ============================================================

test("Covariance matrix is symmetric", () => {
  const distanceMatrix = [
    [0, 250, 500],
    [250, 0, 750],
    [500, 750, 0],
  ];

  const matrix =
    covariance.buildCovarianceMatrix(
      distanceMatrix,
      "exponential",
      parameters,
    );

  assert.strictEqual(
    covariance.isSymmetricMatrix(matrix),
    true,
  );

  assert.ok(
    approximatelyEqual(matrix[0][1], matrix[1][0]),
  );

  assert.ok(
    approximatelyEqual(matrix[0][2], matrix[2][0]),
  );

  assert.ok(
    approximatelyEqual(matrix[1][2], matrix[2][1]),
  );
});

// ============================================================
// 12. TARGET COVARIANCE VECTOR
// ============================================================

test("Target covariance vector", () => {
  const targetDistances = [
    0,
    500,
    1000,
  ];

  const vector =
    covariance.buildTargetCovarianceVector(
      targetDistances,
      "spherical",
      parameters,
    );

  assert.ok(Array.isArray(vector));
  assert.strictEqual(vector.length, 3);

  assert.ok(
    approximatelyEqual(vector[0], 1.0),
  );

  assert.ok(
    approximatelyEqual(vector[1], 0.28125),
  );

  assert.ok(
    approximatelyEqual(vector[2], 0),
  );
});

// ============================================================
// 13. INVALID DISTANCE HANDLING
// ============================================================

test("Invalid distance handling", () => {
  assert.strictEqual(
    covariance.validateDistance(-1),
    false,
  );

  assert.strictEqual(
    covariance.validateDistance("invalid"),
    false,
  );

  assert.strictEqual(
    covariance.calculateCovariance(
      -100,
      "spherical",
      parameters,
    ),
    null,
  );

  assert.strictEqual(
    covariance.calculateCovariance(
      "invalid",
      "spherical",
      parameters,
    ),
    null,
  );

  const matrix =
    covariance.buildCovarianceMatrix(
      [
        [0, 100],
        [100, -1],
      ],
      "spherical",
      parameters,
    );

  assert.strictEqual(matrix[0][0], 1);
  assert.strictEqual(matrix[0][1] !== null, true);
  assert.strictEqual(matrix[1][0] !== null, true);
  assert.strictEqual(matrix[1][1], null);
});

// ============================================================
// 14. COVARIANCE VALUE VALIDATION
// ============================================================

test("Covariance value validation", () => {
  const covarianceValue =
    covariance.calculateCovariance(
      500,
      "spherical",
      parameters,
    );

  assert.strictEqual(
    covariance.isValidCovarianceValue(
      covarianceValue,
      parameters.sill,
    ),
    true,
  );

  assert.strictEqual(
    covariance.isValidCovarianceValue(
      parameters.sill,
      parameters.sill,
    ),
    true,
  );

  assert.strictEqual(
    covariance.isValidCovarianceValue(
      -0.5,
      parameters.sill,
    ),
    false,
  );

  assert.strictEqual(
    covariance.isValidCovarianceValue(
      1.5,
      parameters.sill,
    ),
    false,
  );
});

// ============================================================
// SUMMARY
// ============================================================

console.log("");
console.log(
  `Covariance tests: ${passed}/14 passed.`,
);

if (passed !== 14) {
  process.exitCode = 1;
}
