"use strict";

// ============================================================
// server/services/interpolation/splineMatrix.js
// ============================================================
//
// Soil Analysis GIS
//
// Spline Interpolation — Thin-Plate Spline Matrix Assembly
//
// Responsibilities:
//   1. Validate spline basis matrices
//   2. Validate sample coordinate arrays
//   3. Build the polynomial constraint matrix P
//   4. Build the transpose Pᵀ
//   5. Build the lower-right zero constraint block
//   6. Assemble the augmented thin-plate spline system
//   7. Validate the resulting augmented matrix
//
// Scientific formulation:
//
//   [ K   P ] [ w ]   [ z ]
//   [ Pᵀ  0 ] [ a ] = [ 0 ]
//
// where:
//
//   K  = thin-plate spline basis matrix
//   P  = [1, x, y] polynomial constraint matrix
//   w  = spline weights
//   a  = polynomial coefficients
//   z  = observed soil values
//
// The polynomial constraints ensure:
//
//   Σ wᵢ       = 0
//   Σ wᵢ xᵢ   = 0
//   Σ wᵢ yᵢ   = 0
//
// Coordinate values supplied to this module must already be in
// a suitable local metric coordinate system, normally metres.
//
// This module does NOT:
//   - solve the linear system
//   - calculate distances
//   - calculate the thin-plate basis
//   - perform interpolation
//   - access the database
//   - perform GIS presentation
//
// ============================================================

const {
  validateSplineBasisMatrix,
  isValidSplineBasisValue,
} = require("./splineBasis");

// ============================================================
// CONSTANTS
// ============================================================

const POLYNOMIAL_DIMENSION = 3;

const ZERO_VALUE = 0;

// ============================================================
// GENERAL VALIDATION HELPERS
// ============================================================

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// ============================================================
// COORDINATE VALIDATION
// ============================================================

