"use strict";

// ============================================================
// server/services/interpolation/variogram.js
// ============================================================
//
// Soil Analysis GIS
//
// Kriging Scientific Foundation
//
// Responsibilities:
//
//   1. Build an experimental semivariogram
//   2. Group sample pairs into distance lags
//   3. Calculate empirical semivariance
//   4. Evaluate theoretical variogram models
//   5. Validate variogram model parameters
//
// Scientific basis:
//
//   Experimental semivariogram:
//
//       γ(h) = 1 / (2N(h))
//              × Σ [Z(si) - Z(sj)]²
//
//   where:
//
//       h    = separation distance
//       N(h) = number of sample pairs within the lag
//       Z    = measured soil value
//
// Supported theoretical models:
//
//   1. Spherical
//   2. Exponential
//   3. Gaussian
//
// Parameter convention:
//
//   nugget = C₀
//   sill   = C₀ + C
//   range  = a
//
// Distances are expected to be expressed in metres.
//
// ============================================================

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_LAG_COUNT = 12;

const MIN_LAG_COUNT = 2;

const MAX_LAG_COUNT = 100;

const DEFAULT_TOLERANCE_RATIO = 0.5;

const MIN_TOLERANCE_RATIO = 0.01;

const MAX_TOLERANCE_RATIO = 1;

// ============================================================
// SUPPORTED MODELS
// ============================================================

const SUPPORTED_VARIOGRAM_MODELS = {
  spherical: {
    key: "spherical",
    label: "Spherical",
  },

  exponential: {
    key: "exponential",
    label: "Exponential",
  },

  gaussian: {
    key: "gaussian",
    label: "Gaussian",
  },
};

// ============================================================
// NUMERIC HELPER
// ============================================================

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

// ============================================================
// NORMALIZE MODEL
// ============================================================

function normalizeVariogramModel(model) {
  if (
    model === undefined ||
    model === null ||
    model === ""
  ) {
    return null;
  }

  if (typeof model !== "string") {
    return null;
  }

  const normalized = model.trim().toLowerCase();

  return (
    SUPPORTED_VARIOGRAM_MODELS[normalized] ||
    null
  );
}

// ============================================================
// VALIDATE MODEL PARAMETERS
// ============================================================
//
// The model uses:
//
//   nugget >= 0
//   sill   > nugget
//   range  > 0
//
// Here sill represents the total sill:
//
//   sill = nugget + structured variance
//
// ============================================================

function validateVariogramParameters(parameters = {}) {
  const errors = [];

  const nugget = Number(parameters.nugget);

  const sill = Number(parameters.sill);

  const range = Number(parameters.range);

  if (!Number.isFinite(nugget)) {
    errors.push("nugget must be a finite number.");
  } else if (nugget < 0) {
    errors.push("nugget must be greater than or equal to 0.");
  }

  if (!Number.isFinite(sill)) {
    errors.push("sill must be a finite number.");
  } else if (sill <= 0) {
    errors.push("sill must be greater than 0.");
  }

  if (
    Number.isFinite(nugget) &&
    Number.isFinite(sill) &&
    sill <= nugget
  ) {
    errors.push("sill must be greater than nugget.");
  }

  if (!Number.isFinite(range)) {
    errors.push("range must be a finite number.");
  } else if (range <= 0) {
    errors.push("range must be greater than 0.");
  }

  return {
    valid: errors.length === 0,
    errors,
    nugget,
    sill,
    range,
  };
}

// ============================================================
// VALIDATE LAG SETTINGS
// ============================================================

