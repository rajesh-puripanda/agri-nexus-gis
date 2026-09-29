// ============================================================
// server/services/correlationAnalysisService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.2 — Correlation Analysis
//
// Responsibility:
//   - Calculate Pearson correlation between two parameters
//   - Consume authoritative normalized soil-analysis results
//   - Preserve parameter units
//
// Does NOT:
//   - Validate raw soil measurements
//   - Reproduce soil classifications
//   - Calculate fertility
//   - Interpret correlation strength
//   - Infer causality
//   - Produce agricultural recommendations
//   - Apply weighting or scoring
//   - Perform prediction
//   - Produce agricultural risk scores
//   - Perform risk modelling
//
// Scientific authority for raw soil measurements remains:
//   soilAnalysisService.js
//
// ============================================================

"use strict";

const {
  validateCorrelationAnalysisResult,
} = require("../scientific/statistics/correlationAnalysisResultContract");

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
    throw new Error("Statistical correlation parameter is required");
  }

  if (!PARAMETER_DEFINITIONS[parameter]) {
    throw new Error(
      `Unsupported statistical correlation parameter: ${parameter}`,
    );
  }

  return true;
}

// ============================================================
// AUTHORITATIVE PAIRED OBSERVATION EXTRACTION
// ============================================================
//
// Input:
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
//       ...
//     }
//   }
//
// Only observations having finite authoritative values for BOTH
// selected parameters are included.
//
// ============================================================

function extractPairedValues(
  observations,
  parameterA,
  parameterB,
) {
  if (!Array.isArray(observations)) {
    throw new Error("Correlation observations must be an array");
  }

  validateParameter(parameterA);
  validateParameter(parameterB);

  if (parameterA === parameterB) {
    throw new Error("Correlation parameters must be different");
  }

  const definitionA = PARAMETER_DEFINITIONS[parameterA];
  const definitionB = PARAMETER_DEFINITIONS[parameterB];

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

      const valueA = observation.values[definitionA.sourceKey];
      const valueB = observation.values[definitionB.sourceKey];

      if (
        !valueA ||
        typeof valueA !== "object" ||
        !isFiniteNumber(valueA.value)
      ) {
        return null;
      }

      if (
        !valueB ||
        typeof valueB !== "object" ||
        !isFiniteNumber(valueB.value)
      ) {
        return null;
      }

      return {
        a: valueA.value,
        b: valueB.value,
      };
    })
    .filter(Boolean);
}

// ============================================================
// PEARSON CORRELATION
// ============================================================

function calculatePearsonCorrelation(pairs) {
  if (!Array.isArray(pairs)) {
    throw new Error("Correlation pairs must be an array");
  }

  if (pairs.length < 2) {
    return null;
  }

  const meanA =
    pairs.reduce((sum, pair) => sum + pair.a, 0) /
    pairs.length;

  const meanB =
    pairs.reduce((sum, pair) => sum + pair.b, 0) /
    pairs.length;

  let numerator = 0;
  let sumSquaredA = 0;
  let sumSquaredB = 0;

  for (const pair of pairs) {
    const differenceA = pair.a - meanA;
    const differenceB = pair.b - meanB;

    numerator += differenceA * differenceB;
    sumSquaredA += differenceA ** 2;
    sumSquaredB += differenceB ** 2;
  }

  const denominator = Math.sqrt(
    sumSquaredA * sumSquaredB,
  );

  if (denominator === 0) {
    return null;
  }

  const correlation = numerator / denominator;

  if (!Number.isFinite(correlation)) {
    return null;
  }

  // Protect the result contract from insignificant floating-point
  // drift outside the mathematical [-1, 1] interval.
  return Math.max(-1, Math.min(1, correlation));
}

function buildCorrelationResult(
  observations,
  parameterA,
  parameterB,
) {
  validateParameter(parameterA);
  validateParameter(parameterB);

  if (parameterA === parameterB) {
    throw new Error("Correlation parameters must be different");
  }

  const pairs = extractPairedValues(
    observations,
    parameterA,
    parameterB,
  );

  const definitionA = PARAMETER_DEFINITIONS[parameterA];
  const definitionB = PARAMETER_DEFINITIONS[parameterB];

  const result = {
    type: "correlation_analysis",
    version: "1.0",
    method: "pearson",
    parameterA: {
      parameter: parameterA,
      unit: definitionA.unit,
    },
    parameterB: {
      parameter: parameterB,
      unit: definitionB.unit,
    },
    pairCount: pairs.length,
    correlation: calculatePearsonCorrelation(pairs),
  };

  validateCorrelationAnalysisResult(result);

  return result;
}

module.exports = {
  PARAMETER_DEFINITIONS,
  validateParameter,
  extractPairedValues,
  calculatePearsonCorrelation,
  buildCorrelationResult,
};