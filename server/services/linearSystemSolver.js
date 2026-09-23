"use strict";

// ============================================================
// server/services/interpolation/linearSystemSolver.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10 — Linear System Solver
//
// Responsibilities:
//   1. Validate square coefficient matrices
//   2. Validate right-hand-side vectors
//   3. Solve A x = b
//   4. Use Gaussian elimination with partial pivoting
//   5. Detect singular / near-singular systems
//   6. Avoid mutation of caller-provided inputs
//
// Scientific role:
//   This module provides the generic numerical linear-system
//   solver required by Ordinary Kriging:
//
//       [ C   1 ] [ w ]   [ c ]
//       [ 1ᵀ  0 ] [ μ ] = [ 1 ]
//
//   where the Kriging matrix construction is handled separately
//   by krigingMatrix.js.
//
//   This module is deliberately unaware of:
//     - soil parameters
//     - interpolation methods
//     - variograms
//     - covariance models
//     - Kriging constraints
//
//   It solves only the generic mathematical problem:
//
//       A x = b
//
// ============================================================


/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_PIVOT_TOLERANCE = 1e-12;


/* ============================================================
   BASIC NUMERIC VALIDATION
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


/* ============================================================
   MATRIX VALIDATION
   ============================================================ */

/**
 * Validate a square coefficient matrix.
 *
 * @param {*} matrix
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   size: number
 * }}
 */