function validateCoordinatePoint(point, index = null) {
  const errors = [];

  if (!point || typeof point !== "object" || Array.isArray(point)) {
    errors.push(
      index === null
        ? "Coordinate point must be an object."
        : `Coordinate point at index ${index} must be an object.`,
    );

    return {
      valid: false,
      errors,
    };
  }

  if (!isFiniteNumber(point.x)) {
    errors.push(
      index === null
        ? "Coordinate x must be a finite number."
        : `Coordinate x at index ${index} must be a finite number.`,
    );
  }

  if (!isFiniteNumber(point.y)) {
    errors.push(
      index === null
        ? "Coordinate y must be a finite number."
        : `Coordinate y at index ${index} must be a finite number.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateCoordinatePoints(points) {
  const errors = [];

  if (!Array.isArray(points)) {
    return {
      valid: false,
      errors: ["Coordinate points must be an array."],
      size: 0,
    };
  }

  if (points.length === 0) {
    return {
      valid: false,
      errors: ["Coordinate points array must not be empty."],
      size: 0,
    };
  }

  points.forEach((point, index) => {
    const validation = validateCoordinatePoint(point, index);

    if (!validation.valid) {
      errors.push(...validation.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    size: points.length,
  };
}

// ============================================================
// SPLINE BASIS MATRIX VALIDATION
// ============================================================

function validateBasisMatrixForCoordinates(
  basisMatrix,
  expectedSize,
) {
  const validation = validateSplineBasisMatrix(basisMatrix);

  if (!validation.valid) {
    return validation;
  }

  const errors = [];

  if (validation.size !== expectedSize) {
    errors.push(
      `Spline basis matrix size ${validation.size} does not match coordinate count ${expectedSize}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    size: validation.size,
  };
}

// ============================================================
// POLYNOMIAL CONSTRAINT MATRIX
// ============================================================

/**
 * Build the thin-plate spline polynomial constraint matrix:
 *
 *        [1 x₁ y₁]
 * P  =   [1 x₂ y₂]
 *        [  ...  ]
 *        [1 xₙ yₙ]
 */
function buildPolynomialConstraintMatrix(points) {
  const validation = validateCoordinatePoints(points);

  if (!validation.valid) {
    return null;
  }

  return points.map((point) => [
    1,
    point.x,
    point.y,
  ]);
}

// ============================================================
// POLYNOMIAL CONSTRAINT MATRIX VALIDATION
// ============================================================

function validatePolynomialConstraintMatrix(
  matrix,
  expectedRows = null,
) {
  const errors = [];

  if (!Array.isArray(matrix)) {
    return {
      valid: false,
      errors: ["Polynomial constraint matrix must be an array."],
      rows: 0,
      columns: 0,
    };
  }

  if (matrix.length === 0) {
    return {
      valid: false,
      errors: ["Polynomial constraint matrix must not be empty."],
      rows: 0,
      columns: 0,
    };
  }

  if (expectedRows !== null && matrix.length !== expectedRows) {
    errors.push(
      `Polynomial constraint matrix must have ${expectedRows} rows.`,
    );
  }

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(
        `Polynomial constraint matrix row ${rowIndex} must be an array.`,
      );
      return;
    }

    if (row.length !== POLYNOMIAL_DIMENSION) {
      errors.push(
        `Polynomial constraint matrix row ${rowIndex} must have ${POLYNOMIAL_DIMENSION} columns.`,
      );
      return;
    }

    row.forEach((value, columnIndex) => {
      if (!isFiniteNumber(value)) {
        errors.push(
          `Polynomial constraint matrix value at [${rowIndex}][${columnIndex}] must be finite.`,
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    rows: matrix.length,
    columns:
      matrix.length > 0 && Array.isArray(matrix[0])
        ? matrix[0].length
        : 0,
  };
}

// ============================================================
// MATRIX TRANSPOSE
// ============================================================

function transposeMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return null;
  }

  const columnCount = Array.isArray(matrix[0])
    ? matrix[0].length
    : 0;

  if (columnCount === 0) {
    return null;
  }

  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== columnCount) {
      return null;
    }
  }

  const transposed = Array.from(
    { length: columnCount },
    () => Array(matrix.length),
  );

  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      transposed[column][row] = matrix[row][column];
    }
  }

  return transposed;
}

// ============================================================
// ZERO CONSTRAINT BLOCK
// ============================================================

function buildZeroConstraintBlock() {
  return Array.from(
    { length: POLYNOMIAL_DIMENSION },
    () => Array(POLYNOMIAL_DIMENSION).fill(ZERO_VALUE),
  );
}

// ============================================================
// AUGMENTED MATRIX VALIDATION
// ============================================================

