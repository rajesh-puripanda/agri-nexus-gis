"use strict";

// ============================================================
// server/services/interpolation/covariance.js
// ============================================================
//
// Soil Analysis GIS
//
// Interpolation Scientific Foundation
//
// Covariance Model
//
// Responsibilities:
//   1. Validate covariance/variogram parameters
//   2. Calculate covariance from a variogram model
//   3. Support spherical covariance
//   4. Support exponential covariance
//   5. Support Gaussian covariance
//   6. Build sample-to-sample covariance matrices
//   7. Build target-to-sample covariance vectors
//   8. Provide the spatial covariance structures required by
//      Ordinary Kriging
//
// Scientific relationship:
//
//   C(h) = S - γ(h)
//
// where:
//
//   C(h) = covariance at separation distance h
//   S    = total sill
//   γ(h) = semivariogram value
//
// Under the current variogram convention:
//
//   total sill = nugget + structured variance
//
// Therefore:
//
//   structured variance = sill - nugget
//
// The covariance matrix produced here is intended to be used
// later by the Kriging linear-system solver.
//
// ============================================================

const {
  normalizeVariogramModel,
  validateVariogramParameters,
  evaluateVariogram,
} = require("./variogram");

// ============================================================
// CONSTANTS
// ============================================================

const MIN_DISTANCE = 0;

// ============================================================
// BASIC VALIDATION
// ============================================================

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function validateDistance(distance) {
  const numericDistance = Number(distance);

  return (
    Number.isFinite(numericDistance) &&
    numericDistance >= MIN_DISTANCE
  );
}

function validateCovarianceParameters(parameters = {}) {
  return validateVariogramParameters(parameters);
}

// ============================================================
// MODEL VALIDATION
// ============================================================

function validateCovarianceModel(model) {
  const normalizedModel = normalizeVariogramModel(model);

  return {
    valid: normalizedModel !== null,
    model: normalizedModel,
  };
}

// ============================================================
// COVARIANCE FROM VARIOGRAM
// ============================================================
//
// C(h) = S - γ(h)
//
// At h = 0:
//
//   γ(0) = 0
//   C(0) = S
//
// For models that reach the sill:
//
//   γ(h) → S
//   C(h) → 0
//
// ============================================================

function calculateCovariance(
  distance,
  model,
  parameters = {},
) {
  if (!validateDistance(distance)) {
    return null;
  }

  const validation = validateCovarianceModel(model);

  if (!validation.valid) {
    return null;
  }

  const parameterValidation =
    validateCovarianceParameters(parameters);

  if (!parameterValidation.valid) {
    return null;
  }

  const semivariance = evaluateVariogram(
    validation.model.key,
    Number(distance),
    parameterValidation,
  );

  if (!isFiniteNumber(semivariance)) {
    return null;
  }

  const covariance =
    parameterValidation.sill - Number(semivariance);

  // Numerical protection against extremely small
  // floating-point negative values.
  if (covariance < 0 && covariance > -Number.EPSILON) {
    return 0;
  }

  return covariance;
}

// ============================================================
// SPHERICAL COVARIANCE
// ============================================================

function sphericalCovariance(
  distance,
  nugget,
  sill,
  range,
) {
  return calculateCovariance(
    distance,
    "spherical",
    {
      nugget,
      sill,
      range,
    },
  );
}

// ============================================================
// EXPONENTIAL COVARIANCE
// ============================================================

function exponentialCovariance(
  distance,
  nugget,
  sill,
  range,
) {
  return calculateCovariance(
    distance,
    "exponential",
    {
      nugget,
      sill,
      range,
    },
  );
}

// ============================================================
// GAUSSIAN COVARIANCE
// ============================================================

function gaussianCovariance(
  distance,
  nugget,
  sill,
  range,
) {
  return calculateCovariance(
    distance,
    "gaussian",
    {
      nugget,
      sill,
      range,
    },
  );
}

// ============================================================
// COVARIANCE MATRIX
// ============================================================
//
// Given an NxN distance matrix:
//
//   D[i][j] = distance between sample i and sample j
//
// construct:
//
//   C[i][j] = covariance(D[i][j])
//
// The resulting matrix is symmetric when the distance matrix
// is symmetric.
//
// The diagonal represents zero-distance covariance:
//
//   C[i][i] = sill
//
// This matrix will later form the spatial component of the
// Ordinary Kriging linear system.
//
// ============================================================

