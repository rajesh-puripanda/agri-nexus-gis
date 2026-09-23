"use strict";

// ============================================================
// server/services/interpolation/splineBasis.js
// ============================================================
//
// Soil Analysis GIS
//
// Spatial Spline Interpolation
// Thin-Plate Spline Basis
//
// Responsibilities:
//   1. Validate spatial distances
//   2. Evaluate the thin-plate spline radial basis function
//   3. Handle zero-distance evaluation safely
//   4. Validate distance matrices
//   5. Build the spline basis matrix
//   6. Build the target spline basis vector
//
// Scientific basis:
//
//   Thin-plate spline radial basis:
//
//       φ(r) = r² ln(r)
//
//   with:
//
//       φ(0) = 0
//
// The distance r is expressed in metres.
//
// This module does NOT:
//   - solve the spline linear system
//   - build polynomial constraints
//   - perform interpolation
//   - access the database
//   - perform GIS presentation
//
// ============================================================

/* ============================================================
   CONSTANTS
   ============================================================ */

/**
 * Minimum valid spatial distance.
 *
 * Zero is valid because a sample may be evaluated against itself.
 */
const MIN_DISTANCE = 0;

/**
 * Default tolerance used when checking matrix symmetry.
 */
const DEFAULT_SYMMETRY_TOLERANCE = 1e-10;

/* ============================================================
   BASIC VALIDATION
   ============================================================ */

/**
 * Determine whether a value is a finite JavaScript number.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validate a spatial distance.
 *
 * Valid distances must:
 *   - be finite numbers
 *   - be greater than or equal to zero
 *
 * @param {*} distance
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validateDistance(distance) {
  const errors = [];

  if (!isFiniteNumber(distance)) {
    errors.push("Distance must be a finite number.");
    return {
      valid: false,
      errors,
    };
  }

  if (distance < MIN_DISTANCE) {
    errors.push("Distance must be greater than or equal to zero.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================================
   THIN-PLATE SPLINE BASIS
   ============================================================ */

/**
 * Evaluate the thin-plate spline radial basis function.
 *
 * Scientific definition:
 *
 *     φ(r) = r² ln(r)
 *
 * At r = 0, the limiting value is defined as:
 *
 *     φ(0) = 0
 *
 * because:
 *
 *     lim(r→0+) r² ln(r) = 0
 *
 * @param {number} distance
 * @returns {number}
 */
function calculateThinPlateSplineBasis(distance) {
  const validation = validateDistance(distance);

  if (!validation.valid) {
    return null;
  }

  if (distance === 0) {
    return 0;
  }

  const squaredDistance = distance * distance;
  const basisValue = squaredDistance * Math.log(distance);

  return isFiniteNumber(basisValue) ? basisValue : null;
}

/* ============================================================
   MATRIX VALIDATION
   ============================================================ */

/**
 * Validate a square distance matrix.
 *
 * The matrix must:
 *   - be a non-empty array
 *   - be square
 *   - contain finite, non-negative distances
 *
 * @param {*} matrix
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   size: number
 * }}
 */
