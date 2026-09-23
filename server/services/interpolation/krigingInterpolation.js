"use strict";

// ============================================================
// server/services/interpolation/krigingInterpolation.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10 — Ordinary Kriging Interpolation
//
// Responsibilities:
//   1. Validate Kriging sample points
//   2. Build the sample distance matrix
//   3. Build the covariance matrix
//   4. Calculate sample-to-target distances
//   5. Build the target covariance vector
//   6. Construct the Ordinary Kriging linear system
//   7. Solve the system using the generic linear solver
//   8. Extract Kriging weights
//   9. Calculate the interpolated value
//  10. Calculate Kriging diagnostics
//
// Scientific model:
//
//   Ordinary Kriging estimates a value at an unknown location
//   as a weighted linear combination of known observations:
//
//       Z*(x₀) = Σ wᵢ Z(xᵢ)
//
//   subject to the unbiasedness constraint:
//
//       Σ wᵢ = 1
//
//   The weights are obtained from:
//
//       [ C   1 ] [ w ]   [ c ]
//       [ 1ᵀ  0 ] [ μ ] = [ 1 ]
//
//   where:
//
//       C = sample-to-sample covariance matrix
//       c = sample-to-target covariance vector
//       w = Kriging weights
//       μ = Lagrange multiplier
//
// Dependencies:
//   spatialDistance.js
//   covariance.js
//   krigingMatrix.js
//   linearSystemSolver.js
//
// This module deliberately does NOT:
//   - perform database access
//   - perform HTTP/API handling
//   - modify GIS/UI state
//   - implement variogram mathematics
//   - implement covariance mathematics
//   - implement matrix solving
//
// ============================================================


const {
  calculateDistance,
  buildDistanceMatrix,
  buildTargetDistanceVector,
} = require("./spatialDistance");

const {
  validateCovarianceParameters,
  buildCovarianceMatrix,
  buildTargetCovarianceVector,
} = require("./covariance");

const {
  buildOrdinaryKrigingSystem,
  validateOrdinaryKrigingSystem,
} = require("./krigingMatrix");

const {
  solveLinearSystem,
  calculateResidual,
} = require("./linearSystemSolver");

/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_WEIGHT_TOLERANCE = 1e-10;
const DEFAULT_RESIDUAL_TOLERANCE = 1e-8;


/* ============================================================
   BASIC NUMERIC VALIDATION
   ============================================================ */

/**
 * Determine whether a value is a finite number.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}


/**
 * Determine whether a tolerance is valid.
 *
 * @param {*} tolerance
 * @returns {boolean}
 */
function isValidTolerance(tolerance) {
  return isFiniteNumber(tolerance) && tolerance > 0;
}


/* ============================================================
   SAMPLE POINT VALIDATION
   ============================================================ */

/**
 * Validate a single Kriging sample point.
 *
 * A sample point must contain:
 *
 *   latitude
 *   longitude
 *   value
 *
 * @param {*} point
 * @param {number} index
 * @returns {string[]}
 */
function validateSamplePoint(point, index) {
  const errors = [];

  if (!point || typeof point !== "object") {
    return [
      `Sample point ${index} must be an object.`,
    ];
  }

  if (!isFiniteNumber(point.latitude)) {
    errors.push(
      `Sample point ${index} latitude must be a finite number.`,
    );
  }

  if (!isFiniteNumber(point.longitude)) {
    errors.push(
      `Sample point ${index} longitude must be a finite number.`,
    );
  }

  if (!isFiniteNumber(point.value)) {
    errors.push(
      `Sample point ${index} value must be a finite number.`,
    );
  }

  if (
    isFiniteNumber(point.latitude) &&
    (point.latitude < -90 || point.latitude > 90)
  ) {
    errors.push(
      `Sample point ${index} latitude must be between -90 and 90.`,
    );
  }

  if (
    isFiniteNumber(point.longitude) &&
    (point.longitude < -180 || point.longitude > 180)
  ) {
    errors.push(
      `Sample point ${index} longitude must be between -180 and 180.`,
    );
  }

  return errors;
}


