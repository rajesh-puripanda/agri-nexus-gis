"use strict";

// ============================================================
// server/tests/splineMatrix.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Spline Interpolation — Thin-Plate Spline Matrix Tests
//
// Responsibilities:
//   1. Validate coordinate points
//   2. Validate spline basis matrix dimensions
//   3. Build polynomial constraint matrix P
//   4. Build transpose Pᵀ
//   5. Build zero constraint block
//   6. Assemble augmented spline matrix
//   7. Validate augmented matrix
//   8. Validate complete spline-system dimensions
//   9. Verify mathematical block structure
//  10. Verify input immutability
//
// Scientific formulation:
//
//   [ K   P ] [ w ]   [ z ]
//   [ Pᵀ  0 ] [ a ] = [ 0 ]
//
// where:
//
//   K  = thin-plate spline basis matrix
//   P  = [1, x, y]
//   Pᵀ = transpose of P
//   0  = 3 × 3 zero constraint block
//
// This module does NOT:
//   - solve the linear system
//   - calculate distances
//   - calculate spline basis values
//   - perform interpolation
//   - access the database
//
// ============================================================

const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  POLYNOMIAL_DIMENSION,
  ZERO_VALUE,

  isFiniteNumber,

  validateCoordinatePoint,
  validateCoordinatePoints,

  validateBasisMatrixForCoordinates,

  buildPolynomialConstraintMatrix,
  validatePolynomialConstraintMatrix,

  transposeMatrix,

  buildZeroConstraintBlock,

  validateAugmentedSplineMatrix,

  buildAugmentedSplineMatrix,

  buildSplineMatrix,

  getSplineSystemDimensions,
} = require("../services/interpolation/splineMatrix");

// ============================================================
// TEST HELPERS
// ============================================================

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ============================================================
// CONSTANTS
// ============================================================

