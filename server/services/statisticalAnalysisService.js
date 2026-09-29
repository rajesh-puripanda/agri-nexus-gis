// ============================================================
// server/services/statisticalAnalysisService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.1 — Statistical Analysis Foundation
// Phase 9.1.1 — Authoritative Input Alignment
//
// Responsibility:
//   - Calculate descriptive statistics
//   - Consume authoritative normalized soil-analysis results
//   - Preserve parameter units
//
// Does NOT:
//   - Validate raw soil measurements
//   - Reproduce soil classifications
//   - Calculate fertility
//   - Calculate correlation
//   - Perform clustering or hotspot analysis
//   - Produce agricultural risk scores
//   - Perform prediction
//   - Apply cross-parameter weighting
//
// Scientific authority for raw soil measurements remains:
//   soilAnalysisService.js
//
// ============================================================

"use strict";

const {
  validateStatisticalAnalysisResult,
} = require("../scientific/statistics/statisticalAnalysisResultContract");

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

// ============================================================
// AUTHORITATIVE OBSERVATION EXTRACTION
// ============================================================
//
// Input contract:
//
//   soilAnalysisService.analyzeSample(sample)
//
//   {
//     values: {
//       pH: {
//         value,
//         unit,
//         classification
//       },
//       nitrogen: {
//         value,
//         unit,
//         classification
//       },
//       ...
//     }
//   }
//
// Statistical analysis consumes only the authoritative
// normalized numeric `value`.
//
// No raw-value validation or classification occurs here.
//
// ============================================================

function extractNumericValues(observations, parameter) {
  if (!Array.isArray(observations)) {
    throw new Error("Statistical observations must be an array");
  }

  const definition = PARAMETER_DEFINITIONS[parameter];

  if (!definition) {
    throw new Error(`Unsupported statistical parameter: ${parameter}`);
  }

  return observations
    .map((observation) => {
      if (
        !observation ||
        typeof observation !== "object" ||
        !observation.values ||
        typeof observation.values !== "object"
      ) {
        return null;
      }

      const parameterResult = observation.values[definition.sourceKey];

      if (
        !parameterResult ||
        typeof parameterResult !== "object"
      ) {
        return null;
      }

      return parameterResult.value;
    })
    .filter(isFiniteNumber);
}

// ============================================================
// DESCRIPTIVE STATISTICS
// ============================================================

function calculateMean(values) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateMedian(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function calculateVariance(values, mean) {
  if (values.length === 0) {
    return null;
  }

  const squaredDifferences = values.map(
    (value) => (value - mean) ** 2,
  );

  return (
    squaredDifferences.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function calculateStatistics(values) {
  if (values.length === 0) {
    return {
      count: 0,
      minimum: null,
      maximum: null,
      mean: null,
      median: null,
      variance: null,
      standardDeviation: null,
    };
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const mean = calculateMean(values);
  const median = calculateMedian(values);
  const variance = calculateVariance(values, mean);

  return {
    count: values.length,
    minimum,
    maximum,
    mean,
    median,
    variance,
    standardDeviation: Math.sqrt(variance),
  };
}

// ============================================================
// PARAMETER RESULT
// ============================================================

function buildParameterResult(observations, parameter) {
  const definition = PARAMETER_DEFINITIONS[parameter];
  const values = extractNumericValues(observations, parameter);
  const statistics = calculateStatistics(values);

  return {
    parameter,
    unit: definition.unit,
    sampleCount: statistics.count,
    statistics,
  };
}

// ============================================================
// STATISTICAL ANALYSIS
// ============================================================

function analyzeStatistics(
  observations,
  parameters = Object.keys(PARAMETER_DEFINITIONS),
) {
  if (!Array.isArray(observations)) {
    throw new Error("Statistical observations must be an array");
  }

  if (!Array.isArray(parameters) || parameters.length === 0) {
    throw new Error("Statistical parameters are required");
  }

  const uniqueParameters = [...new Set(parameters)];

  const results = uniqueParameters.map((parameter) =>
    buildParameterResult(observations, parameter),
  );

  const result = {
    type: "statistical_analysis",
    version: "1.0",
    parameters: results,
  };

  validateStatisticalAnalysisResult(result);

  return result;
}

module.exports = {
  PARAMETER_DEFINITIONS,
  calculateMean,
  calculateMedian,
  calculateVariance,
  calculateStatistics,
  extractNumericValues,
  buildParameterResult,
  analyzeStatistics,
};