function buildCovarianceMatrix(
  distanceMatrix,
  model,
  parameters = {},
) {
  if (!Array.isArray(distanceMatrix)) {
    return null;
  }

  const count = distanceMatrix.length;

  if (count === 0) {
    return [];
  }

  for (const row of distanceMatrix) {
    if (!Array.isArray(row) || row.length !== count) {
      return null;
    }
  }

  const validation = validateCovarianceModel(model);

  if (!validation.valid) {
    return null;
  }

  const parameterValidation =
    validateCovarianceParameters(parameters);

  if (!parameterValidation.valid) {
    return null;
  }

  const matrix = [];

  for (let i = 0; i < count; i += 1) {
    const row = [];

    for (let j = 0; j < count; j += 1) {
      const distance = distanceMatrix[i][j];

      if (!validateDistance(distance)) {
        row.push(null);
        continue;
      }

      row.push(
        calculateCovariance(
          distance,
          validation.model.key,
          parameterValidation,
        ),
      );
    }

    matrix.push(row);
  }

  return matrix;
}

// ============================================================
// TARGET-TO-SAMPLE COVARIANCE VECTOR
// ============================================================
//
// For one prediction location x0:
//
//   c = [
//     C(x0, x1),
//     C(x0, x2),
//     ...
//     C(x0, xn)
//   ]
//
// This vector becomes the right-hand spatial covariance vector
// in the Ordinary Kriging system.
//
// ============================================================

function buildTargetCovarianceVector(
  targetDistances,
  model,
  parameters = {},
) {
  if (!Array.isArray(targetDistances)) {
    return null;
  }

  const validation = validateCovarianceModel(model);

  if (!validation.valid) {
    return null;
  }

  const parameterValidation =
    validateCovarianceParameters(parameters);

  if (!parameterValidation.valid) {
    return null;
  }

  return targetDistances.map((distance) => {
    if (!validateDistance(distance)) {
      return null;
    }

    return calculateCovariance(
      distance,
      validation.model.key,
      parameterValidation,
    );
  });
}

// ============================================================
// COVARIANCE MATRIX SYMMETRY CHECK
// ============================================================
//
// Useful for validating the spatial relationship matrix before
// it is supplied to the Kriging solver.
//
// ============================================================

function isSymmetricMatrix(matrix, tolerance = 1e-10) {
  if (!Array.isArray(matrix)) {
    return false;
  }

  const count = matrix.length;

  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== count) {
      return false;
    }
  }

  const numericTolerance = Number(tolerance);

  if (
    !Number.isFinite(numericTolerance) ||
    numericTolerance < 0
  ) {
    return false;
  }

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const first = matrix[i][j];
      const second = matrix[j][i];

      if (
        !isFiniteNumber(first) ||
        !isFiniteNumber(second)
      ) {
        return false;
      }

      if (
        Math.abs(Number(first) - Number(second)) >
        numericTolerance
      ) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================
// COVARIANCE RANGE CHECK
// ============================================================
//
// Covariance should not exceed the total sill under the
// supported variogram models.
//
// ============================================================

function isValidCovarianceValue(
  covariance,
  sill,
  tolerance = 1e-10,
) {
  const numericCovariance = Number(covariance);
  const numericSill = Number(sill);
  const numericTolerance = Number(tolerance);

  if (
    !Number.isFinite(numericCovariance) ||
    !Number.isFinite(numericSill) ||
    !Number.isFinite(numericTolerance) ||
    numericTolerance < 0
  ) {
    return false;
  }

  return (
    numericCovariance >= -numericTolerance &&
    numericCovariance <= numericSill + numericTolerance
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  MIN_DISTANCE,

  isFiniteNumber,
  validateDistance,
  validateCovarianceParameters,
  validateCovarianceModel,

  calculateCovariance,

  sphericalCovariance,
  exponentialCovariance,
  gaussianCovariance,

  buildCovarianceMatrix,
  buildTargetCovarianceVector,

  isSymmetricMatrix,
  isValidCovarianceValue,
};