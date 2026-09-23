"use strict";

// ============================================================
// server/tests/splineBasis.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Spline Interpolation — Thin-Plate Spline Basis Tests
//
// Responsibilities:
//   1. Validate thin-plate spline basis calculation
//   2. Validate distance inputs
//   3. Validate distance matrices
//   4. Validate spline basis matrices
//   5. Validate target spline basis vectors
//   6. Verify symmetry handling
//   7. Verify input immutability
//
// Scientific basis:
//
//   φ(r) = r² ln(r)
//
//   with:
//     φ(0) = 0
//
// This module tests only the spline basis layer.
// It does not test:
//   - polynomial constraints
//   - augmented spline matrix construction
//   - linear-system solving
//   - spline interpolation
//   - GIS presentation
//
// ============================================================

const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  MIN_DISTANCE,
  DEFAULT_SYMMETRY_TOLERANCE,
  isFiniteNumber,
  validateDistance,
  calculateThinPlateSplineBasis,
  validateDistanceMatrix,
  isSymmetricMatrix,
  buildSplineBasisMatrix,
  buildTargetSplineBasisVector,
  isValidSplineBasisValue,
  validateSplineBasisMatrix,
  validateSplineBasisVector,
} = require("../services/interpolation/splineBasis");

// ============================================================
// TEST HELPERS
// ============================================================

function approximatelyEqual(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Number.isFinite(actual),
    `Expected a finite number but received ${actual}`,
  );

  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ============================================================
// CONSTANTS
// ============================================================

describe("Spline Basis Constants", function () {
  it("should define MIN_DISTANCE as zero", function () {
    assert.strictEqual(MIN_DISTANCE, 0);
  });

  it("should define a positive symmetry tolerance", function () {
    assert.ok(Number.isFinite(DEFAULT_SYMMETRY_TOLERANCE));
    assert.ok(DEFAULT_SYMMETRY_TOLERANCE > 0);
  });
});

// ============================================================
// isFiniteNumber
// ============================================================

describe("isFiniteNumber", function () {
  it("should accept finite integers", function () {
    assert.strictEqual(isFiniteNumber(0), true);
    assert.strictEqual(isFiniteNumber(10), true);
    assert.strictEqual(isFiniteNumber(-10), true);
  });

  it("should accept finite decimal numbers", function () {
    assert.strictEqual(isFiniteNumber(0.25), true);
    assert.strictEqual(isFiniteNumber(123.456), true);
  });

  it("should reject NaN", function () {
    assert.strictEqual(isFiniteNumber(NaN), false);
  });

  it("should reject positive infinity", function () {
    assert.strictEqual(isFiniteNumber(Infinity), false);
  });

  it("should reject negative infinity", function () {
    assert.strictEqual(isFiniteNumber(-Infinity), false);
  });

  it("should reject numeric strings", function () {
    assert.strictEqual(isFiniteNumber("10"), false);
  });

  it("should reject null", function () {
    assert.strictEqual(isFiniteNumber(null), false);
  });
});

// ============================================================
// validateDistance
// ============================================================