function validateMatrix(matrix) {
  const errors = [];

  if (!Array.isArray(matrix)) {
    return {
      valid: false,
      errors: ["Matrix must be an array."],
      size: 0,
    };
  }

  if (matrix.length === 0) {
    return {
      valid: false,
      errors: ["Matrix must contain at least one row."],
      size: 0,
    };
  }

  const size = matrix.length;

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const row = matrix[rowIndex];

    if (!Array.isArray(row)) {
      errors.push(`Matrix row ${rowIndex} must be an array.`);
      continue;
    }

    if (row.length !== size) {
      errors.push(
        `Matrix must be square. Row ${rowIndex} has length ${row.length}; expected ${size}.`,
      );
      continue;
    }

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (!isFiniteNumber(row[columnIndex])) {
        errors.push(
          `Matrix value at [${rowIndex}][${columnIndex}] must be a finite number.`,
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


/* ============================================================
   VECTOR VALIDATION
   ============================================================ */

/**
 * Validate a right-hand-side vector.
 *
 * @param {*} vector
 * @param {number} expectedSize
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   size: number
 * }}
 */
function validateVector(vector, expectedSize) {
  const errors = [];

  if (!Array.isArray(vector)) {
    return {
      valid: false,
      errors: ["Vector must be an array."],
      size: 0,
    };
  }

  if (!Number.isInteger(expectedSize) || expectedSize <= 0) {
    return {
      valid: false,
      errors: ["Expected vector size must be a positive integer."],
      size: vector.length,
    };
  }

  if (vector.length !== expectedSize) {
    errors.push(
      `Vector length ${vector.length} does not match expected size ${expectedSize}.`,
    );
  }

  for (let index = 0; index < vector.length; index += 1) {
    if (!isFiniteNumber(vector[index])) {
      errors.push(
        `Vector value at index ${index} must be a finite number.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    size: vector.length,
  };
}


/* ============================================================
   PIVOT TOLERANCE VALIDATION
   ============================================================ */

/**
 * Validate the numerical pivot tolerance.
 *
 * @param {*} tolerance
 * @returns {boolean}
 */
function isValidPivotTolerance(tolerance) {
  return isFiniteNumber(tolerance) && tolerance > 0;
}


/* ============================================================
   MATRIX UTILITIES
   ============================================================ */

/**
 * Create a deep numeric copy of a matrix.
 *
 * The solver must never mutate the caller's matrix.
 *
 * @param {number[][]} matrix
 * @returns {number[][]}
 */
function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}


/**
 * Create a copy of a vector.
 *
 * @param {number[]} vector
 * @returns {number[]}
 */
function cloneVector(vector) {
  return vector.slice();
}


/**
 * Swap two rows in a matrix.
 *
 * @param {number[][]} matrix
 * @param {number} rowA
 * @param {number} rowB
 */
function swapRows(matrix, rowA, rowB) {
  if (rowA === rowB) {
    return;
  }

  const temporary = matrix[rowA];
  matrix[rowA] = matrix[rowB];
  matrix[rowB] = temporary;
}


/**
 * Swap two values in a vector.
 *
 * @param {number[]} vector
 * @param {number} indexA
 * @param {number} indexB
 */
function swapVectorValues(vector, indexA, indexB) {
  if (indexA === indexB) {
    return;
  }

  const temporary = vector[indexA];
  vector[indexA] = vector[indexB];
  vector[indexB] = temporary;
}


/* ============================================================
   NUMERICAL SCALE
   ============================================================ */

/**
 * Calculate the maximum absolute value in a matrix.
 *
 * Used to make singularity detection more meaningful for
 * matrices whose numerical scale is not close to 1.
 *
 * @param {number[][]} matrix
 * @returns {number}
 */
function calculateMatrixScale(matrix) {
  let maximum = 0;

  for (const row of matrix) {
    for (const value of row) {
      maximum = Math.max(maximum, Math.abs(value));
    }
  }

  return maximum;
}


/**
 * Determine whether a pivot is numerically too small.
 *
 * The comparison is scaled according to the matrix magnitude.
 *
 * @param {number} pivot
 * @param {number} matrixScale
 * @param {number} tolerance
 * @returns {boolean}
 */
function isNearlyZero(pivot, matrixScale, tolerance) {
  const scale = Math.max(1, matrixScale);

  return Math.abs(pivot) <= tolerance * scale;
}


/* ============================================================
   LINEAR SYSTEM SOLVER
   ============================================================ */

/**
 * Solve a generic linear system:
 *
 *     A x = b
 *
 * using Gaussian elimination with partial pivoting.
 *
 * Partial pivoting selects the largest available absolute
 * pivot in the current column and swaps that row into the
 * pivot position. This improves numerical stability compared
 * with naive Gaussian elimination.
 *
 * @param {number[][]} matrix
 * @param {number[]} vector
 * @param {object} options
 * @param {number} options.pivotTolerance
 *
 * @returns {{
 *   success: boolean,
 *   solution?: number[],
 *   size?: number,
 *   error?: string,
 *   errors?: string[]
 * }}
 */
function solveLinearSystem(matrix, vector, options = {}) {
  const matrixValidation = validateMatrix(matrix);

  if (!matrixValidation.valid) {
    return {
      success: false,
      error: "Invalid coefficient matrix.",
      errors: matrixValidation.errors,
    };
  }

  const size = matrixValidation.size;

  const vectorValidation = validateVector(vector, size);

  if (!vectorValidation.valid) {
    return {
      success: false,
      error: "Invalid right-hand-side vector.",
      errors: vectorValidation.errors,
    };
  }

  const pivotTolerance =
    options.pivotTolerance ?? DEFAULT_PIVOT_TOLERANCE;

  if (!isValidPivotTolerance(pivotTolerance)) {
    return {
      success: false,
      error: "Invalid pivot tolerance.",
      errors: [
        "Pivot tolerance must be a finite number greater than zero.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Clone inputs so the caller's data is never modified.
  // ----------------------------------------------------------

  const workingMatrix = cloneMatrix(matrix);
  const workingVector = cloneVector(vector);

  const matrixScale = calculateMatrixScale(workingMatrix);

  if (matrixScale === 0) {
    return {
      success: false,
      error: "Singular coefficient matrix.",
      errors: ["The coefficient matrix contains only zeros."],
    };
  }

  // ----------------------------------------------------------
  // Forward elimination
  // ----------------------------------------------------------

  for (let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
    let pivotRow = pivotColumn;
    let largestPivot = Math.abs(
      workingMatrix[pivotColumn][pivotColumn],
    );

    // --------------------------------------------------------
    // Partial pivoting:
    // Find the largest absolute value in the current column.
    // --------------------------------------------------------

    for (
      let candidateRow = pivotColumn + 1;
      candidateRow < size;
      candidateRow += 1
    ) {
      const candidateValue = Math.abs(
        workingMatrix[candidateRow][pivotColumn],
      );

      if (candidateValue > largestPivot) {
        largestPivot = candidateValue;
        pivotRow = candidateRow;
      }
    }

    // --------------------------------------------------------
    // Detect singular / near-singular pivot.
    // --------------------------------------------------------

    if (
      isNearlyZero(
        largestPivot,
        matrixScale,
        pivotTolerance,
      )
    ) {
      return {
        success: false,
        error: "Singular or near-singular coefficient matrix.",
        errors: [
          `Pivot at column ${pivotColumn} is below the numerical tolerance.`,
        ],
      };
    }

    // --------------------------------------------------------
    // Move the best pivot row into position.
    // --------------------------------------------------------

    swapRows(workingMatrix, pivotColumn, pivotRow);
    swapVectorValues(workingVector, pivotColumn, pivotRow);

    const pivotValue =
      workingMatrix[pivotColumn][pivotColumn];

    // --------------------------------------------------------
    // Eliminate values below the pivot.
    // --------------------------------------------------------

    for (
      let row = pivotColumn + 1;
      row < size;
      row += 1
    ) {
      const valueBelowPivot =
        workingMatrix[row][pivotColumn];

      if (valueBelowPivot === 0) {
        continue;
      }

      const eliminationFactor =
        valueBelowPivot / pivotValue;

      workingMatrix[row][pivotColumn] = 0;

      for (
        let column = pivotColumn + 1;
        column < size;
        column += 1
      ) {
        workingMatrix[row][column] -=
          eliminationFactor *
          workingMatrix[pivotColumn][column];
      }

      workingVector[row] -=
        eliminationFactor *
        workingVector[pivotColumn];
    }
  }

  // ----------------------------------------------------------
  // Back substitution
  // ----------------------------------------------------------

  const solution = new Array(size).fill(0);

  for (let row = size - 1; row >= 0; row -= 1) {
    let rightHandSide = workingVector[row];

    for (let column = row + 1; column < size; column += 1) {
      rightHandSide -=
        workingMatrix[row][column] *
        solution[column];
    }

    const diagonal = workingMatrix[row][row];

    if (
      isNearlyZero(
        diagonal,
        matrixScale,
        pivotTolerance,
      )
    ) {
      return {
        success: false,
        error: "Singular or near-singular coefficient matrix.",
        errors: [
          `Back-substitution encountered an unstable diagonal at row ${row}.`,
        ],
      };
    }

    solution[row] = rightHandSide / diagonal;

    if (!isFiniteNumber(solution[row])) {
      return {
        success: false,
        error: "Linear-system solution is not finite.",
        errors: [
          `Solution value at index ${row} is not finite.`,
        ],
      };
    }
  }

  return {
    success: true,
    solution,
    size,
  };
}


/* ============================================================
   RESIDUAL CALCULATION
   ============================================================ */

/**
 * Calculate the residual vector:
 *
 *     r = A x - b
 *
 * This is useful for validating numerical solutions.
 *
 * @param {number[][]} matrix
 * @param {number[]} solution
 * @param {number[]} vector
 * @returns {number[]|null}
 */
function calculateResidual(matrix, solution, vector) {
  const matrixValidation = validateMatrix(matrix);

  if (!matrixValidation.valid) {
    return null;
  }

  const vectorValidation = validateVector(
    solution,
    matrixValidation.size,
  );

  if (!vectorValidation.valid) {
    return null;
  }

  const rightHandSideValidation = validateVector(
    vector,
    matrixValidation.size,
  );

  if (!rightHandSideValidation.valid) {
    return null;
  }

  const residual = new Array(matrixValidation.size).fill(0);

  for (let row = 0; row < matrixValidation.size; row += 1) {
    let calculatedValue = 0;

    for (
      let column = 0;
      column < matrixValidation.size;
      column += 1
    ) {
      calculatedValue +=
        matrix[row][column] *
        solution[column];
    }

    residual[row] = calculatedValue - vector[row];
  }

  return residual;
}


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  DEFAULT_PIVOT_TOLERANCE,

  isFiniteNumber,

  validateMatrix,
  validateVector,
  isValidPivotTolerance,

  cloneMatrix,
  cloneVector,
  swapRows,
  swapVectorValues,

  calculateMatrixScale,
  isNearlyZero,

  solveLinearSystem,

  calculateResidual,
};