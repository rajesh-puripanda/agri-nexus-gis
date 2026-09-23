"use strict";

// ============================================================
// server/services/interpolation/splineInterpolation.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10   Spline Interpolation Engine
// Phase 12.6.3 Explicit TPS Geometric Validation
// Phase 12.6.4 Solver Residual Diagnostics
//
// Method:
//   2-D Thin-Plate Spline
//
// Basis:
//   phi(r) = r^2 * ln(r)
//   phi(0) = 0
//
// Augmented system:
//
//   [ K   P ] [ w ]   [ z ]
//   [ P^T 0 ] [ a ] = [ 0 ]
//
// P = [1, x, y]
//
// Numerical stability:
//   The geographic TPS matrix can contain very different
//   numerical scales between K and P. The system is therefore
//   solved after exact diagonal row/column equilibration.
//
// Residual diagnostics:
//   The final restored solution is evaluated against the
//   original unscaled TPS system:
//
//       r = A x - b
//
//   No arbitrary residual acceptance threshold is applied here.
//   Diagnostics report numerical solution quality only.
//
// ============================================================

const {
  validateCoordinates,
  toLocalCoordinates,
  buildDistanceMatrix,
  buildTargetDistanceVector,
} = require("./spatialDistance");

const {
  validateSplineGeometry,
} = require("./splineGeometry");

const {
  buildSplineBasisMatrix,
  buildTargetSplineBasisVector,
  validateSplineBasisMatrix,
  validateSplineBasisVector,
} = require("./splineBasis");

const {
  buildPolynomialConstraintMatrix,
  buildAugmentedSplineMatrix,
  getSplineSystemDimensions,
  validateCoordinatePoints,
} = require("./splineMatrix");

const {
  solveLinearSystem,
  calculateResidual,
} = require("./linearSystemSolver");

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const MIN_SAMPLE_COUNT = 3;
const POLYNOMIAL_DIMENSION = 3;
const DEFAULT_PIVOT_TOLERANCE = 1e-12;