function validateLagSettings(options = {}) {
  const errors = [];

  const lagCount =
    options.lagCount === undefined ||
    options.lagCount === null ||
    options.lagCount === ""
      ? DEFAULT_LAG_COUNT
      : Number(options.lagCount);

  const toleranceRatio =
    options.toleranceRatio === undefined ||
    options.toleranceRatio === null ||
    options.toleranceRatio === ""
      ? DEFAULT_TOLERANCE_RATIO
      : Number(options.toleranceRatio);

  if (!Number.isInteger(lagCount)) {
    errors.push("lagCount must be a whole number.");
  } else if (
    lagCount < MIN_LAG_COUNT ||
    lagCount > MAX_LAG_COUNT
  ) {
    errors.push(
      `lagCount must be between ${MIN_LAG_COUNT} and ${MAX_LAG_COUNT}.`,
    );
  }

  if (!Number.isFinite(toleranceRatio)) {
    errors.push(
      "toleranceRatio must be a finite number.",
    );
  } else if (
    toleranceRatio < MIN_TOLERANCE_RATIO ||
    toleranceRatio > MAX_TOLERANCE_RATIO
  ) {
    errors.push(
      `toleranceRatio must be between ${MIN_TOLERANCE_RATIO} and ${MAX_TOLERANCE_RATIO}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    lagCount,
    toleranceRatio,
  };
}

// ============================================================
// VALIDATE SAMPLE POINT
// ============================================================
//
// Expected:
//
//   {
//     latitude,
//     longitude,
//     value
//   }
//
// Distances are calculated outside this module.
//
// ============================================================

function isValidSamplePoint(point) {
  if (!point || typeof point !== "object") {
    return false;
  }

  return isFiniteNumber(Number(point.latitude)) &&
    isFiniteNumber(Number(point.longitude)) &&
    isFiniteNumber(Number(point.value));
}

// ============================================================
// VALIDATE DISTANCE MATRIX
// ============================================================

function isValidDistanceMatrix(matrix, count) {
  if (!Array.isArray(matrix)) {
    return false;
  }

  if (matrix.length !== count) {
    return false;
  }

  for (const row of matrix) {
    if (!Array.isArray(row)) {
      return false;
    }

    if (row.length !== count) {
      return false;
    }

    for (const distance of row) {
      if (
        distance !== null &&
        !isFiniteNumber(distance)
      ) {
        return false;
      }

      if (
        isFiniteNumber(distance) &&
        distance < 0
      ) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================
// CALCULATE MAXIMUM DISTANCE
// ============================================================

function calculateMaximumDistance(distanceMatrix) {
  if (!Array.isArray(distanceMatrix)) {
    return null;
  }

  let maximum = 0;

  for (const row of distanceMatrix) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const distance of row) {
      if (
        isFiniteNumber(distance) &&
        distance > maximum
      ) {
        maximum = distance;
      }
    }
  }

  return maximum;
}

// ============================================================
// BUILD LAG DEFINITIONS
// ============================================================
//
// The maximum observed pairwise distance is divided into
// equal-width lag classes.
//
// For lagCount = 4:
//
//   0 ───── L₁ ───── L₂ ───── L₃ ───── L₄
//
// Pair distances are assigned to the nearest lag centre within
// the configured tolerance.
//
// ============================================================

function buildLagDefinitions(
  maximumDistance,
  lagCount,
  toleranceRatio = DEFAULT_TOLERANCE_RATIO,
) {
  if (
    !isFiniteNumber(maximumDistance) ||
    maximumDistance <= 0 ||
    !Number.isInteger(lagCount) ||
    lagCount < 1
  ) {
    return [];
  }

  const lagWidth =
    maximumDistance / lagCount;

  const lags = [];

  for (let index = 0; index < lagCount; index += 1) {
    const lagNumber = index + 1;

    const lowerBound =
      index * lagWidth;

    const upperBound =
      (index + 1) * lagWidth;

    const center =
      lowerBound + lagWidth / 2;

    const tolerance =
      lagWidth * toleranceRatio;

    lags.push({
      lagNumber,
      center,
      lowerBound,
      upperBound,
      tolerance,
      pairCount: 0,
      distanceSum: 0,
      semivarianceSum: 0,
    });
  }

  return lags;
}

// ============================================================
// FIND LAG FOR DISTANCE
// ============================================================

function findLagForDistance(
  distance,
  lags,
) {
  if (
    !isFiniteNumber(distance) ||
    !Array.isArray(lags)
  ) {
    return null;
  }

  let bestLag = null;

  let smallestDifference = Infinity;

  for (const lag of lags) {
    const difference =
      Math.abs(distance - lag.center);

    if (difference > lag.tolerance) {
      continue;
    }

    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestLag = lag;
    }
  }

  return bestLag;
}

// ============================================================
// CALCULATE PAIR SEMIVARIANCE
// ============================================================
//
// For two observations:
//
//   γij = 1/2 × (Zi - Zj)²
//
// ============================================================

function calculatePairSemivariance(value1, value2) {
  if (
    !isFiniteNumber(value1) ||
    !isFiniteNumber(value2)
  ) {
    return null;
  }

  const difference = value1 - value2;

  return 0.5 * difference * difference;
}

// ============================================================
// CALCULATE EXPERIMENTAL SEMIVARIOGRAM
// ============================================================
//
// Inputs:
//
//   points
//   distanceMatrix
//
// Output:
//
//   {
//     lagCount,
//     maximumDistance,
//     lags: [
//       {
//         lagNumber,
//         distance,
//         semivariance,
//         pairCount
//       }
//     ]
//   }
//
// Only unique pairs are processed:
//
//   i < j
//
// This prevents double-counting:
//
//   (i,j) and (j,i)
//
// ============================================================

function calculateExperimentalSemivariogram(
  points,
  distanceMatrix,
  options = {},
) {
  if (!Array.isArray(points)) {
    throw new TypeError(
      "points must be an array.",
    );
  }

  if (points.length < 2) {
    throw new Error(
      "At least two sample points are required to calculate an experimental semivariogram.",
    );
  }

  for (const point of points) {
    if (!isValidSamplePoint(point)) {
      throw new Error(
        "All sample points must contain valid latitude, longitude, and value.",
      );
    }
  }

  if (
    !isValidDistanceMatrix(
      distanceMatrix,
      points.length,
    )
  ) {
    throw new Error(
      "distanceMatrix must be a valid square matrix matching the sample count.",
    );
  }

  const lagValidation =
    validateLagSettings(options);

  if (!lagValidation.valid) {
    throw new Error(
      lagValidation.errors.join(" "),
    );
  }

  const {
    lagCount,
    toleranceRatio,
  } = lagValidation;

  const maximumDistance =
    calculateMaximumDistance(
      distanceMatrix,
    );

  if (
    !isFiniteNumber(maximumDistance) ||
    maximumDistance <= 0
  ) {
    throw new Error(
      "At least one positive sample-pair distance is required.",
    );
  }

  const lags = buildLagDefinitions(
    maximumDistance,
    lagCount,
    toleranceRatio,
  );

  for (
    let i = 0;
    i < points.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < points.length;
      j += 1
    ) {
      const distance =
        distanceMatrix[i][j];

      if (
        !isFiniteNumber(distance) ||
        distance <= 0
      ) {
        continue;
      }

      const semivariance =
        calculatePairSemivariance(
          Number(points[i].value),
          Number(points[j].value),
        );

      if (!isFiniteNumber(semivariance)) {
        continue;
      }

      const lag =
        findLagForDistance(
          distance,
          lags,
        );

      if (!lag) {
        continue;
      }

      lag.pairCount += 1;
      lag.distanceSum += distance;
      lag.semivarianceSum += semivariance;
    }
  }

  const resultLags = lags.map((lag) => ({
    lagNumber: lag.lagNumber,

    distance:
      lag.pairCount > 0
        ? lag.distanceSum / lag.pairCount
        : lag.center,

    semivariance:
      lag.pairCount > 0
        ? lag.semivarianceSum /
          lag.pairCount
        : null,

    pairCount: lag.pairCount,

    lowerBound: lag.lowerBound,

    upperBound: lag.upperBound,
  }));

  return {
    lagCount,

    maximumDistance,

    toleranceRatio,

    totalPairCount:
      resultLags.reduce(
        (total, lag) =>
          total + lag.pairCount,
        0,
      ),

    lags: resultLags,
  };
}

// ============================================================
// STRUCTURED VARIANCE
// ============================================================
//
// With:
//
//   sill = nugget + structured variance
//
// therefore:
//
//   C = sill - nugget
//
// ============================================================

function calculateStructuredVariance(
  nugget,
  sill,
) {
  if (
    !isFiniteNumber(nugget) ||
    !isFiniteNumber(sill) ||
    sill < nugget
  ) {
    return null;
  }

  return sill - nugget;
}

// ============================================================
// SPHERICAL VARIOGRAM
// ============================================================
//
// For 0 < h <= a:
//
//   γ(h) = C₀ + C [
//             1.5(h/a)
//             - 0.5(h/a)³
//          ]
//
// For h > a:
//
//   γ(h) = C₀ + C
//
// At h = 0:
//
//   γ(0) = 0
//
// ============================================================

function sphericalVariogram(
  distance,
  nugget,
  sill,
  range,
) {
  if (
    !isFiniteNumber(distance) ||
    distance < 0
  ) {
    return null;
  }

  const validation =
    validateVariogramParameters({
      nugget,
      sill,
      range,
    });

  if (!validation.valid) {
    return null;
  }

  if (distance === 0) {
    return 0;
  }

  const structuredVariance =
    calculateStructuredVariance(
      nugget,
      sill,
    );

  const ratio =
    distance / range;

  if (ratio >= 1) {
    return sill;
  }

  return (
    nugget +
    structuredVariance *
      (
        1.5 * ratio -
        0.5 * Math.pow(ratio, 3)
      )
  );
}

// ============================================================
// EXPONENTIAL VARIOGRAM
// ============================================================
//
// Practical range convention:
//
//   γ(h) = C₀ + C[1 - exp(-3h/a)]
//
// where a represents the practical range at approximately
// 95% of the sill.
//
// ============================================================

function exponentialVariogram(
  distance,
  nugget,
  sill,
  range,
) {
  if (
    !isFiniteNumber(distance) ||
    distance < 0
  ) {
    return null;
  }

  const validation =
    validateVariogramParameters({
      nugget,
      sill,
      range,
    });

  if (!validation.valid) {
    return null;
  }

  if (distance === 0) {
    return 0;
  }

  const structuredVariance =
    calculateStructuredVariance(
      nugget,
      sill,
    );

  return (
    nugget +
    structuredVariance *
      (
        1 -
        Math.exp(
          (-3 * distance) / range,
        )
      )
  );
}

// ============================================================
// GAUSSIAN VARIOGRAM
// ============================================================
//
// Practical range convention:
//
//   γ(h) = C₀ + C[1 - exp(-3(h/a)²)]
//
// ============================================================

function gaussianVariogram(
  distance,
  nugget,
  sill,
  range,
) {
  if (
    !isFiniteNumber(distance) ||
    distance < 0
  ) {
    return null;
  }

  const validation =
    validateVariogramParameters({
      nugget,
      sill,
      range,
    });

  if (!validation.valid) {
    return null;
  }

  if (distance === 0) {
    return 0;
  }

  const structuredVariance =
    calculateStructuredVariance(
      nugget,
      sill,
    );

  const ratio =
    distance / range;

  return (
    nugget +
    structuredVariance *
      (
        1 -
        Math.exp(
          -3 * ratio * ratio,
        )
      )
  );
}

// ============================================================
// EVALUATE THEORETICAL VARIOGRAM
// ============================================================

function evaluateVariogram(
  model,
  distance,
  parameters = {},
) {
  const normalizedModel =
    normalizeVariogramModel(model);

  if (!normalizedModel) {
    return null;
  }

  const {
    nugget,
    sill,
    range,
  } = parameters;

  switch (normalizedModel.key) {
    case "spherical":
      return sphericalVariogram(
        distance,
        nugget,
        sill,
        range,
      );

    case "exponential":
      return exponentialVariogram(
        distance,
        nugget,
        sill,
        range,
      );

    case "gaussian":
      return gaussianVariogram(
        distance,
        nugget,
        sill,
        range,
      );

    default:
      return null;
  }
}

// ============================================================
// EVALUATE MODEL FOR EXPERIMENTAL LAGS
// ============================================================

function evaluateVariogramModel(
  experimental,
  model,
  parameters,
) {
  if (
    !experimental ||
    !Array.isArray(experimental.lags)
  ) {
    return null;
  }

  const normalizedModel =
    normalizeVariogramModel(model);

  if (!normalizedModel) {
    return null;
  }

  const validation =
    validateVariogramParameters(
      parameters,
    );

  if (!validation.valid) {
    return null;
  }

  return {
    model: normalizedModel.key,

    parameters: {
      nugget: validation.nugget,
      sill: validation.sill,
      range: validation.range,
    },

    lags: experimental.lags.map(
      (lag) => ({
        lagNumber: lag.lagNumber,

        distance: lag.distance,

        observedSemivariance:
          lag.semivariance,

        modeledSemivariance:
          evaluateVariogram(
            normalizedModel.key,
            lag.distance,
            validation,
          ),

        pairCount: lag.pairCount,
      }),
    ),
  };
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  DEFAULT_LAG_COUNT,
  MIN_LAG_COUNT,
  MAX_LAG_COUNT,
  DEFAULT_TOLERANCE_RATIO,
  MIN_TOLERANCE_RATIO,
  MAX_TOLERANCE_RATIO,
  SUPPORTED_VARIOGRAM_MODELS,
  isFiniteNumber,
  normalizeVariogramModel,
  validateVariogramParameters,
  validateLagSettings,
  isValidSamplePoint,
  isValidDistanceMatrix,
  calculateMaximumDistance,
  buildLagDefinitions,
  findLagForDistance,
  calculatePairSemivariance,
  calculateExperimentalSemivariogram,
  calculateStructuredVariance,
  sphericalVariogram,
  exponentialVariogram,
  gaussianVariogram,
  evaluateVariogram,
  evaluateVariogramModel,
};