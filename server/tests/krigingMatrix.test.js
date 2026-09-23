"use strict";

// ============================================================
// server/tests/krigingMatrix.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Ordinary Kriging Matrix Construction Tests
//
// Tests:
//   1. Covariance matrix validation
//   2. Covariance matrix symmetry validation
//   3. Target covariance vector validation
//   4. Ordinary Kriging matrix construction
//   5. Ordinary Kriging RHS vector construction
//   6. Complete Ordinary Kriging system construction
//   7. Kriging system structural validation
//   8. Invalid covariance matrix handling
//   9. Invalid target vector handling
//  10. Matrix/vector dimensions
//
// ============================================================

const assert = require("assert");

const krigingMatrix = require(
  "../services/interpolation/krigingMatrix",
);

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

// ============================================================
// TEST DATA
// ============================================================
//
// Three-sample covariance matrix.
//
// This represents:
//
//   C11 = 1.000000
//   C12 = 0.281250
//   C13 = 0.000000
//   C22 = 1.000000
//   C23 = 0.07734375
//   C33 = 1.000000
//
// The matrix is symmetric.
//
// ============================================================

const covarianceMatrix = [
  [1.0, 0.28125, 0.0],
  [0.28125, 1.0, 0.07734375],
  [0.0, 0.07734375, 1.0],
];

const targetCovarianceVector = [
  0.5,
  0.3,
  0.1,
];

// ============================================================
// EXPECTED ORDINARY KRIGING MATRIX
// ============================================================

const expectedKrigingMatrix = [
  [1.0, 0.28125, 0.0, 1],
  [0.28125, 1.0, 0.07734375, 1],
  [0.0, 0.07734375, 1.0, 1],
  [1, 1, 1, 0],
];

// ============================================================
// EXPECTED RIGHT-HAND-SIDE VECTOR
// ============================================================

const expectedKrigingVector = [
  0.5,
  0.3,
  0.1,
  1,
];

// ============================================================
// 1. COVARIANCE MATRIX VALIDATION
// ============================================================

test("Covariance matrix validation", () => {
  const result =
    krigingMatrix.validateCovarianceMatrix(
      covarianceMatrix,
    );

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.size, 3);
});

// ============================================================
// 2. COVARIANCE MATRIX SYMMETRY
// ============================================================

test("Covariance matrix symmetry validation", () => {
  assert.strictEqual(
    krigingMatrix.isSymmetricMatrix(
      covarianceMatrix,
    ),
    true,
  );

  const nonSymmetricMatrix = [
    [1.0, 0.2],
    [0.3, 1.0],
  ];

  assert.strictEqual(
    krigingMatrix.isSymmetricMatrix(
      nonSymmetricMatrix,
    ),
    false,
  );
});

// ============================================================
// 3. TARGET COVARIANCE VECTOR VALIDATION
// ============================================================

test("Target covariance vector validation", () => {
  const result =
    krigingMatrix.validateTargetCovarianceVector(
      targetCovarianceVector,
      3,
    );

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.size, 3);

  const wrongSize =
    krigingMatrix.validateTargetCovarianceVector(
      [0.5, 0.3],
      3,
    );

  assert.strictEqual(wrongSize.valid, false);
  assert.ok(wrongSize.errors.length > 0);
});

// ============================================================
// 4. ORDINARY KRIGING MATRIX CONSTRUCTION
// ============================================================

test("Ordinary Kriging matrix construction", () => {
  const matrix =
    krigingMatrix.buildOrdinaryKrigingMatrix(
      covarianceMatrix,
    );

  assert.ok(Array.isArray(matrix));
  assert.strictEqual(matrix.length, 4);

  for (const row of matrix) {
    assert.strictEqual(row.length, 4);
  }

  assert.deepStrictEqual(
    matrix,
    expectedKrigingMatrix,
  );
});

// ============================================================
// 5. ORDINARY KRIGING RHS VECTOR
// ============================================================

test("Ordinary Kriging right-hand-side vector construction", () => {
  const vector =
    krigingMatrix.buildOrdinaryKrigingVector(
      targetCovarianceVector,
      3,
    );

  assert.ok(Array.isArray(vector));
  assert.strictEqual(vector.length, 4);

  assert.deepStrictEqual(
    vector,
    expectedKrigingVector,
  );
});

// ============================================================
// 6. COMPLETE ORDINARY KRIGING SYSTEM
// ============================================================