/**
 * Validate all Kriging sample points.
 *
 * @param {*} points
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   count: number
 * }}
 */
function validateSamplePoints(points) {
  const errors = [];

  if (!Array.isArray(points)) {
    return {
      valid: false,
      errors: ["Sample points must be an array."],
      count: 0,
    };
  }

  if (points.length < 2) {
    return {
      valid: false,
      errors: [
        "At least two sample points are required for Kriging.",
      ],
      count: points.length,
    };
  }

  for (let index = 0; index < points.length; index += 1) {
    errors.push(
      ...validateSamplePoint(points[index], index),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    count: points.length,
  };
}


/* ============================================================
   TARGET POINT VALIDATION
   ============================================================ */

/**
 * Validate the prediction target.
 *
 * @param {*} target
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
function validateTargetPoint(target) {
  const errors = [];

  if (!target || typeof target !== "object") {
    return {
      valid: false,
      errors: ["Target point must be an object."],
    };
  }

  if (!isFiniteNumber(target.latitude)) {
    errors.push(
      "Target latitude must be a finite number.",
    );
  }

  if (!isFiniteNumber(target.longitude)) {
    errors.push(
      "Target longitude must be a finite number.",
    );
  }

  if (
    isFiniteNumber(target.latitude) &&
    (target.latitude < -90 || target.latitude > 90)
  ) {
    errors.push(
      "Target latitude must be between -90 and 90.",
    );
  }

  if (
    isFiniteNumber(target.longitude) &&
    (target.longitude < -180 || target.longitude > 180)
  ) {
    errors.push(
      "Target longitude must be between -180 and 180.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/* ============================================================
   VALUE EXTRACTION
   ============================================================ */

/**
 * Extract sample values from validated points.
 *
 * @param {Array} points
 * @returns {number[]}
 */
function extractSampleValues(points) {
  return points.map((point) => point.value);
}


/* ============================================================
   KRIGING PREDICTION
   ============================================================ */

/**
 * Calculate an Ordinary Kriging prediction.
 *
 * Required options:
 *
 *   model
 *   nugget
 *   sill
 *   range
 *
 * Example:
 *
 *   {
 *     model: "spherical",
 *     nugget: 0.1,
 *     sill: 1.0,
 *     range: 1000
 *   }
 *
 * @param {Array} points
 * @param {Object} target
 * @param {Object} parameters
 * @param {Object} options
 *
 * @returns {Object}
 */
function interpolateKriging(
  points,
  target,
  parameters = {},
  options = {},
) {
  /* ----------------------------------------------------------
     1. Validate sample points
     ---------------------------------------------------------- */

  const sampleValidation =
    validateSamplePoints(points);

  if (!sampleValidation.valid) {
    return {
      success: false,
      error: "Invalid Kriging sample points.",
      errors: sampleValidation.errors,
    };
  }


  /* ----------------------------------------------------------
     2. Validate target point
     ---------------------------------------------------------- */

  const targetValidation =
    validateTargetPoint(target);

  if (!targetValidation.valid) {
    return {
      success: false,
      error: "Invalid Kriging target point.",
      errors: targetValidation.errors,
    };
  }


  /* ----------------------------------------------------------
     3. Validate covariance parameters
     ---------------------------------------------------------- */

  const covarianceValidation =
    validateCovarianceParameters(parameters);

  if (!covarianceValidation.valid) {
    return {
      success: false,
      error: "Invalid Kriging covariance parameters.",
      errors: covarianceValidation.errors,
    };
  }


  /* ----------------------------------------------------------
     4. Validate numerical options
     ---------------------------------------------------------- */

  const weightTolerance =
    options.weightTolerance ??
    DEFAULT_WEIGHT_TOLERANCE;

  const residualTolerance =
    options.residualTolerance ??
    DEFAULT_RESIDUAL_TOLERANCE;

  const pivotTolerance =
    options.pivotTolerance;

  if (!isValidTolerance(weightTolerance)) {
    return {
      success: false,
      error: "Invalid weight tolerance.",
      errors: [
        "Weight tolerance must be a finite number greater than zero.",
      ],
    };
  }

  if (!isValidTolerance(residualTolerance)) {
    return {
      success: false,
      error: "Invalid residual tolerance.",
      errors: [
        "Residual tolerance must be a finite number greater than zero.",
      ],
    };
  }


  /* ----------------------------------------------------------
     5. Build sample-to-sample distance matrix
     ---------------------------------------------------------- */

  let distanceMatrix;

  try {
    distanceMatrix =
      buildDistanceMatrix(points);
  } catch (error) {
    return {
      success: false,
      error: "Failed to build sample distance matrix.",
      errors: [error.message],
    };
  }


  /* ----------------------------------------------------------
     6. Build covariance matrix
     ---------------------------------------------------------- */

  let covarianceMatrix;

  try {
    covarianceMatrix =
      buildCovarianceMatrix(
        distanceMatrix,
        parameters.model,
        parameters,
      );
  } catch (error) {
    return {
      success: false,
      error: "Failed to build covariance matrix.",
      errors: [error.message],
    };
  }


  /* ----------------------------------------------------------
     7. Build sample-to-target distance vector
     ---------------------------------------------------------- */

  let targetDistances;

  try {
    targetDistances =
  buildTargetDistanceVector(
    target,
    points,
  );
  } catch (error) {
    return {
      success: false,
      error: "Failed to calculate target distances.",
      errors: [error.message],
    };
  }


  /* ----------------------------------------------------------
     8. Build target covariance vector
     ---------------------------------------------------------- */

  let targetCovarianceVector;

  try {
    targetCovarianceVector =
      buildTargetCovarianceVector(
        targetDistances,
        parameters.model,
        parameters,
      );
  } catch (error) {
    return {
      success: false,
      error: "Failed to build target covariance vector.",
      errors: [error.message],
    };
  }


  /* ----------------------------------------------------------
     9. Build Ordinary Kriging system
     ---------------------------------------------------------- */

  let krigingSystem;

  try {
    krigingSystem =
      buildOrdinaryKrigingSystem(
        covarianceMatrix,
        targetCovarianceVector,
      );
  } catch (error) {
    return {
      success: false,
      error: "Failed to construct Ordinary Kriging system.",
      errors: [error.message],
    };
  }


  /* ----------------------------------------------------------
     10. Validate Ordinary Kriging system
     ---------------------------------------------------------- */

  const systemValidation =
    validateOrdinaryKrigingSystem(
      krigingSystem.matrix,
      krigingSystem.vector,
      sampleValidation.count,
    );

  if (!systemValidation.valid) {
    return {
      success: false,
      error: "Invalid Ordinary Kriging system.",
      errors: systemValidation.errors,
    };
  }


  /* ----------------------------------------------------------
     11. Solve the linear system
     ---------------------------------------------------------- */

  const solverOptions = {};

  if (pivotTolerance !== undefined) {
    solverOptions.pivotTolerance =
      pivotTolerance;
  }

  const solutionResult =
    solveLinearSystem(
      krigingSystem.matrix,
      krigingSystem.vector,
      solverOptions,
    );

  if (!solutionResult.success) {
    return {
      success: false,
      error: "Failed to solve Ordinary Kriging system.",
      errors: solutionResult.errors || [
        solutionResult.error,
      ],
      solver: solutionResult,
    };
  }


  /* ----------------------------------------------------------
     12. Extract weights and Lagrange multiplier
     ---------------------------------------------------------- */

  const sampleCount =
    sampleValidation.count;

  const weights =
    solutionResult.solution.slice(
      0,
      sampleCount,
    );

  const lagrangeMultiplier =
    solutionResult.solution[
      sampleCount
    ];


  /* ----------------------------------------------------------
     13. Validate Kriging weights
     ---------------------------------------------------------- */

  const weightSum =
    weights.reduce(
      (sum, weight) => sum + weight,
      0,
    );

  const weightConstraintError =
    weightSum - 1;

  if (
    Math.abs(weightConstraintError) >
    weightTolerance
  ) {
    return {
      success: false,
      error: "Kriging weight constraint was not satisfied.",
      errors: [
        `Weight sum ${weightSum} differs from 1 by ${Math.abs(weightConstraintError)}.`,
      ],
      weights,
      weightSum,
      lagrangeMultiplier,
    };
  }


  /* ----------------------------------------------------------
     14. Calculate interpolated value
     ---------------------------------------------------------- */

  const sampleValues =
    extractSampleValues(points);

  let predictedValue = 0;

  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    predictedValue +=
      weights[index] *
      sampleValues[index];
  }

  if (!isFiniteNumber(predictedValue)) {
    return {
      success: false,
      error: "Kriging prediction is not finite.",
      errors: [
        "The calculated interpolated value is not finite.",
      ],
    };
  }


  /* ----------------------------------------------------------
     15. Calculate covariance-system residual
     ---------------------------------------------------------- */

  const residual = new Array(
    krigingSystem.vector.length,
  ).fill(0);

  for (
    let row = 0;
    row < krigingSystem.matrix.length;
    row += 1
  ) {
    let calculatedValue = 0;

    for (
      let column = 0;
      column < krigingSystem.matrix[row].length;
      column += 1
    ) {
      calculatedValue +=
        krigingSystem.matrix[row][column] *
        solutionResult.solution[column];
    }

    residual[row] =
      calculatedValue -
      krigingSystem.vector[row];
  }

  const maximumResidual =
    residual.reduce(
      (maximum, value) =>
        Math.max(maximum, Math.abs(value)),
      0,
    );

  if (
    maximumResidual >
    residualTolerance
  ) {
    return {
      success: false,
      error: "Kriging system residual exceeds tolerance.",
      errors: [
        `Maximum residual ${maximumResidual} exceeds tolerance ${residualTolerance}.`,
      ],
      weights,
      weightSum,
      lagrangeMultiplier,
      predictedValue,
      residual,
      maximumResidual,
    };
  }


  /* ----------------------------------------------------------
     16. Return complete Kriging result
     ---------------------------------------------------------- */

  return {
    success: true,

    method: "ordinary_kriging",

    predictedValue,

    weights,

    weightSum,

    lagrangeMultiplier,

    sampleCount,

    target: {
      latitude: target.latitude,
      longitude: target.longitude,
    },

    model: parameters.model,

    covarianceParameters: {
      nugget: parameters.nugget,
      sill: parameters.sill,
      range: parameters.range,
    },

    distances: {
      sampleDistanceMatrix: distanceMatrix,
      targetDistances,
    },

    covariance: {
      matrix: covarianceMatrix,
      targetVector: targetCovarianceVector,
    },

    system: {
      matrix: krigingSystem.matrix,
      vector: krigingSystem.vector,
    },

    residual,

    maximumResidual,
  };
}


/* ============================================================
   CONVENIENCE ALIAS
   ============================================================ */

/**
 * Alias for the primary Kriging interpolation function.
 *
 * @param {Array} points
 * @param {Object} target
 * @param {Object} parameters
 * @param {Object} options
 * @returns {Object}
 */
function calculateKrigingPrediction(
  points,
  target,
  parameters = {},
  options = {},
) {
  return interpolateKriging(
    points,
    target,
    parameters,
    options,
  );
}


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  DEFAULT_WEIGHT_TOLERANCE,
  DEFAULT_RESIDUAL_TOLERANCE,

  isFiniteNumber,
  isValidTolerance,

  validateSamplePoint,
  validateSamplePoints,
  validateTargetPoint,

  extractSampleValues,

  interpolateKriging,
  calculateKrigingPrediction,
};