function validateAugmentedSplineMatrix(
  matrix,
  sampleCount,
) {
  const errors = [];

  if (!Number.isInteger(sampleCount) || sampleCount < 1) {
    return {
      valid: false,
      errors: ["Sample count must be a positive integer."],
      size: 0,
    };
  }

  if (!Array.isArray(matrix)) {
    return {
      valid: false,
      errors: ["Augmented spline matrix must be an array."],
      size: 0,
    };
  }

  const expectedSize =
    sampleCount + POLYNOMIAL_DIMENSION;

  if (matrix.length !== expectedSize) {
    errors.push(
      `Augmented spline matrix must have ${expectedSize} rows.`,
    );
  }

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(
        `Augmented spline matrix row ${rowIndex} must be an array.`,
      );
      return;
    }

    if (row.length !== expectedSize) {
      errors.push(
        `Augmented spline matrix row ${rowIndex} must have ${expectedSize} columns.`,
      );
      return;
    }

    row.forEach((value, columnIndex) => {
      if (!isValidSplineBasisValue(value)) {
        errors.push(
          `Augmented spline matrix value at [${rowIndex}][${columnIndex}] must be finite.`,
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    size: expectedSize,
  };
}

// ============================================================
// AUGMENTED MATRIX ASSEMBLY
// ============================================================

/**
 * Assemble:
 *
 *       [ K   P ]
 * A  =  [ Pᵀ  0 ]
 *
 * K is n × n
 * P is n × 3
 * Pᵀ is 3 × n
 * 0 is 3 × 3
 *
 * Result is (n + 3) × (n + 3).
 */
function buildAugmentedSplineMatrix(
  basisMatrix,
  polynomialMatrix,
) {
  if (!Array.isArray(basisMatrix)) {
    return null;
  }

  if (!Array.isArray(polynomialMatrix)) {
    return null;
  }

  const basisRows = basisMatrix.length;

  if (basisRows === 0) {
    return null;
  }

  const basisValidation =
    validateSplineBasisMatrix(basisMatrix);

  if (!basisValidation.valid) {
    return null;
  }

  const polynomialValidation =
    validatePolynomialConstraintMatrix(
      polynomialMatrix,
      basisRows,
    );

  if (!polynomialValidation.valid) {
    return null;
  }

  const polynomialTranspose =
    transposeMatrix(polynomialMatrix);

  if (!polynomialTranspose) {
    return null;
  }

  const zeroBlock = buildZeroConstraintBlock();

  const augmentedSize =
    basisRows + POLYNOMIAL_DIMENSION;

  const augmented = Array.from(
    { length: augmentedSize },
    () => Array(augmentedSize).fill(ZERO_VALUE),
  );

  // ----------------------------------------------------------
  // Top-left block: K
  // ----------------------------------------------------------

  for (let row = 0; row < basisRows; row += 1) {
    for (let column = 0; column < basisRows; column += 1) {
      augmented[row][column] =
        basisMatrix[row][column];
    }
  }

  // ----------------------------------------------------------
  // Top-right block: P
  // ----------------------------------------------------------

  for (let row = 0; row < basisRows; row += 1) {
    for (
      let column = 0;
      column < POLYNOMIAL_DIMENSION;
      column += 1
    ) {
      augmented[row][basisRows + column] =
        polynomialMatrix[row][column];
    }
  }

  // ----------------------------------------------------------
  // Bottom-left block: Pᵀ
  // ----------------------------------------------------------

  for (
    let row = 0;
    row < POLYNOMIAL_DIMENSION;
    row += 1
  ) {
    for (let column = 0; column < basisRows; column += 1) {
      augmented[basisRows + row][column] =
        polynomialTranspose[row][column];
    }
  }

  // ----------------------------------------------------------
  // Bottom-right block: zero
  // ----------------------------------------------------------

  for (
    let row = 0;
    row < POLYNOMIAL_DIMENSION;
    row += 1
  ) {
    for (
      let column = 0;
      column < POLYNOMIAL_DIMENSION;
      column += 1
    ) {
      augmented[basisRows + row][
        basisRows + column
      ] = zeroBlock[row][column];
    }
  }

  return augmented;
}

// ============================================================
// COMPLETE SPLINE SYSTEM BUILDER
// ============================================================

function buildSplineMatrix(
  basisMatrix,
  points,
) {
  const coordinateValidation =
    validateCoordinatePoints(points);

  if (!coordinateValidation.valid) {
    return null;
  }

  const basisValidation =
    validateBasisMatrixForCoordinates(
      basisMatrix,
      coordinateValidation.size,
    );

  if (!basisValidation.valid) {
    return null;
  }

  const polynomialMatrix =
    buildPolynomialConstraintMatrix(points);

  if (!polynomialMatrix) {
    return null;
  }

  return buildAugmentedSplineMatrix(
    basisMatrix,
    polynomialMatrix,
  );
}

// ============================================================
// SYSTEM DIMENSION INFORMATION
// ============================================================

function getSplineSystemDimensions(sampleCount) {
  if (
    !Number.isInteger(sampleCount) ||
    sampleCount < 1
  ) {
    return null;
  }

  return {
    sampleCount,
    polynomialDimension: POLYNOMIAL_DIMENSION,
    systemSize:
      sampleCount + POLYNOMIAL_DIMENSION,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
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
};