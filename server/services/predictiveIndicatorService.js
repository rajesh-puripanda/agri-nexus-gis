"use strict";

const {
  validatePredictiveIndicatorResult,
} = require("../scientific/statistics/predictiveIndicatorResultContract");

const PARAMETER_DEFINITIONS = {
  pH: { sourceKey: "pH", unit: "pH" },
  nitrogen: { sourceKey: "nitrogen", unit: "kg/ha" },
  phosphorus: { sourceKey: "phosphorus", unit: "kg/ha" },
  potassium: { sourceKey: "potassium", unit: "kg/ha" },
  organicCarbon: { sourceKey: "organicCarbon", unit: "%" },
  electricalConductivity: {
    sourceKey: "electricalConductivity",
    unit: "dS/m",
  },
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameter(parameter) {
  if (
    typeof parameter !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      PARAMETER_DEFINITIONS,
      parameter,
    )
  ) {
    throw new Error(`Unsupported predictive parameter: ${parameter}`);
  }

  return PARAMETER_DEFINITIONS[parameter];
}

function extractValidValues(observations, parameter) {
  if (!Array.isArray(observations)) {
    throw new Error("Predictive observations must be an array");
  }

  const definition = validateParameter(parameter);
  const values = [];

  for (const observation of observations) {
    if (!observation || typeof observation !== "object") {
      continue;
    }

    const value =
      observation.values?.[definition.sourceKey]?.value;

    if (isFiniteNumber(value)) {
      values.push(value);
    }
  }

  return values;
}

function calculateMean(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Predictive values are required");
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function calculatePopulationStandardDeviation(values, mean) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Predictive values are required");
  }

  const variance =
    values.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0,
    ) / values.length;

  const standardDeviation = Math.sqrt(variance);

  if (!isFiniteNumber(standardDeviation) || standardDeviation === 0) {
    throw new Error(
      "Predictive indicator requires non-zero population variance",
    );
  }

  return standardDeviation;
}

function calculateStandardizedIndicator(
  value,
  mean,
  standardDeviation,
) {
  if (!isFiniteNumber(value)) {
    throw new Error("Predictive indicator value must be finite");
  }

  if (!isFiniteNumber(mean)) {
    throw new Error("Predictive indicator mean must be finite");
  }

  if (
    !isFiniteNumber(standardDeviation) ||
    standardDeviation <= 0
  ) {
    throw new Error(
      "Predictive indicator standard deviation must be positive",
    );
  }

  return (value - mean) / standardDeviation;
}

function buildPredictiveIndicatorResult(
  observations,
  parameter,
  value,
) {
  const definition = validateParameter(parameter);
  const values = extractValidValues(observations, parameter);

  if (values.length < 2) {
    throw new Error(
      "Predictive indicator requires at least two valid observations",
    );
  }

  if (!isFiniteNumber(value)) {
    throw new Error("Predictive indicator value must be finite");
  }

  const mean = calculateMean(values);
  const standardDeviation =
    calculatePopulationStandardDeviation(values, mean);

  const indicatorValue = calculateStandardizedIndicator(
    value,
    mean,
    standardDeviation,
  );

  const result = {
    type: "predictive_indicator",
    version: "1.0",
    method: "standardized_indicator",
    parameter: {
      parameter,
      unit: definition.unit,
    },
    observationCount: values.length,
    value: indicatorValue,
  };

  validatePredictiveIndicatorResult(result);

  return result;
}

module.exports = {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  extractValidValues,
  calculateMean,
  calculatePopulationStandardDeviation,
  calculateStandardizedIndicator,
  buildPredictiveIndicatorResult,
};