describe("validateDistance", function () {
  it("should accept zero distance", function () {
    const result = validateDistance(0);

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a positive distance", function () {
    const result = validateDistance(100);

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a decimal distance", function () {
    const result = validateDistance(123.456);

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject a negative distance", function () {
    const result = validateDistance(-1);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject NaN", function () {
    const result = validateDistance(NaN);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject Infinity", function () {
    const result = validateDistance(Infinity);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject numeric strings", function () {
    const result = validateDistance("100");

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// calculateThinPlateSplineBasis
// ============================================================

describe("calculateThinPlateSplineBasis", function () {
  it("should return zero at zero distance", function () {
    const result = calculateThinPlateSplineBasis(0);

    assert.strictEqual(result, 0);
  });

  it("should calculate φ(r) = r² ln(r) correctly for r = 1", function () {
    const result = calculateThinPlateSplineBasis(1);

    approximatelyEqual(result, 0);
  });

  it("should calculate φ(r) correctly for r = 2", function () {
    const result = calculateThinPlateSplineBasis(2);

    const expected = 4 * Math.log(2);

    approximatelyEqual(result, expected);
  });

  it("should calculate φ(r) correctly for r = 10", function () {
    const result = calculateThinPlateSplineBasis(10);

    const expected = 100 * Math.log(10);

    approximatelyEqual(result, expected);
  });

  it("should calculate φ(r) correctly for a decimal distance", function () {
    const distance = 0.5;

    const result = calculateThinPlateSplineBasis(distance);

    const expected = distance * distance * Math.log(distance);

    approximatelyEqual(result, expected);
  });

  it("should return a finite value for a positive finite distance", function () {
    const result = calculateThinPlateSplineBasis(1000);

    assert.ok(Number.isFinite(result));
  });

  it("should reject negative distances", function () {
    const result = calculateThinPlateSplineBasis(-1);

    assert.strictEqual(result, null);
  });

  it("should reject NaN", function () {
    const result = calculateThinPlateSplineBasis(NaN);

    assert.strictEqual(result, null);
  });

  it("should reject Infinity", function () {
    const result = calculateThinPlateSplineBasis(Infinity);

    assert.strictEqual(result, null);
  });

  it("should reject non-numeric values", function () {
    const result = calculateThinPlateSplineBasis("10");

    assert.strictEqual(result, null);
  });
});

// ============================================================
// validateDistanceMatrix
// ============================================================

describe("validateDistanceMatrix", function () {
  it("should accept a valid 1x1 matrix", function () {
    const matrix = [[0]];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 1);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a valid square distance matrix", function () {
    const matrix = [
      [0, 10, 20],
      [10, 0, 15],
      [20, 15, 0],
    ];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 3);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject an empty matrix", function () {
    const result = validateDistanceMatrix([]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-array value", function () {
    const result = validateDistanceMatrix(null);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-square matrix", function () {
    const matrix = [
      [0, 10],
      [10],
    ];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject negative distances", function () {
    const matrix = [
      [0, -10],
      [-10, 0],
    ];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject NaN values", function () {
    const matrix = [
      [0, NaN],
      [NaN, 0],
    ];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject Infinity values", function () {
    const matrix = [
      [0, Infinity],
      [Infinity, 0],
    ];

    const result = validateDistanceMatrix(matrix);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// isSymmetricMatrix
// ============================================================

describe("isSymmetricMatrix", function () {
  it("should identify a symmetric matrix", function () {
    const matrix = [
      [0, 10, 20],
      [10, 0, 15],
      [20, 15, 0],
    ];

    assert.strictEqual(isSymmetricMatrix(matrix), true);
  });

  it("should identify a non-symmetric matrix", function () {
    const matrix = [
      [0, 10],
      [20, 0],
    ];

    assert.strictEqual(isSymmetricMatrix(matrix), false);
  });

  it("should accept a small floating-point difference within tolerance", function () {
    const matrix = [
      [0, 10],
      [10 + 1e-12, 0],
    ];

    assert.strictEqual(isSymmetricMatrix(matrix), true);
  });

  it("should reject a difference larger than tolerance", function () {
    const matrix = [
      [0, 10],
      [10.001, 0],
    ];

    assert.strictEqual(isSymmetricMatrix(matrix), false);
  });

  it("should reject a non-square matrix", function () {
    const matrix = [
      [0, 10],
      [10],
    ];

    assert.strictEqual(isSymmetricMatrix(matrix), false);
  });

  it("should reject a non-array input", function () {
    assert.strictEqual(isSymmetricMatrix(null), false);
  });
});

// ============================================================
// buildSplineBasisMatrix
// ============================================================

describe("buildSplineBasisMatrix", function () {
  it("should build a 1x1 zero matrix from zero distance", function () {
    const distanceMatrix = [[0]];

    const result = buildSplineBasisMatrix(distanceMatrix);

    assert.deepStrictEqual(result, [[0]]);
  });

  it("should build the correct basis matrix", function () {
    const distanceMatrix = [
      [0, 2],
      [2, 0],
    ];

    const result = buildSplineBasisMatrix(distanceMatrix);

    const expectedBasis = 4 * Math.log(2);

    approximatelyEqual(result[0][0], 0);
    approximatelyEqual(result[0][1], expectedBasis);
    approximatelyEqual(result[1][0], expectedBasis);
    approximatelyEqual(result[1][1], 0);
  });

  it("should preserve matrix dimensions", function () {
    const distanceMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const result = buildSplineBasisMatrix(distanceMatrix);

    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].length, 3);
    assert.strictEqual(result[1].length, 3);
    assert.strictEqual(result[2].length, 3);
  });

  it("should produce a symmetric basis matrix for a symmetric distance matrix", function () {
    const distanceMatrix = [
      [0, 2, 5],
      [2, 0, 3],
      [5, 3, 0],
    ];

    const result = buildSplineBasisMatrix(distanceMatrix);

    assert.strictEqual(isSymmetricMatrix(result), true);
  });

  it("should reject an invalid distance matrix", function () {
    const distanceMatrix = [
      [0, -2],
      [-2, 0],
    ];

    const result = buildSplineBasisMatrix(distanceMatrix);

    assert.strictEqual(result, null);
  });

  it("should not mutate the input distance matrix", function () {
    const distanceMatrix = [
      [0, 2, 5],
      [2, 0, 3],
      [5, 3, 0],
    ];

    const original = deepClone(distanceMatrix);

    buildSplineBasisMatrix(distanceMatrix);

    assert.deepStrictEqual(distanceMatrix, original);
  });
});

// ============================================================
// buildTargetSplineBasisVector
// ============================================================

describe("buildTargetSplineBasisVector", function () {
  it("should build a target basis vector", function () {
    const targetDistances = [0, 2, 5];

    const result = buildTargetSplineBasisVector(targetDistances);

    assert.strictEqual(result.length, 3);

    approximatelyEqual(result[0], 0);
    approximatelyEqual(result[1], 4 * Math.log(2));
    approximatelyEqual(result[2], 25 * Math.log(5));
  });

  it("should return zero for a zero target distance", function () {
    const result = buildTargetSplineBasisVector([0]);

    assert.deepStrictEqual(result, [0]);
  });

  it("should reject an empty target-distance array", function () {
    const result = buildTargetSplineBasisVector([]);

    assert.strictEqual(result, null);
  });

  it("should reject invalid target distances", function () {
    const result = buildTargetSplineBasisVector([10, -1, 20]);

    assert.strictEqual(result, null);
  });

  it("should reject NaN target distances", function () {
    const result = buildTargetSplineBasisVector([10, NaN, 20]);

    assert.strictEqual(result, null);
  });

  it("should reject Infinity target distances", function () {
    const result = buildTargetSplineBasisVector([10, Infinity, 20]);

    assert.strictEqual(result, null);
  });

  it("should not mutate the input target-distance vector", function () {
    const targetDistances = [0, 2, 5];
    const original = targetDistances.slice();

    buildTargetSplineBasisVector(targetDistances);

    assert.deepStrictEqual(targetDistances, original);
  });
});

// ============================================================
// isValidSplineBasisValue
// ============================================================

describe("isValidSplineBasisValue", function () {
  it("should accept zero", function () {
    assert.strictEqual(isValidSplineBasisValue(0), true);
  });

  it("should accept positive finite values", function () {
    assert.strictEqual(isValidSplineBasisValue(100.5), true);
  });

  it("should accept negative finite values", function () {
    assert.strictEqual(isValidSplineBasisValue(-100.5), true);
  });

  it("should reject NaN", function () {
    assert.strictEqual(isValidSplineBasisValue(NaN), false);
  });

  it("should reject Infinity", function () {
    assert.strictEqual(isValidSplineBasisValue(Infinity), false);
  });

  it("should reject numeric strings", function () {
    assert.strictEqual(isValidSplineBasisValue("10"), false);
  });
});

// ============================================================
// validateSplineBasisMatrix
// ============================================================

describe("validateSplineBasisMatrix", function () {
  it("should accept a valid spline basis matrix", function () {
    const matrix = [
      [0, 4 * Math.log(2)],
      [4 * Math.log(2), 0],
    ];

    const result = validateSplineBasisMatrix(matrix);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 2);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a 1x1 zero matrix", function () {
    const result = validateSplineBasisMatrix([[0]]);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 1);
  });

  it("should reject an empty matrix", function () {
    const result = validateSplineBasisMatrix([]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-square matrix", function () {
    const result = validateSplineBasisMatrix([
      [0, 1],
      [1],
    ]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-finite basis values", function () {
    const result = validateSplineBasisMatrix([
      [0, Infinity],
      [Infinity, 0],
    ]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject NaN basis values", function () {
    const result = validateSplineBasisMatrix([
      [0, NaN],
      [NaN, 0],
    ]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-numeric basis values", function () {
    const result = validateSplineBasisMatrix([
      [0, "10"],
      ["10", 0],
    ]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// validateSplineBasisVector
// ============================================================

describe("validateSplineBasisVector", function () {
  it("should accept a valid basis vector", function () {
    const vector = [0, 4 * Math.log(2), 25 * Math.log(5)];

    const result = validateSplineBasisVector(vector, 3);

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a zero vector", function () {
    const result = validateSplineBasisVector([0, 0, 0], 3);

    assert.strictEqual(result.valid, true);
  });

  it("should reject an empty vector", function () {
    const result = validateSplineBasisVector([], 0);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-array vector", function () {
    const result = validateSplineBasisVector(null, 3);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an incorrect vector length", function () {
    const result = validateSplineBasisVector([0, 1], 3);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-finite values", function () {
    const result = validateSplineBasisVector([0, Infinity, 2], 3);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject NaN values", function () {
    const result = validateSplineBasisVector([0, NaN, 2], 3);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-numeric values", function () {
    const result = validateSplineBasisVector([0, "10", 2], 3);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// INTEGRATED BASIS CONSISTENCY
// ============================================================

describe("Spline Basis Consistency", function () {
  it("should produce equivalent values through scalar and matrix calculation", function () {
    const distance = 7;

    const scalarValue = calculateThinPlateSplineBasis(distance);

    const matrix = buildSplineBasisMatrix([
      [0, distance],
      [distance, 0],
    ]);

    approximatelyEqual(scalarValue, matrix[0][1]);
    approximatelyEqual(scalarValue, matrix[1][0]);
  });

  it("should produce equivalent values through scalar and target-vector calculation", function () {
    const distances = [1, 2, 3, 4];

    const vector = buildTargetSplineBasisVector(distances);

    distances.forEach((distance, index) => {
      const scalarValue = calculateThinPlateSplineBasis(distance);

      approximatelyEqual(vector[index], scalarValue);
    });
  });

  it("should produce a valid basis matrix from a valid distance matrix", function () {
    const distanceMatrix = [
      [0, 2, 4],
      [2, 0, 3],
      [4, 3, 0],
    ];

    const basisMatrix = buildSplineBasisMatrix(distanceMatrix);

    const validation = validateSplineBasisMatrix(basisMatrix);

    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.size, 3);
  });

  it("should produce a valid target basis vector from valid distances", function () {
    const targetDistances = [2, 4, 6];

    const basisVector = buildTargetSplineBasisVector(targetDistances);

    const validation = validateSplineBasisVector(
      basisVector,
      targetDistances.length,
    );

    assert.strictEqual(validation.valid, true);
  });
});