function validateDistanceMatrix(matrix) {
  const errors = [];

  if (!Array.isArray(matrix) || matrix.length === 0) {
    errors.push("Distance matrix must be a non-empty array.");

    return {
      valid: false,
      errors,
      size: 0,
    };
  }

  const size = matrix.length;

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const row = matrix[rowIndex];

    if (!Array.isArray(row)) {
      errors.push(`Distance matrix row ${rowIndex} must be an array.`);
      continue;
    }

    if (row.length !== size) {
      errors.push(
        `Distance matrix row ${rowIndex} must contain exactly ${size} values.`,
      );
      continue;
    }

    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      const distanceValidation = validateDistance(row[columnIndex]);

      if (!distanceValidation.valid) {
        errors.push(
          `Distance matrix value [${rowIndex}][${columnIndex}] is invalid.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    size,
  };
}

/**
 * Check whether a matrix is symmetric within a numerical tolerance.
 *
 * @param {*} matrix
 * @param {number} tolerance
 * @returns {boolean}
 */
function isSymmetricMatrix(
  matrix,
  tolerance = DEFAULT_SYMMETRY_TOLERANCE,
) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return false;
  }

  if (!isFiniteNumber(tolerance) || tolerance < 0) {
    return false;
  }

  const size = matrix.length;

  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== size) {
      return false;
    }
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = row + 1; column < size; column += 1) {
      const left = matrix[row][column];
      const right = matrix[column][row];

      if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
        return false;
      }

      if (Math.abs(left - right) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

/* ============================================================
   SPLINE BASIS MATRIX
   ============================================================ */

/**
 * Build the thin-plate spline basis matrix from a distance matrix.
 *
 * For sample locations s₁ ... sₙ:
 *
 *     K[i][j] = φ(d(sᵢ,sⱼ))
 *
 * where:
 *
 *     φ(r) = r² ln(r)
 *
 * @param {number[][]} distanceMatrix
 * @returns {number[][]|null}
 */
function buildSplineBasisMatrix(distanceMatrix) {
  const validation = validateDistanceMatrix(distanceMatrix);

  if (!validation.valid) {
    return null;
  }

  const size = validation.size;

  const matrix = Array.from(
    { length: size },
    () => Array(size).fill(0),
  );

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const basisValue = calculateThinPlateSplineBasis(
        distanceMatrix[row][column],
      );

      if (basisValue === null) {
        return null;
      }

      matrix[row][column] = basisValue;
    }
  }

  return matrix;
}

/* ============================================================
   TARGET BASIS VECTOR
   ============================================================ */

/**
 * Build the thin-plate spline basis vector for a prediction target.
 *
 * For target location s₀:
 *
 *     k₀[i] = φ(d(sᵢ,s₀))
 *
 * @param {number[]} targetDistances
 * @returns {number[]|null}
 */
function buildTargetSplineBasisVector(targetDistances) {
  if (!Array.isArray(targetDistances) || targetDistances.length === 0) {
    return null;
  }

  const targetVector = [];

  for (let index = 0; index < targetDistances.length; index += 1) {
    const distance = targetDistances[index];

    const distanceValidation = validateDistance(distance);

    if (!distanceValidation.valid) {
      return null;
    }

    const basisValue = calculateThinPlateSplineBasis(distance);

    if (basisValue === null) {
      return null;
    }

    targetVector.push(basisValue);
  }

  return targetVector;
}

/* ============================================================
   BASIS VALUE VALIDATION
   ============================================================ */

/**
 * Determine whether a value is a valid spline basis value.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isValidSplineBasisValue(value) {
  return isFiniteNumber(value);
}

/**
 * Validate a spline basis matrix.
 *
 * @param {*} matrix
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   size: number
 * }}
 */
function validateSplineBasisMatrix(matrix) {
  const errors = [];

  if (!Array.isArray(matrix) || matrix.length === 0) {
    errors.push("Spline basis matrix must be a non-empty array.");

    return {
      valid: false,
      errors,
      size: 0,
    };
  }

  const size = matrix.length;

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const row = matrix[rowIndex];

    if (!Array.isArray(row) || row.length !== size) {
      errors.push(
        `Spline basis matrix row ${rowIndex} must contain exactly ${size} values.`,
      );
      continue;
    }

    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      if (!isValidSplineBasisValue(row[columnIndex])) {
        errors.push(
          `Spline basis matrix value [${rowIndex}][${columnIndex}] is invalid.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    size,
  };
}

/**
 * Validate a spline target basis vector.
 *
 * @param {*} vector
 * @param {number} expectedSize
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validateSplineBasisVector(vector, expectedSize) {
  const errors = [];

  if (!Array.isArray(vector)) {
    errors.push("Spline basis vector must be an array.");

    return {
      valid: false,
      errors,
    };
  }

  if (
    !Number.isInteger(expectedSize) ||
    expectedSize < 1
  ) {
    errors.push("Expected vector size must be a positive integer.");

    return {
      valid: false,
      errors,
    };
  }

  if (vector.length !== expectedSize) {
    errors.push(
      `Spline basis vector must contain exactly ${expectedSize} values.`,
    );
  }

  for (let index = 0; index < vector.length; index += 1) {
    if (!isValidSplineBasisValue(vector[index])) {
      errors.push(
        `Spline basis vector value at index ${index} is invalid.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
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
};