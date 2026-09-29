"use strict";

// ============================================================
// server/services/hotspotAnalysisService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.4 — Hotspot Analysis
//
// Responsibility:
//   - Calculate Getis-Ord Gi* for one selected soil parameter
//   - Use fixed-radius binary spatial weights
//   - Reuse authoritative normalized soil-analysis values
//   - Reuse the established spatial-distance authority
//   - Preserve parameter units
//
// Does NOT:
//   - Reproduce soil measurement validation
//   - Reproduce soil classifications
//   - Calculate fertility
//   - Classify hotspots/coldspots
//   - Produce agricultural recommendations
//   - Produce risk scores
//   - Perform prediction
//   - Perform interpolation
//   - Reuse Kriging mathematics
//
// ============================================================

const {
  calculatePointDistance,
} = require("./interpolation/spatialDistance");

const {
  validateHotspotAnalysisResult,
} = require("../scientific/statistics/hotspotAnalysisResultContract");

const PARAMETER_DEFINITIONS = {
  pH: {
    sourceKey: "pH",
    unit: "pH",
  },

  nitrogen: {
    sourceKey: "nitrogen",
    unit: "kg/ha",
  },

  phosphorus: {
    sourceKey: "phosphorus",
    unit: "kg/ha",
  },

  potassium: {
    sourceKey: "potassium",
    unit: "kg/ha",
  },

  organicCarbon: {
    sourceKey: "organicCarbon",
    unit: "%",
  },

  electricalConductivity: {
    sourceKey: "electricalConductivity",
    unit: "dS/m",
  },
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameter(parameter) {
  if (typeof parameter !== "string" || !parameter.trim()) {
    throw new Error("Hotspot analysis parameter is required");
  }

  if (!PARAMETER_DEFINITIONS[parameter]) {
    throw new Error(
      `Unsupported hotspot analysis parameter: ${parameter}`,
    );
  }

  return true;
}

function validateRadius(radiusMetres) {
  if (
    !isFiniteNumber(radiusMetres) ||
    radiusMetres <= 0
  ) {
    throw new Error(
      "Hotspot analysis radiusMetres must be positive and finite",
    );
  }

  return true;
}

// ============================================================
// AUTHORITATIVE OBSERVATION EXTRACTION
// ============================================================

function extractValidObservations(
  observations,
  parameter,
) {
  if (!Array.isArray(observations)) {
    throw new Error(
      "Hotspot analysis observations must be an array",
    );
  }

  validateParameter(parameter);

  const definition = PARAMETER_DEFINITIONS[parameter];
  const seenIds = new Set();

  return observations
    .map((observation) => {
      if (
        !observation ||
        typeof observation !== "object"
      ) {
        return null;
      }

      if (
        typeof observation.observationId !== "string" ||
        !observation.observationId.trim()
      ) {
        return null;
      }

      if (seenIds.has(observation.observationId)) {
        throw new Error(
          `Duplicate hotspot observation: ${observation.observationId}`,
        );
      }

      if (
        !isFiniteNumber(observation.latitude) ||
        !isFiniteNumber(observation.longitude)
      ) {
        return null;
      }

      const parameterValue =
        observation.values?.[definition.sourceKey];

      if (
        !parameterValue ||
        typeof parameterValue !== "object" ||
        !isFiniteNumber(parameterValue.value)
      ) {
        return null;
      }

      seenIds.add(observation.observationId);

      return {
        observationId: observation.observationId,
        latitude: observation.latitude,
        longitude: observation.longitude,
        value: parameterValue.value,
      };
    })
    .filter(Boolean);
}

// ============================================================
// SPATIAL WEIGHTS
// ============================================================
//
// Fixed-radius binary spatial weights:
//
//   w_ij = 1 when distance(i,j) <= radius
//   w_ij = 0 otherwise
//
// Self-observation is included:
//
//   w_ii = 1
//
// ============================================================

function buildSpatialWeights(
  observations,
  radiusMetres,
) {
  if (!Array.isArray(observations)) {
    throw new Error(
      "Hotspot spatial observations must be an array",
    );
  }

  validateRadius(radiusMetres);

  return observations.map((observation, index) => {
    const weights = observations.map(
      (candidate) => {
        const distance = calculatePointDistance(
          observation,
          candidate,
        );

        return distance <= radiusMetres ? 1 : 0;
      },
    );

    return {
      index,
      weights,
      neighborCount: weights.reduce(
        (sum, weight) => sum + weight,
        0,
      ),
    };
  });
}

// ============================================================
// GETIS-ORD GI*
// ============================================================

function calculateGiStar(
  values,
  weights,
  mean,
  standardDeviation,
) {
  if (!Array.isArray(values)) {
    throw new Error(
      "Hotspot values must be an array",
    );
  }

  if (!Array.isArray(weights)) {
    throw new Error(
      "Hotspot weights must be an array",
    );
  }

  if (values.length !== weights.length) {
    throw new Error(
      "Hotspot values and weights must have equal length",
    );
  }

  if (!isFiniteNumber(mean)) {
    throw new Error("Hotspot mean must be finite");
  }

  if (
    !isFiniteNumber(standardDeviation) ||
    standardDeviation <= 0
  ) {
    throw new Error(
      "Hotspot standard deviation must be positive and finite",
    );
  }

  const n = values.length;

  if (n <= 1) {
    return null;
  }

  let weightedSum = 0;
  let weightSum = 0;
  let squaredWeightSum = 0;

  for (let index = 0; index < n; index += 1) {
    const weight = weights[index];

    weightedSum += weight * values[index];
    weightSum += weight;
    squaredWeightSum += weight ** 2;
  }

  const numerator =
    weightedSum - mean * weightSum;

  const weightTerm =
    (n * squaredWeightSum -
      weightSum ** 2) /
    (n - 1);

  if (
    !isFiniteNumber(weightTerm) ||
    weightTerm <= 0
  ) {
    return null;
  }

  const denominator =
    standardDeviation *
    Math.sqrt(weightTerm);

  if (
    !isFiniteNumber(denominator) ||
    denominator === 0
  ) {
    return null;
  }

  const giStar = numerator / denominator;

  if (!isFiniteNumber(giStar)) {
    return null;
  }

  return giStar;
}

// ============================================================
// POPULATION STATISTICS
// ============================================================

function calculatePopulationStatistics(values) {
  if (!Array.isArray(values)) {
    throw new Error(
      "Hotspot statistical values must be an array",
    );
  }

  if (values.length < 2) {
    throw new Error(
      "Hotspot analysis requires at least two valid observations",
    );
  }

  const mean =
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length;

  const variance =
    values.reduce(
      (sum, value) =>
        sum + (value - mean) ** 2,
      0,
    ) / values.length;

  const standardDeviation =
    Math.sqrt(variance);

  if (
    !isFiniteNumber(mean) ||
    !isFiniteNumber(standardDeviation) ||
    standardDeviation === 0
  ) {
    throw new Error(
      "Hotspot analysis requires non-zero population variance",
    );
  }

  return {
    mean,
    standardDeviation,
  };
}

// ============================================================
// RESULT BUILDER
// ============================================================

function buildHotspotAnalysisResult(
  observations,
  parameter,
  radiusMetres,
  options = {},
) {
  validateParameter(parameter);
  validateRadius(radiusMetres);

  if (
    options === null ||
    typeof options !== "object"
  ) {
    throw new Error(
      "Hotspot analysis options must be an object",
    );
  }

  const validObservations =
    extractValidObservations(
      observations,
      parameter,
    );

  if (validObservations.length < 2) {
    throw new Error(
      "Hotspot analysis requires at least two valid observations",
    );
  }

  const values =
    validObservations.map(
      (observation) => observation.value,
    );

  const {
    mean,
    standardDeviation,
  } = calculatePopulationStatistics(values);

  const spatialWeights =
    buildSpatialWeights(
      validObservations,
      radiusMetres,
    );

  const analyzedObservations = [];

  for (
    let index = 0;
    index < validObservations.length;
    index += 1
  ) {
    const observation =
      validObservations[index];

    const weightResult =
      spatialWeights[index];

    const giStar = calculateGiStar(
      values,
      weightResult.weights,
      mean,
      standardDeviation,
    );

    if (giStar === null) {
      continue;
    }

    analyzedObservations.push({
      observationId:
        observation.observationId,

      latitude:
        observation.latitude,

      longitude:
        observation.longitude,

      value:
        observation.value,

      neighborCount:
        weightResult.neighborCount,

      giStar,
    });
  }

  if (analyzedObservations.length === 0) {
    throw new Error(
      "Hotspot analysis produced no finite Gi* observations",
    );
  }

  const definition =
    PARAMETER_DEFINITIONS[parameter];

  const result = {
    type: "hotspot_analysis",

    version: "1.0",

    method: "getis_ord_gi_star",

    parameter: {
      parameter,
      unit: definition.unit,
    },

    radiusMetres,

    observationCount:
      validObservations.length,

    analyzedObservationCount:
      analyzedObservations.length,

    observations:
      analyzedObservations,
  };

  validateHotspotAnalysisResult(result);

  return result;
}

module.exports = {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  validateRadius,
  extractValidObservations,
  buildSpatialWeights,
  calculateGiStar,
  calculatePopulationStatistics,
  buildHotspotAnalysisResult,
};