test("Complete Ordinary Kriging system construction", () => {
  const system =
    krigingMatrix.buildOrdinaryKrigingSystem(
      covarianceMatrix,
      targetCovarianceVector,
    );

  assert.ok(system);

  assert.strictEqual(
    system.sampleCount,
    3,
  );

  assert.strictEqual(
    system.systemSize,
    4,
  );

  assert.deepStrictEqual(
    system.matrix,
    expectedKrigingMatrix,
  );

  assert.deepStrictEqual(
    system.vector,
    expectedKrigingVector,
  );
});

// ============================================================
// 7. KRIGING SYSTEM STRUCTURAL VALIDATION
// ============================================================

test("Ordinary Kriging system structural validation", () => {
  const system =
    krigingMatrix.buildOrdinaryKrigingSystem(
      covarianceMatrix,
      targetCovarianceVector,
    );

  const validation =
    krigingMatrix.validateOrdinaryKrigingSystem(
      system.matrix,
      system.vector,
      system.sampleCount,
    );

  assert.strictEqual(
    validation.valid,
    true,
  );

  assert.strictEqual(
    validation.errors.length,
    0,
  );
});

// ============================================================
// 8. INVALID COVARIANCE MATRIX HANDLING
// ============================================================

test("Invalid covariance matrix handling", () => {
  const nonSquareMatrix = [
    [1.0, 0.2],
    [0.2],
  ];

  const result =
    krigingMatrix.validateCovarianceMatrix(
      nonSquareMatrix,
    );

  assert.strictEqual(
    result.valid,
    false,
  );

  assert.ok(
    result.errors.length > 0,
  );

  const invalidValueMatrix = [
    [1.0, 0.2],
    [0.2, NaN],
  ];

  const invalidValueResult =
    krigingMatrix.validateCovarianceMatrix(
      invalidValueMatrix,
    );

  assert.strictEqual(
    invalidValueResult.valid,
    false,
  );

  assert.ok(
    invalidValueResult.errors.length > 0,
  );

  assert.strictEqual(
    krigingMatrix.buildOrdinaryKrigingMatrix(
      nonSquareMatrix,
    ),
    null,
  );
});

// ============================================================
// 9. INVALID TARGET VECTOR HANDLING
// ============================================================

test("Invalid target covariance vector handling", () => {
  const invalidVector = [
    0.5,
    NaN,
    0.1,
  ];

  const result =
    krigingMatrix.validateTargetCovarianceVector(
      invalidVector,
      3,
    );

  assert.strictEqual(
    result.valid,
    false,
  );

  assert.ok(
    result.errors.length > 0,
  );

  assert.strictEqual(
    krigingMatrix.buildOrdinaryKrigingVector(
      invalidVector,
      3,
    ),
    null,
  );

  assert.strictEqual(
    krigingMatrix.buildOrdinaryKrigingSystem(
      covarianceMatrix,
      invalidVector,
    ),
    null,
  );
});

// ============================================================
// 10. MATRIX AND VECTOR DIMENSIONS
// ============================================================

test("Kriging matrix and vector dimensions", () => {
  const system =
    krigingMatrix.buildOrdinaryKrigingSystem(
      covarianceMatrix,
      targetCovarianceVector,
    );

  const expectedSize =
    targetCovarianceVector.length + 1;

  assert.strictEqual(
    system.matrix.length,
    expectedSize,
  );

  for (const row of system.matrix) {
    assert.strictEqual(
      row.length,
      expectedSize,
    );
  }

  assert.strictEqual(
    system.vector.length,
    expectedSize,
  );
});

// ============================================================
// ADDITIONAL STRUCTURAL CHECKS
// ============================================================

test("Ordinary Kriging constraint row and column", () => {
  const matrix =
    krigingMatrix.buildOrdinaryKrigingMatrix(
      covarianceMatrix,
    );

  const n = covarianceMatrix.length;

  // Last column must contain 1 for each sample.
  for (let row = 0; row < n; row += 1) {
    assert.strictEqual(
      matrix[row][n],
      1,
    );
  }

  // Last row must contain 1 for each sample.
  for (let column = 0; column < n; column += 1) {
    assert.strictEqual(
      matrix[n][column],
      1,
    );
  }

  // Lagrange multiplier corner.
  assert.strictEqual(
    matrix[n][n],
    0,
  );
});

// ============================================================
// SUMMARY
// ============================================================

console.log("");
console.log(
  `Kriging Matrix tests: ${passed}/11 passed.`,
);

if (passed !== 11) {
  process.exitCode = 1;
}
