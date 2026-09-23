"use strict";

// ============================================================
// server/services/interpolation/krigingMatrix.js
// ============================================================
//
// Soil Analysis GIS
//
// Kriging Matrix Construction
//
// Responsibilities:
//   1. Validate the spatial covariance matrix
//   2. Validate the target covariance vector
//   3. Build the Ordinary Kriging augmented matrix
//   4. Build the Ordinary Kriging right-hand-side vector
//   5. Validate the resulting Kriging system
//
// Ordinary Kriging system:
//
//   [ C   1 ] [ w ]   [ c ]
//   [ 1ᵀ  0 ] [ μ ] = [ 1 ]
//
// where:
//
//   C  = sample-to-sample covariance matrix
//   c  = target-to-sample covariance vector
//   w  = Kriging weights
//   μ  = Lagrange multiplier
//   1  = vector of ones
//
// This module ONLY constructs the mathematical system.
// It does NOT solve the linear system.
//
// The numerical solver will be implemented separately.
//
// ============================================================

// ============================================================
// CONSTANTS
// ============================================================

const AUGMENTED_CONSTRAINT_VALUE = 1;
const LAGRANGE_DIAGONAL_VALUE = 0;

// ============================================================
// BASIC VALIDATION
// ============================================================

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

// ============================================================
// COVARIANCE MATRIX VALIDATION
// ============================================================