// ------------------------------------------------------------
// Validation helpers
// ------------------------------------------------------------

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function validateSample(sample, index) {
  const errors = [];

  if (!sample || typeof sample !== "object") {
    errors.push(
      `Sample ${index} must be an object.`,
    );

    return {
      valid: false,
      errors,
    };
  }

  if (
    !isFiniteNumber(sample.latitude) ||
    !isFiniteNumber(sample.longitude)
  ) {
    errors.push(
      `Sample ${index} must contain finite latitude and longitude values.`,
    );
  } else if (
    !validateCoordinates(
      sample.latitude,
      sample.longitude,
    )
  ) {
    errors.push(
      `Sample ${index} contains invalid geographic coordinates.`,
    );
  }

  if (!isFiniteNumber(sample.value)) {
    errors.push(
      `Sample ${index} must contain a finite numeric value.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSamples(samples) {
  const errors = [];

  if (!Array.isArray(samples)) {
    return {
      valid: false,
      errors: ["Samples must be an array."],
    };
  }

  if (samples.length < MIN_SAMPLE_COUNT) {
    errors.push(
      `At least ${MIN_SAMPLE_COUNT} samples are required for 2-D thin-plate spline interpolation.`,
    );
  }

  samples.forEach((sample, index) => {
    const validation =
      validateSample(sample, index);

    errors.push(...validation.errors);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateTarget(target) {
  const errors = [];

  if (!target || typeof target !== "object") {
    return {
      valid: false,
      errors: ["Target must be an object."],
    };
  }

  if (
    !isFiniteNumber(target.latitude) ||
    !isFiniteNumber(target.longitude)
  ) {
    errors.push(
      "Target must contain finite latitude and longitude values.",
    );
  } else if (
    !validateCoordinates(
      target.latitude,
      target.longitude,
    )
  ) {
    errors.push(
      "Target contains invalid geographic coordinates.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ------------------------------------------------------------
// Local coordinates
// ------------------------------------------------------------

function buildLocalCoordinatePoints(
  samples,
  origin,
) {
  return samples.map((sample) =>
    toLocalCoordinates(
      sample.latitude,
      sample.longitude,
      origin.latitude,
      origin.longitude,
    ),
  );
}

function buildLocalTargetCoordinate(
  target,
  origin,
) {
  return toLocalCoordinates(
    target.latitude,
    target.longitude,
    origin.latitude,
    origin.longitude,
  );
}

// ------------------------------------------------------------
// Spline matrix equilibration
// ------------------------------------------------------------

function calculateColumnScales(matrix) {
  if (
    !Array.isArray(matrix) ||
    matrix.length === 0
  ) {
    return null;
  }

  const columnCount =
    matrix[0]?.length;

  if (
    !Number.isInteger(columnCount) ||
    columnCount === 0
  ) {
    return null;
  }

  const scales =
    Array(columnCount).fill(0);

  for (const row of matrix) {
    if (
      !Array.isArray(row) ||
      row.length !== columnCount
    ) {
      return null;
    }

    for (
      let column = 0;
      column < columnCount;
      column += 1
    ) {
      const value = row[column];

      if (!isFiniteNumber(value)) {
        return null;
      }

      scales[column] =
        Math.max(
          scales[column],
          Math.abs(value),
        );
    }
  }

  return scales.every(
    (scale) =>
      isFiniteNumber(scale) &&
      scale > 0,
  )
    ? scales
    : null;
}

function scaleMatrixColumns(
  matrix,
  columnScales,
) {
  if (
    !Array.isArray(matrix) ||
    !Array.isArray(columnScales)
  ) {
    return null;
  }

  return matrix.map((row) =>
    row.map(
      (value, column) =>
        value / columnScales[column],
    ),
  );
}

function calculateRowScales(matrix) {
  if (
    !Array.isArray(matrix) ||
    matrix.length === 0
  ) {
    return null;
  }

  const scales =
    matrix.map((row) => {
      if (
        !Array.isArray(row) ||
        row.length === 0
      ) {
        return 0;
      }

      return Math.max(
        ...row.map((value) =>
          isFiniteNumber(value)
            ? Math.abs(value)
            : NaN,
        ),
      );
    });

  return scales.every(
    (scale) =>
      isFiniteNumber(scale) &&
      scale > 0,
  )
    ? scales
    : null;
}

function scaleMatrixRows(
  matrix,
  rowScales,
) {
  if (
    !Array.isArray(matrix) ||
    !Array.isArray(rowScales) ||
    matrix.length !== rowScales.length
  ) {
    return null;
  }

  return matrix.map(
    (row, rowIndex) =>
      row.map(
        (value) =>
          value / rowScales[rowIndex],
      ),
  );
}

function scaleVectorRows(
  vector,
  rowScales,
) {
  if (
    !Array.isArray(vector) ||
    !Array.isArray(rowScales) ||
    vector.length !== rowScales.length
  ) {
    return null;
  }

  return vector.map(
    (value, rowIndex) =>
      value / rowScales[rowIndex],
  );
}

function restoreColumnScaledSolution(
  solution,
  columnScales,
) {
  if (
    !Array.isArray(solution) ||
    !Array.isArray(columnScales) ||
    solution.length !== columnScales.length
  ) {
    return null;
  }

  return solution.map(
    (value, index) =>
      value / columnScales[index],
  );
}

function equilibrateSplineSystem(
  matrix,
  rightHandSide,
) {
  if (
    !Array.isArray(matrix) ||
    !Array.isArray(rightHandSide) ||
    matrix.length === 0 ||
    matrix.length !== rightHandSide.length
  ) {
    return null;
  }

  const columnScales =
    calculateColumnScales(matrix);

  if (!columnScales) {
    return null;
  }

  const columnScaledMatrix =
    scaleMatrixColumns(
      matrix,
      columnScales,
    );

  if (!columnScaledMatrix) {
    return null;
  }

  const rowScales =
    calculateRowScales(
      columnScaledMatrix,
    );

  if (!rowScales) {
    return null;
  }

  const equilibratedMatrix =
    scaleMatrixRows(
      columnScaledMatrix,
      rowScales,
    );

  const equilibratedRightHandSide =
    scaleVectorRows(
      rightHandSide,
      rowScales,
    );

  if (
    !equilibratedMatrix ||
    !equilibratedRightHandSide
  ) {
    return null;
  }

  return {
    matrix: equilibratedMatrix,
    rightHandSide:
      equilibratedRightHandSide,
    rowScales,
    columnScales,
  };
}

// ------------------------------------------------------------
// Right-hand side
// ------------------------------------------------------------

function buildSplineRightHandSide(samples) {
  return samples
    .map((sample) => sample.value)
    .concat(
      Array(POLYNOMIAL_DIMENSION).fill(0),
    );
}

// ------------------------------------------------------------
// Solution extraction
// ------------------------------------------------------------

function extractSplineSolution(
  solution,
  sampleCount,
) {
  return {
    weights: solution.slice(
      0,
      sampleCount,
    ),

    polynomialCoefficients:
      solution.slice(
        sampleCount,
        sampleCount +
          POLYNOMIAL_DIMENSION,
      ),
  };
}

// ------------------------------------------------------------
// Prediction
// ------------------------------------------------------------

function calculateSplinePrediction(
  weights,
  polynomialCoefficients,
  targetBasisVector,
  targetLocalCoordinates,
) {
  let prediction = 0;

  for (
    let i = 0;
    i < weights.length;
    i += 1
  ) {
    prediction +=
      weights[i] *
      targetBasisVector[i];
  }

  prediction +=
    polynomialCoefficients[0];

  prediction +=
    polynomialCoefficients[1] *
    targetLocalCoordinates.x;

  prediction +=
    polynomialCoefficients[2] *
    targetLocalCoordinates.y;

  return prediction;
}

// ------------------------------------------------------------
// Prediction validation
// ------------------------------------------------------------

function validatePrediction(prediction) {
  if (!isFiniteNumber(prediction)) {
    return {
      valid: false,
      errors: [
        "Spline interpolation produced a non-finite prediction.",
      ],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

// ------------------------------------------------------------
// Solver residual diagnostics
// ------------------------------------------------------------

function calculateSplineResidualDiagnostics(
  augmentedMatrix,
  solution,
  rightHandSide,
) {
  const residual =
    calculateResidual(
      augmentedMatrix,
      solution,
      rightHandSide,
    );

  if (!Array.isArray(residual)) {
    return {
      valid: false,
      error:
        "Unable to calculate spline system residual.",
      residual: null,
      systemSize: null,
      allFinite: false,
      maxAbsoluteResidual: null,
      l1Norm: null,
      l2Norm: null,
      rmsResidual: null,
    };
  }

  const systemSize =
    residual.length;

  if (systemSize === 0) {
    return {
      valid: false,
      error:
        "Spline system residual is empty.",
      residual: [],
      systemSize: 0,
      allFinite: false,
      maxAbsoluteResidual: null,
      l1Norm: null,
      l2Norm: null,
      rmsResidual: null,
    };
  }

  const allFinite =
    residual.every(
      (value) =>
        Number.isFinite(value),
    );

  if (!allFinite) {
    return {
      valid: false,
      error:
        "Spline system residual contains non-finite values.",
      residual,
      systemSize,
      allFinite: false,
      maxAbsoluteResidual: null,
      l1Norm: null,
      l2Norm: null,
      rmsResidual: null,
    };
  }

  let maxAbsoluteResidual = 0;
  let l1Norm = 0;
  let sumSquaredResidual = 0;

  for (
    let index = 0;
    index < residual.length;
    index += 1
  ) {
    const absoluteResidual =
      Math.abs(residual[index]);

    maxAbsoluteResidual =
      Math.max(
        maxAbsoluteResidual,
        absoluteResidual,
      );

    l1Norm +=
      absoluteResidual;

    sumSquaredResidual +=
      residual[index] *
      residual[index];
  }

  const l2Norm =
    Math.sqrt(
      sumSquaredResidual,
    );

  const rmsResidual =
    Math.sqrt(
      sumSquaredResidual /
        systemSize,
    );

  return {
    valid: true,
    error: null,
    residual,
    systemSize,
    allFinite: true,
    maxAbsoluteResidual,
    l1Norm,
    l2Norm,
    rmsResidual,
  };
}

// ------------------------------------------------------------
// Main interpolation function
// ------------------------------------------------------------

function interpolateSpline(
  samples,
  target,
  options = {},
) {
  // ----------------------------------------------------------
  // Validate samples
  // ----------------------------------------------------------

  const sampleValidation =
    validateSamples(samples);

  if (!sampleValidation.valid) {
    return {
      success: false,
      error:
        "Invalid spline interpolation samples.",
      errors:
        sampleValidation.errors,
    };
  }

  // ----------------------------------------------------------
  // Validate target
  // ----------------------------------------------------------

  const targetValidation =
    validateTarget(target);

  if (!targetValidation.valid) {
    return {
      success: false,
      error:
        "Invalid spline interpolation target.",
      errors:
        targetValidation.errors,
    };
  }

  // ----------------------------------------------------------
  // Validate sample geometry
  // ----------------------------------------------------------

  const geometryValidation =
    validateSplineGeometry(samples);

  if (!geometryValidation.valid) {
    const geometryErrors = [];

    switch (
      geometryValidation.reason
    ) {
      case "insufficient_observations":
        geometryErrors.push(
          `Thin-plate spline interpolation requires at least ${MIN_SAMPLE_COUNT} spatial observations.`,
        );
        break;

      case "invalid_coordinates":
        geometryErrors.push(
          `Sample ${geometryValidation.invalidPointIndex} contains invalid geographic coordinates.`,
        );
        break;

      case "duplicate_locations":
        geometryErrors.push(
          "Sample locations contain duplicate spatial coordinates.",
        );
        break;

      case "collinear_points":
        geometryErrors.push(
          "Sample locations are collinear and do not provide two-dimensional spatial rank.",
        );
        break;

      case "invalid_local_coordinates":
        geometryErrors.push(
          "Sample locations could not be converted to valid local metric coordinates.",
        );
        break;

      default:
        geometryErrors.push(
          "Sample geometry is invalid for thin-plate spline interpolation.",
        );
        break;
    }

    return {
      success: false,
      error:
        "Invalid spline interpolation geometry.",
      errors: geometryErrors,
      geometry: geometryValidation,
    };
  }

  // ----------------------------------------------------------
  // Local coordinate system
  // ----------------------------------------------------------

  const origin = {
    latitude:
      samples[0].latitude,
    longitude:
      samples[0].longitude,
  };

  const localPoints =
    buildLocalCoordinatePoints(
      samples,
      origin,
    );

  const localTarget =
    buildLocalTargetCoordinate(
      target,
      origin,
    );

  if (
    !localTarget ||
    !isFiniteNumber(localTarget.x) ||
    !isFiniteNumber(localTarget.y)
  ) {
    return {
      success: false,
      error:
        "Unable to construct local target coordinates.",
      errors: [
        "Target local coordinates are invalid.",
      ],
    };
  }

  const localCoordinateValidation =
    validateCoordinatePoints(
      localPoints,
    );

  if (
    !localCoordinateValidation.valid
  ) {
    return {
      success: false,
      error:
        "Invalid local spline coordinates.",
      errors:
        localCoordinateValidation.errors ??
        [
          "Local spline coordinates are invalid.",
        ],
    };
  }

  // ----------------------------------------------------------
  // Spatial distances
  // ----------------------------------------------------------

  const distanceMatrix =
    buildDistanceMatrix(
      samples.map((sample) => ({
        latitude:
          sample.latitude,
        longitude:
          sample.longitude,
      })),
    );

  const targetDistances =
    buildTargetDistanceVector(
      {
        latitude:
          target.latitude,
        longitude:
          target.longitude,
      },
      samples.map((sample) => ({
        latitude:
          sample.latitude,
        longitude:
          sample.longitude,
      })),
    );

  if (
    !Array.isArray(distanceMatrix) ||
    !Array.isArray(targetDistances)
  ) {
    return {
      success: false,
      error:
        "Unable to construct spline spatial distances.",
      errors: [
        "Spline distance matrix or target distance vector is invalid.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Thin-plate spline basis
  // ----------------------------------------------------------

  const basisMatrix =
    buildSplineBasisMatrix(
      distanceMatrix,
    );

  const targetBasisVector =
    buildTargetSplineBasisVector(
      targetDistances,
    );

  const basisMatrixValidation =
    validateSplineBasisMatrix(
      basisMatrix,
    );

  if (!basisMatrixValidation.valid) {
    return {
      success: false,
      error:
        "Invalid spline basis matrix.",
      errors:
        basisMatrixValidation.errors ??
        [
          "Spline basis matrix validation failed.",
        ],
    };
  }

  const basisVectorValidation =
    validateSplineBasisVector(
      targetBasisVector,
      samples.length,
    );

  if (!basisVectorValidation.valid) {
    return {
      success: false,
      error:
        "Invalid spline target basis vector.",
      errors:
        basisVectorValidation.errors ??
        [
          "Spline target basis vector validation failed.",
        ],
    };
  }

  // ----------------------------------------------------------
  // Polynomial constraint matrix
  // ----------------------------------------------------------

  const polynomialMatrix =
    buildPolynomialConstraintMatrix(
      localPoints,
    );

  if (!Array.isArray(polynomialMatrix)) {
    return {
      success: false,
      error:
        "Unable to construct spline polynomial constraint matrix.",
      errors: [
        "Spline polynomial constraint matrix is invalid.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Augmented TPS system
  // ----------------------------------------------------------

  const augmentedMatrix =
    buildAugmentedSplineMatrix(
      basisMatrix,
      polynomialMatrix,
    );

  if (!Array.isArray(augmentedMatrix)) {
    return {
      success: false,
      error:
        "Unable to construct spline interpolation system.",
      errors: [
        "Augmented thin-plate spline matrix is invalid.",
      ],
    };
  }

  const dimensions =
    getSplineSystemDimensions(
      samples.length,
    );

  if (
    !dimensions ||
    dimensions.systemSize !==
      augmentedMatrix.length
  ) {
    return {
      success: false,
      error:
        "Invalid spline system dimensions.",
      errors: [
        "Augmented spline system dimensions do not match the sample count.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Right-hand side
  // ----------------------------------------------------------

  const rightHandSide =
    buildSplineRightHandSide(
      samples,
    );

  if (
    !Array.isArray(rightHandSide) ||
    rightHandSide.length !==
      dimensions.systemSize
  ) {
    return {
      success: false,
      error:
        "Invalid spline interpolation right-hand side.",
      errors: [
        "Spline right-hand side dimensions do not match the augmented system.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Solver options
  // ----------------------------------------------------------

  const solverOptions = {};

  if (
    options &&
    Object.prototype.hasOwnProperty.call(
      options,
      "pivotTolerance",
    )
  ) {
    solverOptions.pivotTolerance =
      options.pivotTolerance;
  } else {
    solverOptions.pivotTolerance =
      DEFAULT_PIVOT_TOLERANCE;
  }

  // ----------------------------------------------------------
  // Exact matrix equilibration
  // ----------------------------------------------------------

  const equilibratedSystem =
    equilibrateSplineSystem(
      augmentedMatrix,
      rightHandSide,
    );

  if (!equilibratedSystem) {
    return {
      success: false,
      error:
        "Unable to solve spline interpolation system.",
      errors: [
        "Unable to equilibrate spline interpolation system.",
      ],
    };
  }

  // ----------------------------------------------------------
  // Solve equilibrated system
  // ----------------------------------------------------------

  const solutionResult =
    solveLinearSystem(
      equilibratedSystem.matrix,
      equilibratedSystem.rightHandSide,
      solverOptions,
    );

  if (!solutionResult.success) {
    return {
      success: false,
      error:
        "Unable to solve spline interpolation system.",
      errors:
        solutionResult.errors ?? [
          solutionResult.error ??
            "Unknown linear-system error.",
        ],
      solverError:
        solutionResult.error ?? null,
    };
  }

  // ----------------------------------------------------------
  // Restore solution to original coordinates
  // ----------------------------------------------------------

  const restoredSolution =
    restoreColumnScaledSolution(
      solutionResult.solution,
      equilibratedSystem.columnScales,
    );

  if (!restoredSolution) {
    return {
      success: false,
      error:
        "Unable to restore spline interpolation solution.",
      errors: [
        "Scaled spline solution could not be converted back to the original system.",
      ],
      solverError: null,
    };
  }

  // ----------------------------------------------------------
  // Solver residual diagnostics
  //
  // Evaluate against the ORIGINAL, unscaled TPS system.
  // ----------------------------------------------------------

  const residualDiagnostics =
    calculateSplineResidualDiagnostics(
      augmentedMatrix,
      restoredSolution,
      rightHandSide,
    );

  if (!residualDiagnostics.valid) {
    return {
      success: false,
      error:
        "Invalid spline solver residual diagnostics.",
      errors: [
        residualDiagnostics.error ??
          "Unable to validate spline system residual.",
      ],
      solverError: null,
    };
  }

  // ----------------------------------------------------------
  // Extract solution
  // ----------------------------------------------------------

  const {
    weights,
    polynomialCoefficients,
  } =
    extractSplineSolution(
      restoredSolution,
      samples.length,
    );

  // ----------------------------------------------------------
  // Calculate prediction
  // ----------------------------------------------------------

  const prediction =
    calculateSplinePrediction(
      weights,
      polynomialCoefficients,
      targetBasisVector,
      localTarget,
    );

  const predictionValidation =
    validatePrediction(prediction);

  if (!predictionValidation.valid) {
    return {
      success: false,
      error:
        "Invalid spline prediction.",
      errors:
        predictionValidation.errors,
    };
  }

  // ----------------------------------------------------------
  // Scientific result
  // ----------------------------------------------------------

  return {
    success: true,

    method:
      "thin_plate_spline",

    prediction,

    target: {
      latitude:
        target.latitude,
      longitude:
        target.longitude,
    },

    sampleCount:
      samples.length,

    origin: {
      latitude:
        origin.latitude,
      longitude:
        origin.longitude,
    },

    weights,

    polynomialCoefficients,

    diagnostics: {
      basisFunction:
        "r^2 * ln(r)",

      polynomialOrder: 1,

      polynomialDimension:
        POLYNOMIAL_DIMENSION,

      systemSize:
        dimensions.systemSize,

      pivotTolerance:
        solverOptions.pivotTolerance,

      geometry: {
        spatialRank:
          geometryValidation.spatialRank,

        duplicatePairs:
          geometryValidation.duplicatePairs,
      },

      matrixEquilibration: {
        applied: true,
        columnScaling:
          "max_abs",
        rowScaling:
          "max_abs",
      },

      solverResidual: {
        systemSize:
          residualDiagnostics.systemSize,

        residual:
          residualDiagnostics.residual,

        allFinite:
          residualDiagnostics.allFinite,

        maxAbsoluteResidual:
          residualDiagnostics.maxAbsoluteResidual,

        l1Norm:
          residualDiagnostics.l1Norm,

        l2Norm:
          residualDiagnostics.l2Norm,

        rmsResidual:
          residualDiagnostics.rmsResidual,
      },
    },
  };
}

// ------------------------------------------------------------
// Public alias
// ------------------------------------------------------------

const splineInterpolation =
  interpolateSpline;

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  MIN_SAMPLE_COUNT,
  POLYNOMIAL_DIMENSION,
  DEFAULT_PIVOT_TOLERANCE,

  isFiniteNumber,

  validateSample,
  validateSamples,
  validateTarget,

  buildLocalCoordinatePoints,
  buildLocalTargetCoordinate,

  calculateColumnScales,
  scaleMatrixColumns,
  calculateRowScales,
  scaleMatrixRows,
  scaleVectorRows,
  restoreColumnScaledSolution,
  equilibrateSplineSystem,

  buildSplineRightHandSide,
  extractSplineSolution,
  calculateSplinePrediction,
  validatePrediction,

  calculateSplineResidualDiagnostics,

  interpolateSpline,
  splineInterpolation,
};
