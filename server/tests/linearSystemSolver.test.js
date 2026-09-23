"use strict";

// ============================================================
// server/tests/linearSystemSolver.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10 — Linear System Solver Tests
//
// Tests:
//   1. 1x1 linear system
//   2. 2x2 linear system
//   3. 3x3 linear system
//   4. System requiring row pivoting
//   5. Identity matrix
//   6. Invalid matrix
//   7. Non-square matrix
//   8. Vector-size mismatch
//   9. Non-finite matrix value
//  10. Non-finite vector value
//  11. Singular matrix
//  12. Near-singular matrix
//  13. Input immutability
//  14. Residual calculation
//  15. Invalid pivot tolerance
//
// ============================================================

const {
  DEFAULT_PIVOT_TOLERANCE,
  validateMatrix,
  validateVector,
  solveLinearSystem,
  calculateResidual,
} = require("../services/interpolation/linearSystemSolver");


/* ============================================================
   TEST UTILITIES
   ============================================================ */

let passed = 0;
let failed = 0;


/**
 * Assert that a condition is true.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


/**
 * Assert that two numbers are approximately equal.
 */
function assertApproximatelyEqual(
  actual,
  expected,
  tolerance = 1e-10,
) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ${expected}, received ${actual}.`,
    );
  }
}


/**
 * Assert that two arrays contain approximately equal values.
 */
function assertArrayApproximatelyEqual(
  actual,
  expected,
  tolerance = 1e-10,
) {
  assert(
    Array.isArray(actual),
    "Actual value must be an array.",
  );

  assert(
    actual.length === expected.length,
    `Expected array length ${expected.length}, received ${actual.length}.`,
  );

  for (let index = 0; index < expected.length; index += 1) {
    assertApproximatelyEqual(
      actual[index],
      expected[index],
      tolerance,
    );
  }
}


/**
 * Run one test.
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
   1. 1x1 SYSTEM
   ============================================================ */

test("solves a 1x1 linear system", () => {
  const matrix = [
    [4],
  ];

  const vector = [20];

  const result = solveLinearSystem(matrix, vector);

  assert(result.success === true, "Solver should succeed.");

  assertArrayApproximatelyEqual(
    result.solution,
    [5],
  );
});


/* ============================================================
   2. 2x2 SYSTEM
   ============================================================ */

test("solves a 2x2 linear system", () => {
  const matrix = [
    [2, 1],
    [1, 3],
  ];

  const vector = [
    5,
    6,
  ];

  const result = solveLinearSystem(matrix, vector);

  assert(result.success === true, "Solver should succeed.");

  assertArrayApproximatelyEqual(
    result.solution,
    [1.8, 1.4],
  );
});


/* ============================================================
   3. 3x3 SYSTEM
   ============================================================ */

test("solves a 3x3 linear system", () => {
  const matrix = [
    [3, 2, -1],
    [2, -2, 4],
    [-1, 0.5, -1],
  ];

  const vector = [
    1,
    -2,
    0,
  ];

  const result = solveLinearSystem(matrix, vector);

  assert(result.success === true, "Solver should succeed.");

  assertArrayApproximatelyEqual(
    result.solution,
    [1, -2, -2],
  );
});


/* ============================================================
   4. PARTIAL PIVOTING
   ============================================================ */

test("solves a system requiring row pivoting", () => {
  const matrix = [
    [0, 2],
    [1, 3],
  ];

  const vector = [
    4,
    7,
  ];

  const result = solveLinearSystem(matrix, vector);

  assert(result.success === true, "Solver should succeed.");

  assertArrayApproximatelyEqual(
    result.solution,
    [1, 2],
  );
});


/* ============================================================
   5. IDENTITY MATRIX
   ============================================================ */

test("solves an identity-matrix system", () => {
  const matrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  const vector = [
    7,
    -3,
    12,
  ];

  const result = solveLinearSystem(matrix, vector);

  assert(result.success === true, "Solver should succeed.");

  assertArrayApproximatelyEqual(
    result.solution,
    vector,
  );
});


/* ============================================================
   6. INVALID MATRIX
   ============================================================ */

test("rejects a non-array matrix", () => {
  const result = solveLinearSystem(
    null,
    [1],
  );

  assert(
    result.success === false,
    "Invalid matrix should fail.",
  );
});


/* ============================================================
   7. NON-SQUARE MATRIX
   ============================================================ */

test("rejects a non-square matrix", () => {
  const matrix = [
    [1, 2, 3],
    [4, 5, 6],
  ];

  const vector = [
    7,
    8,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Non-square matrix should fail.",
  );
});


/* ============================================================
   8. VECTOR SIZE MISMATCH
   ============================================================ */

test("rejects a vector with incorrect size", () => {
  const matrix = [
    [2, 1],
    [1, 2],
  ];

  const vector = [5];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Mismatched vector should fail.",
  );
});


/* ============================================================
   9. NON-FINITE MATRIX VALUE
   ============================================================ */

test("rejects a matrix containing a non-finite value", () => {
  const matrix = [
    [1, Infinity],
    [2, 3],
  ];

  const vector = [
    4,
    5,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Non-finite matrix value should fail.",
  );
});


/* ============================================================
   10. NON-FINITE VECTOR VALUE
   ============================================================ */

test("rejects a vector containing a non-finite value", () => {
  const matrix = [
    [1, 2],
    [3, 4],
  ];

  const vector = [
    5,
    NaN,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Non-finite vector value should fail.",
  );
});


/* ============================================================
   11. SINGULAR MATRIX
   ============================================================ */

test("detects a singular matrix", () => {
  const matrix = [
    [1, 2],
    [2, 4],
  ];

  const vector = [
    3,
    6,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Singular matrix should fail.",
  );

  assert(
    result.error.includes("Singular"),
    "Error should identify singularity.",
  );
});


/* ============================================================
   12. NEAR-SINGULAR MATRIX
   ============================================================ */

test("detects a near-singular matrix", () => {
  const matrix = [
    [1, 1],
    [1, 1 + 1e-14],
  ];

  const vector = [
    2,
    2 + 1e-14,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === false,
    "Near-singular matrix should fail.",
  );
});


/* ============================================================
   13. INPUT IMMUTABILITY
   ============================================================ */

test("does not mutate the input matrix or vector", () => {
  const matrix = [
    [0, 2],
    [1, 3],
  ];

  const vector = [
    4,
    7,
  ];

  const originalMatrix = JSON.parse(
    JSON.stringify(matrix),
  );

  const originalVector = vector.slice();

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === true,
    "Solver should succeed.",
  );

  assert(
    JSON.stringify(matrix) ===
      JSON.stringify(originalMatrix),
    "Input matrix was modified.",
  );

  assert(
    JSON.stringify(vector) ===
      JSON.stringify(originalVector),
    "Input vector was modified.",
  );
});


/* ============================================================
   14. RESIDUAL CALCULATION
   ============================================================ */

test("calculates a near-zero residual for a valid solution", () => {
  const matrix = [
    [2, 1],
    [1, 3],
  ];

  const vector = [
    5,
    6,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
  );

  assert(
    result.success === true,
    "Solver should succeed.",
  );

  const residual = calculateResidual(
    matrix,
    result.solution,
    vector,
  );

  assert(
    Array.isArray(residual),
    "Residual should be an array.",
  );

  assertArrayApproximatelyEqual(
    residual,
    [0, 0],
    1e-10,
  );
});


/* ============================================================
   15. INVALID PIVOT TOLERANCE
   ============================================================ */

test("rejects an invalid pivot tolerance", () => {
  const matrix = [
    [2, 1],
    [1, 3],
  ];

  const vector = [
    5,
    6,
  ];

  const result = solveLinearSystem(
    matrix,
    vector,
    {
      pivotTolerance: -1,
    },
  );

  assert(
    result.success === false,
    "Invalid pivot tolerance should fail.",
  );
});


/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

test("validateMatrix accepts a valid square matrix", () => {
  const result = validateMatrix([
    [1, 2],
    [3, 4],
  ]);

  assert(result.valid === true, "Matrix should be valid.");
  assert(result.size === 2, "Matrix size should be 2.");
});


test("validateVector accepts a valid vector", () => {
  const result = validateVector(
    [1, 2, 3],
    3,
  );

  assert(result.valid === true, "Vector should be valid.");
  assert(result.size === 3, "Vector size should be 3.");
});


/* ============================================================
   SUMMARY
   ============================================================ */

console.log("");
console.log(
  `Linear System Solver tests: ${passed}/${passed + failed} passed.`,
);

if (failed > 0) {
  process.exitCode = 1;
}