function validateCovarianceMatrix(matrix) {
  const errors = [];

  if (!Array.isArray(matrix)) {
    errors.push("Covariance matrix must be an array.");
    return {
      valid: false,
      errors,
      size: 0,
    };
  }

  const size = matrix.length;

  if (size === 0) {
    errors.push("Covariance matrix must not be empty.");

    return {
      valid: false,
      errors,
      size,
    };
  }

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const row = matrix[rowIndex];

    if (!Array.isArray(row)) {
      errors.push(
        `Covariance matrix row ${rowIndex} must be an array.`,
      );
      continue;
    }

    if (row.length !== size) {
      errors.push(
        `Covariance matrix must be square: row ${rowIndex} has ${row.length} columns; expected ${size}.`,
      );
      continue;
    }

    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      const value = row[columnIndex];

      if (!isFiniteNumber(value)) {
        errors.push(
          `Covariance matrix value [${rowIndex}][${columnIndex}] must be finite.`,
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

// ============================================================
// COVARIANCE MATRIX SYMMETRY
// ============================================================

function isSymmetricMatrix(matrix, tolerance = 1e-10) {
  const validation = validateCovarianceMatrix(matrix);

  if (!validation.valid) {
    return false;
  }

  const numericTolerance = Number(tolerance);

  if (
    !Number.isFinite(numericTolerance) ||
    numericTolerance < 0
  ) {
    return false;
  }

  const size = validation.size;

  for (let row = 0; row < size; row += 1) {
    for (let column = row + 1; column < size; column += 1) {
      if (
        Math.abs(
          Number(matrix[row][column]) -
            Number(matrix[column][row]),
        ) > numericTolerance
      ) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================
// TARGET COVARIANCE VECTOR VALIDATION
// ============================================================

function validateTargetCovarianceVector(
  targetCovarianceVector,
  expectedSize,
) {
  const errors = [];

  if (!Array.isArray(targetCovarianceVector)) {
    errors.push(
      "Target covariance vector must be an array.",
    );

    return {
      valid: false,
      errors,
      size: 0,
    };
  }

  const size = targetCovarianceVector.length;

  if (size === 0) {
    errors.push(
      "Target covariance vector must not be empty.",
    );
  }

  if (
    expectedSize !== undefined &&
    Number(size) !== Number(expectedSize)
  ) {
    errors.push(
      `Target covariance vector has ${size} values; expected ${expectedSize}.`,
    );
  }

  for (let index = 0; index < size; index += 1) {
    if (!isFiniteNumber(targetCovarianceVector[index])) {
      errors.push(
        `Target covariance vector value [${index}] must be finite.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    size,
  };
}

// ============================================================
// BUILD ORDINARY KRIGING MATRIX
// ============================================================
//
// Given an NxN covariance matrix:
//
//   C
//
// construct:
//
//   [ C   1 ]
//   [ 1ᵀ  0 ]
//
// For N = 3:
//
//   [ C11 C12 C13 1 ]
//   [ C21 C22 C23 1 ]
//   [ C31 C32 C33 1 ]
//   [  1   1   1  0 ]
//
// ============================================================

function buildOrdinaryKrigingMatrix(
  covarianceMatrix,
) {
  const validation =
    validateCovarianceMatrix(covarianceMatrix);

  if (!validation.valid) {
    return null;
  }

  const size = validation.size;

  const matrix = [];

  for (let row = 0; row < size; row += 1) {
    const newRow = [];

    for (let column = 0; column < size; column += 1) {
      newRow.push(
        Number(covarianceMatrix[row][column]),
      );
    }

    newRow.push(AUGMENTED_CONSTRAINT_VALUE);

    matrix.push(newRow);
  }

  // Final Ordinary Kriging constraint row.
  const constraintRow = [];

  for (let column = 0; column < size; column += 1) {
    constraintRow.push(AUGMENTED_CONSTRAINT_VALUE);
  }

  constraintRow.push(LAGRANGE_DIAGONAL_VALUE);

  matrix.push(constraintRow);

  return matrix;
}

// ============================================================
// BUILD ORDINARY KRIGING RIGHT-HAND SIDE
// ============================================================
//
// Given:
//
//   target covariance vector:
//
//   c = [c1, c2, ..., cn]
//
// construct:
//
//   [ c1 ]
//   [ c2 ]
//   [ .. ]
//   [ cn ]
//   [ 1  ]
//
// ============================================================

function buildOrdinaryKrigingVector(
  targetCovarianceVector,
  expectedSize,
) {
  const validation =
    validateTargetCovarianceVector(
      targetCovarianceVector,
      expectedSize,
    );

  if (!validation.valid) {
    return null;
  }

  return [
    ...targetCovarianceVector.map((value) =>
      Number(value),
    ),
    AUGMENTED_CONSTRAINT_VALUE,
  ];
}

// ============================================================
// BUILD COMPLETE ORDINARY KRIGING SYSTEM
// ============================================================
//
// Returns:
//
//   {
//     matrix: [...],
//     vector: [...],
//     sampleCount: n,
//     systemSize: n + 1
//   }
//
// ============================================================

function buildOrdinaryKrigingSystem(
  covarianceMatrix,
  targetCovarianceVector,
) {
  const matrixValidation =
    validateCovarianceMatrix(covarianceMatrix);

  if (!matrixValidation.valid) {
    return null;
  }

  const vectorValidation =
    validateTargetCovarianceVector(
      targetCovarianceVector,
      matrixValidation.size,
    );

  if (!vectorValidation.valid) {
    return null;
  }

  const matrix =
    buildOrdinaryKrigingMatrix(
      covarianceMatrix,
    );

  const vector =
    buildOrdinaryKrigingVector(
      targetCovarianceVector,
      matrixValidation.size,
    );

  return {
    matrix,
    vector,
    sampleCount: matrixValidation.size,
    systemSize: matrixValidation.size + 1,
  };
}

// ============================================================
// KRIGING SYSTEM STRUCTURE VALIDATION
// ============================================================
//
// Verifies:
//
//   1. Matrix is square
//   2. Matrix dimension = sampleCount + 1
//   3. Last column contains ones
//   4. Last row contains ones
//   5. Bottom-right value is zero
//   6. RHS dimension = sampleCount + 1
//   7. Final RHS value is one
//
// ============================================================

function validateOrdinaryKrigingSystem(
  matrix,
  vector,
  sampleCount,
) {
  const errors = [];

  const numericSampleCount = Number(sampleCount);

  if (
    !Number.isInteger(numericSampleCount) ||
    numericSampleCount <= 0
  ) {
    errors.push(
      "Sample count must be a positive integer.",
    );

    return {
      valid: false,
      errors,
    };
  }

  const expectedSize = numericSampleCount + 1;

  if (!Array.isArray(matrix)) {
    errors.push(
      "Kriging matrix must be an array.",
    );
  } else {
    if (matrix.length !== expectedSize) {
      errors.push(
        `Kriging matrix has ${matrix.length} rows; expected ${expectedSize}.`,
      );
    }

    for (let row = 0; row < matrix.length; row += 1) {
      if (!Array.isArray(matrix[row])) {
        errors.push(
          `Kriging matrix row ${row} must be an array.`,
        );
        continue;
      }

      if (matrix[row].length !== expectedSize) {
        errors.push(
          `Kriging matrix row ${row} has ${matrix[row].length} columns; expected ${expectedSize}.`,
        );
      }

      for (
        let column = 0;
        column < matrix[row].length;
        column += 1
      ) {
        if (!isFiniteNumber(matrix[row][column])) {
          errors.push(
            `Kriging matrix value [${row}][${column}] must be finite.`,
          );
        }
      }
    }

    if (matrix.length === expectedSize) {
      for (let row = 0; row < numericSampleCount; row += 1) {
        if (
          !approximatelyEqual(
            matrix[row][numericSampleCount],
            AUGMENTED_CONSTRAINT_VALUE,
          )
        ) {
          errors.push(
            `Kriging matrix constraint column value [${row}][${numericSampleCount}] must equal 1.`,
          );
        }
      }

      for (
        let column = 0;
        column < numericSampleCount;
        column += 1
      ) {
        if (
          !approximatelyEqual(
            matrix[numericSampleCount][column],
            AUGMENTED_CONSTRAINT_VALUE,
          )
        ) {
          errors.push(
            `Kriging matrix constraint row value [${numericSampleCount}][${column}] must equal 1.`,
          );
        }
      }

      if (
        !approximatelyEqual(
          matrix[numericSampleCount][numericSampleCount],
          LAGRANGE_DIAGONAL_VALUE,
        )
      ) {
        errors.push(
          "Kriging matrix bottom-right value must equal 0.",
        );
      }
    }
  }

  if (!Array.isArray(vector)) {
    errors.push(
      "Kriging right-hand-side vector must be an array.",
    );
  } else {
    if (vector.length !== expectedSize) {
      errors.push(
        `Kriging vector has ${vector.length} values; expected ${expectedSize}.`,
      );
    }

    for (let index = 0; index < vector.length; index += 1) {
      if (!isFiniteNumber(vector[index])) {
        errors.push(
          `Kriging vector value [${index}] must be finite.`,
        );
      }
    }

    if (vector.length === expectedSize) {
      if (
        !approximatelyEqual(
          vector[numericSampleCount],
          AUGMENTED_CONSTRAINT_VALUE,
        )
      ) {
        errors.push(
          "Final Kriging vector value must equal 1.",
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// NUMERICAL COMPARISON
// ============================================================

function approximatelyEqual(
  first,
  second,
  tolerance = 1e-10,
) {
  return (
    isFiniteNumber(first) &&
    isFiniteNumber(second) &&
    Math.abs(Number(first) - Number(second)) <=
      Number(tolerance)
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  AUGMENTED_CONSTRAINT_VALUE,
  LAGRANGE_DIAGONAL_VALUE,

  isFiniteNumber,
  approximatelyEqual,

  validateCovarianceMatrix,
  isSymmetricMatrix,

  validateTargetCovarianceVector,

  buildOrdinaryKrigingMatrix,
  buildOrdinaryKrigingVector,

  buildOrdinaryKrigingSystem,
  validateOrdinaryKrigingSystem,
};