describe("Spline Matrix Constants", function () {
  it("should define polynomial dimension as three", function () {
    assert.strictEqual(POLYNOMIAL_DIMENSION, 3);
  });

  it("should define zero value as zero", function () {
    assert.strictEqual(ZERO_VALUE, 0);
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
    assert.strictEqual(isFiniteNumber(1.25), true);
    assert.strictEqual(isFiniteNumber(-3.75), true);
  });

  it("should reject NaN", function () {
    assert.strictEqual(isFiniteNumber(NaN), false);
  });

  it("should reject positive Infinity", function () {
    assert.strictEqual(isFiniteNumber(Infinity), false);
  });

  it("should reject negative Infinity", function () {
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
// validateCoordinatePoint
// ============================================================

describe("validateCoordinatePoint", function () {
  it("should accept a valid coordinate point", function () {
    const result = validateCoordinatePoint({
      x: 100,
      y: 200,
    });

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept decimal coordinates", function () {
    const result = validateCoordinatePoint({
      x: 100.25,
      y: -200.75,
    });

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject a missing point", function () {
    const result = validateCoordinatePoint(null);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an array as a point", function () {
    const result = validateCoordinatePoint([100, 200]);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a missing x coordinate", function () {
    const result = validateCoordinatePoint({
      y: 200,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a missing y coordinate", function () {
    const result = validateCoordinatePoint({
      x: 100,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject NaN coordinates", function () {
    const result = validateCoordinatePoint({
      x: NaN,
      y: 200,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject Infinity coordinates", function () {
    const result = validateCoordinatePoint({
      x: Infinity,
      y: 200,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject numeric-string coordinates", function () {
    const result = validateCoordinatePoint({
      x: "100",
      y: "200",
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should include the point index in indexed validation", function () {
    const result = validateCoordinatePoint(
      {
        x: "invalid",
        y: 200,
      },
      4,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.some((error) => error.includes("index 4")),
    );
  });
});

// ============================================================
// validateCoordinatePoints
// ============================================================

describe("validateCoordinatePoints", function () {
  it("should accept one valid coordinate point", function () {
    const result = validateCoordinatePoints([
      {
        x: 0,
        y: 0,
      },
    ]);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 1);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept multiple valid coordinate points", function () {
    const result = validateCoordinatePoints([
      { x: 0, y: 0 },
      { x: 100, y: 200 },
      { x: 300, y: 150 },
    ]);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 3);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject an empty array", function () {
    const result = validateCoordinatePoints([]);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.size, 0);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-array value", function () {
    const result = validateCoordinatePoints(null);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.size, 0);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an invalid point", function () {
    const result = validateCoordinatePoints([
      { x: 0, y: 0 },
      { x: NaN, y: 200 },
    ]);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.size, 2);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// validateBasisMatrixForCoordinates
// ============================================================

describe("validateBasisMatrixForCoordinates", function () {
  it("should accept a matching basis matrix", function () {
    const basisMatrix = [
      [0, 1],
      [1, 0],
    ];

    const result = validateBasisMatrixForCoordinates(
      basisMatrix,
      2,
    );

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 2);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject a basis matrix with the wrong size", function () {
    const basisMatrix = [
      [0, 1],
      [1, 0],
    ];

    const result = validateBasisMatrixForCoordinates(
      basisMatrix,
      3,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an invalid basis matrix", function () {
    const basisMatrix = [
      [0, Infinity],
      [Infinity, 0],
    ];

    const result = validateBasisMatrixForCoordinates(
      basisMatrix,
      2,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// buildPolynomialConstraintMatrix
// ============================================================

describe("buildPolynomialConstraintMatrix", function () {
  it("should build the correct P matrix for one point", function () {
    const points = [
      {
        x: 10,
        y: 20,
      },
    ];

    const result = buildPolynomialConstraintMatrix(points);

    assert.deepStrictEqual(result, [
      [1, 10, 20],
    ]);
  });

  it("should build the correct P matrix for multiple points", function () {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 200 },
      { x: 300, y: 150 },
    ];

    const result = buildPolynomialConstraintMatrix(points);

    assert.deepStrictEqual(result, [
      [1, 0, 0],
      [1, 100, 200],
      [1, 300, 150],
    ]);
  });

  it("should preserve negative coordinates", function () {
    const points = [
      { x: -100, y: -200 },
      { x: 50, y: -75 },
    ];

    const result = buildPolynomialConstraintMatrix(points);

    assert.deepStrictEqual(result, [
      [1, -100, -200],
      [1, 50, -75],
    ]);
  });

  it("should reject invalid coordinate points", function () {
    const result = buildPolynomialConstraintMatrix([
      { x: 0, y: 0 },
      { x: NaN, y: 100 },
    ]);

    assert.strictEqual(result, null);
  });

  it("should reject an empty point array", function () {
    const result = buildPolynomialConstraintMatrix([]);

    assert.strictEqual(result, null);
  });

  it("should not mutate the input points", function () {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];

    const original = deepClone(points);

    buildPolynomialConstraintMatrix(points);

    assert.deepStrictEqual(points, original);
  });
});

// ============================================================
// validatePolynomialConstraintMatrix
// ============================================================

describe("validatePolynomialConstraintMatrix", function () {
  it("should accept a valid P matrix", function () {
    const matrix = [
      [1, 0, 0],
      [1, 100, 200],
      [1, 300, 150],
    ];

    const result = validatePolynomialConstraintMatrix(
      matrix,
      3,
    );

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.rows, 3);
    assert.strictEqual(result.columns, 3);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a single-row P matrix", function () {
    const result = validatePolynomialConstraintMatrix(
      [[1, 10, 20]],
      1,
    );

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.rows, 1);
    assert.strictEqual(result.columns, 3);
  });

  it("should reject an empty matrix", function () {
    const result = validatePolynomialConstraintMatrix([], 0);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-array matrix", function () {
    const result = validatePolynomialConstraintMatrix(
      null,
      3,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a row with the wrong number of columns", function () {
    const result = validatePolynomialConstraintMatrix(
      [
        [1, 0],
        [1, 100, 200],
      ],
      2,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-finite values", function () {
    const result = validatePolynomialConstraintMatrix(
      [
        [1, 0, 0],
        [1, Infinity, 200],
      ],
      2,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an incorrect expected row count", function () {
    const result = validatePolynomialConstraintMatrix(
      [
        [1, 0, 0],
        [1, 100, 200],
      ],
      3,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// transposeMatrix
// ============================================================

describe("transposeMatrix", function () {
  it("should transpose a 2x3 matrix into a 3x2 matrix", function () {
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
    ];

    const result = transposeMatrix(matrix);

    assert.deepStrictEqual(result, [
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it("should transpose the polynomial constraint matrix correctly", function () {
    const matrix = [
      [1, 10, 20],
      [1, 30, 40],
      [1, 50, 60],
    ];

    const result = transposeMatrix(matrix);

    assert.deepStrictEqual(result, [
      [1, 1, 1],
      [10, 30, 50],
      [20, 40, 60],
    ]);
  });

  it("should transpose a square matrix", function () {
    const matrix = [
      [1, 2],
      [3, 4],
    ];

    const result = transposeMatrix(matrix);

    assert.deepStrictEqual(result, [
      [1, 3],
      [2, 4],
    ]);
  });

  it("should return null for an empty matrix", function () {
    assert.strictEqual(transposeMatrix([]), null);
  });

  it("should return null for a non-array value", function () {
    assert.strictEqual(transposeMatrix(null), null);
  });

  it("should reject an irregular matrix", function () {
    const matrix = [
      [1, 2],
      [3],
    ];

    assert.strictEqual(transposeMatrix(matrix), null);
  });

  it("should not mutate the input matrix", function () {
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
    ];

    const original = deepClone(matrix);

    transposeMatrix(matrix);

    assert.deepStrictEqual(matrix, original);
  });
});

// ============================================================
// buildZeroConstraintBlock
// ============================================================

describe("buildZeroConstraintBlock", function () {
  it("should build a 3x3 zero matrix", function () {
    const result = buildZeroConstraintBlock();

    assert.deepStrictEqual(result, [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it("should contain only the defined ZERO_VALUE", function () {
    const result = buildZeroConstraintBlock();

    result.forEach((row) => {
      row.forEach((value) => {
        assert.strictEqual(value, ZERO_VALUE);
      });
    });
  });

  it("should return independent rows", function () {
    const result = buildZeroConstraintBlock();

    result[0][0] = 10;

    assert.strictEqual(result[1][0], 0);
    assert.strictEqual(result[2][0], 0);
  });
});

// ============================================================
// validateAugmentedSplineMatrix
// ============================================================

describe("validateAugmentedSplineMatrix", function () {
  it("should accept a valid 4x4 matrix for one sample", function () {
    const matrix = [
      [0, 1, 2, 1],
      [1, 0, 3, 4],
      [2, 3, 0, 5],
      [1, 4, 5, 0],
    ];

    const result = validateAugmentedSplineMatrix(
      matrix,
      1,
    );

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 4);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should accept a valid 6x6 matrix for three samples", function () {
    const matrix = Array.from(
      { length: 6 },
      () => Array(6).fill(0),
    );

    const result = validateAugmentedSplineMatrix(
      matrix,
      3,
    );

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.size, 6);
    assert.deepStrictEqual(result.errors, []);
  });

  it("should reject an incorrect matrix size", function () {
    const matrix = Array.from(
      { length: 5 },
      () => Array(5).fill(0),
    );

    const result = validateAugmentedSplineMatrix(
      matrix,
      3,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject a non-square matrix", function () {
    const matrix = [
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0],
      [1, 4, 5],
    ];

    const result = validateAugmentedSplineMatrix(
      matrix,
      1,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject non-finite values", function () {
    const matrix = Array.from(
      { length: 4 },
      () => Array(4).fill(0),
    );

    matrix[0][0] = Infinity;

    const result = validateAugmentedSplineMatrix(
      matrix,
      1,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("should reject an invalid sample count", function () {
    const matrix = Array.from(
      { length: 4 },
      () => Array(4).fill(0),
    );

    const result = validateAugmentedSplineMatrix(
      matrix,
      0,
    );

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// buildAugmentedSplineMatrix
// ============================================================

describe("buildAugmentedSplineMatrix", function () {
  it("should assemble the correct 4x4 system for one sample", function () {
    const basisMatrix = [
      [0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(result, [
      [0, 1, 10, 20],
      [1, 0, 0, 0],
      [10, 0, 0, 0],
      [20, 0, 0, 0],
    ]);
  });

  it("should assemble the correct 5x5 system for two samples", function () {
    const basisMatrix = [
      [0, 5],
      [5, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(result, [
      [0, 5, 1, 10, 20],
      [5, 0, 1, 30, 40],
      [1, 1, 0, 0, 0],
      [10, 30, 0, 0, 0],
      [20, 40, 0, 0, 0],
    ]);
  });

  it("should assemble the correct 6x6 system for three samples", function () {
    const basisMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
      [1, 50, 60],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(result, [
      [0, 2, 3, 1, 10, 20],
      [2, 0, 4, 1, 30, 40],
      [3, 4, 0, 1, 50, 60],
      [1, 1, 1, 0, 0, 0],
      [10, 30, 50, 0, 0, 0],
      [20, 40, 60, 0, 0, 0],
    ]);
  });

  it("should preserve the K block exactly", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.strictEqual(result[0][0], 0);
    assert.strictEqual(result[0][1], 2);
    assert.strictEqual(result[1][0], 2);
    assert.strictEqual(result[1][1], 0);
  });

  it("should place P in the top-right block", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(
      result.slice(0, 2).map((row) => row.slice(2)),
      polynomialMatrix,
    );
  });

  it("should place Pᵀ in the bottom-left block", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(
      result.slice(2).map((row) => row.slice(0, 2)),
      [
        [1, 1],
        [10, 30],
        [20, 40],
      ],
    );
  });

  it("should place zeros in the lower-right constraint block", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const result = buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

    assert.deepStrictEqual(
      result.slice(2).map((row) => row.slice(2)),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    );
  });

  it("should return null for an invalid basis matrix", function () {
    const result = buildAugmentedSplineMatrix(
      [
        [0, Infinity],
        [Infinity, 0],
      ],
      [
        [1, 10, 20],
        [1, 30, 40],
      ],
    );

    assert.strictEqual(result, null);
  });

  it("should return null when P has the wrong row count", function () {
    const result = buildAugmentedSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      [
        [1, 10, 20],
      ],
    );

    assert.strictEqual(result, null);
  });

  it("should return null when P has the wrong column count", function () {
    const result = buildAugmentedSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      [
        [1, 10],
        [1, 30],
      ],
    );

    assert.strictEqual(result, null);
  });

  it("should not mutate the basis matrix", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const original = deepClone(basisMatrix);

    buildAugmentedSplineMatrix(
      basisMatrix,
      [
        [1, 10, 20],
        [1, 30, 40],
      ],
    );

    assert.deepStrictEqual(basisMatrix, original);
  });

  it("should not mutate the polynomial matrix", function () {
    const polynomialMatrix = [
      [1, 10, 20],
      [1, 30, 40],
    ];

    const original = deepClone(polynomialMatrix);

    buildAugmentedSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      polynomialMatrix,
    );

    assert.deepStrictEqual(
      polynomialMatrix,
      original,
    );
  });
});

// ============================================================
// buildSplineMatrix
// ============================================================

describe("buildSplineMatrix", function () {
  it("should build the complete spline matrix from basis and points", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];

    const result = buildSplineMatrix(
      basisMatrix,
      points,
    );

    assert.deepStrictEqual(result, [
      [0, 2, 1, 10, 20],
      [2, 0, 1, 30, 40],
      [1, 1, 0, 0, 0],
      [10, 30, 0, 0, 0],
      [20, 40, 0, 0, 0],
    ]);
  });

  it("should build a 6x6 system for three samples", function () {
    const basisMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const result = buildSplineMatrix(
      basisMatrix,
      points,
    );

    assert.strictEqual(result.length, 6);

    result.forEach((row) => {
      assert.strictEqual(row.length, 6);
    });
  });

  it("should reject an invalid point set", function () {
    const result = buildSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      [
        { x: 10, y: 20 },
        { x: NaN, y: 40 },
      ],
    );

    assert.strictEqual(result, null);
  });

  it("should reject a basis matrix whose size does not match the points", function () {
    const result = buildSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ],
    );

    assert.strictEqual(result, null);
  });

  it("should not mutate the input basis matrix", function () {
    const basisMatrix = [
      [0, 2],
      [2, 0],
    ];

    const original = deepClone(basisMatrix);

    buildSplineMatrix(
      basisMatrix,
      [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
    );

    assert.deepStrictEqual(
      basisMatrix,
      original,
    );
  });

  it("should not mutate the input points", function () {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];

    const original = deepClone(points);

    buildSplineMatrix(
      [
        [0, 2],
        [2, 0],
      ],
      points,
    );

    assert.deepStrictEqual(points, original);
  });
});

// ============================================================
// getSplineSystemDimensions
// ============================================================

describe("getSplineSystemDimensions", function () {
  it("should calculate the correct system size for one sample", function () {
    const result = getSplineSystemDimensions(1);

    assert.deepStrictEqual(result, {
      sampleCount: 1,
      polynomialDimension: 3,
      systemSize: 4,
    });
  });

  it("should calculate the correct system size for two samples", function () {
    const result = getSplineSystemDimensions(2);

    assert.deepStrictEqual(result, {
      sampleCount: 2,
      polynomialDimension: 3,
      systemSize: 5,
    });
  });

  it("should calculate the correct system size for three samples", function () {
    const result = getSplineSystemDimensions(3);

    assert.deepStrictEqual(result, {
      sampleCount: 3,
      polynomialDimension: 3,
      systemSize: 6,
    });
  });

  it("should calculate the correct system size for ten samples", function () {
    const result = getSplineSystemDimensions(10);

    assert.deepStrictEqual(result, {
      sampleCount: 10,
      polynomialDimension: 3,
      systemSize: 13,
    });
  });

  it("should reject zero samples", function () {
    assert.strictEqual(
      getSplineSystemDimensions(0),
      null,
    );
  });

  it("should reject negative sample counts", function () {
    assert.strictEqual(
      getSplineSystemDimensions(-1),
      null,
    );
  });

  it("should reject non-integer sample counts", function () {
    assert.strictEqual(
      getSplineSystemDimensions(2.5),
      null,
    );
  });

  it("should reject non-numeric sample counts", function () {
    assert.strictEqual(
      getSplineSystemDimensions("3"),
      null,
    );
  });
});

// ============================================================
// COMPLETE SYSTEM VALIDATION
// ============================================================

describe("Complete Spline Matrix Validation", function () {
  it("should produce an augmented matrix accepted by its validator", function () {
    const basisMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const matrix = buildSplineMatrix(
      basisMatrix,
      points,
    );

    const validation =
      validateAugmentedSplineMatrix(
        matrix,
        points.length,
      );

    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.size, 6);
    assert.deepStrictEqual(validation.errors, []);
  });

  it("should produce the mathematically symmetric augmented system", function () {
    const basisMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const matrix = buildSplineMatrix(
      basisMatrix,
      points,
    );

    for (let row = 0; row < matrix.length; row += 1) {
      for (
        let column = 0;
        column < matrix.length;
        column += 1
      ) {
        assert.strictEqual(
          matrix[row][column],
          matrix[column][row],
          `Matrix is not symmetric at [${row}][${column}]`,
        );
      }
    }
  });

  it("should preserve all polynomial constraints in the assembled system", function () {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const basisMatrix = [
      [0, 2, 3],
      [2, 0, 4],
      [3, 4, 0],
    ];

    const matrix = buildSplineMatrix(
      basisMatrix,
      points,
    );

    const sampleCount = points.length;

    // P block.
    for (let row = 0; row < sampleCount; row += 1) {
      assert.strictEqual(
        matrix[row][sampleCount],
        1,
      );

      assert.strictEqual(
        matrix[row][sampleCount + 1],
        points[row].x,
      );

      assert.strictEqual(
        matrix[row][sampleCount + 2],
        points[row].y,
      );
    }

    // Pᵀ block.
    for (let column = 0; column < sampleCount; column += 1) {
      assert.strictEqual(
        matrix[sampleCount][column],
        1,
      );

      assert.strictEqual(
        matrix[sampleCount + 1][column],
        points[column].x,
      );

      assert.strictEqual(
        matrix[sampleCount + 2][column],
        points[column].y,
      );
    }
  });
});
