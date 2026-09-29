"use strict";

const {
  validateChangeDetectionResult,
} = require("../scientific/statistics/changeDetectionResultContract");

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
    throw new Error(`Unsupported change detection parameter: ${parameter}`);
  }

  return PARAMETER_DEFINITIONS[parameter];
}

function extractObservationValue(observation, parameter) {
  if (!observation || typeof observation !== "object") {
    return null;
  }

  const definition = validateParameter(parameter);
  const value =
    observation.values?.[definition.sourceKey]?.value;

  return isFiniteNumber(value) ? value : null;
}

function buildObservationMap(observations, parameter) {
  if (!Array.isArray(observations)) {
    throw new Error("Change detection observations must be an array");
  }

  const map = new Map();

  for (const observation of observations) {
    if (!observation || typeof observation !== "object") {
      continue;
    }

    const observationId = observation.observationId;

    if (
      typeof observationId !== "string" ||
      !observationId.trim()
    ) {
      continue;
    }

    if (map.has(observationId)) {
      throw new Error(
        `Duplicate change observation: ${observationId}`,
      );
    }

    const value = extractObservationValue(
      observation,
      parameter,
    );

    if (value !== null) {
      map.set(observationId, value);
    }
  }

  return map;
}

function calculateAbsoluteChange(
  baselineValue,
  comparisonValue,
) {
  if (
    !isFiniteNumber(baselineValue) ||
    !isFiniteNumber(comparisonValue)
  ) {
    throw new Error("Change detection values must be finite");
  }

  return comparisonValue - baselineValue;
}

function calculateRelativeChange(
  baselineValue,
  comparisonValue,
) {
  if (
    !isFiniteNumber(baselineValue) ||
    !isFiniteNumber(comparisonValue)
  ) {
    throw new Error("Change detection values must be finite");
  }

  if (baselineValue === 0) {
    return null;
  }

  return (
    ((comparisonValue - baselineValue) / baselineValue) *
    100
  );
}

function buildChangeObservation(
  observationId,
  baselineValue,
  comparisonValue,
) {
  return {
    observationId,
    baselineValue,
    comparisonValue,
    absoluteChange: calculateAbsoluteChange(
      baselineValue,
      comparisonValue,
    ),
    relativeChange: calculateRelativeChange(
      baselineValue,
      comparisonValue,
    ),
  };
}

function buildChangeDetectionResult(
  baselineObservations,
  comparisonObservations,
  parameter,
  baselineLabel,
  comparisonLabel,
) {
  const definition = validateParameter(parameter);

  if (
    typeof baselineLabel !== "string" ||
    !baselineLabel.trim()
  ) {
    throw new Error("Change detection baselineLabel is required");
  }

  if (
    typeof comparisonLabel !== "string" ||
    !comparisonLabel.trim()
  ) {
    throw new Error(
      "Change detection comparisonLabel is required",
    );
  }

  const baselineMap = buildObservationMap(
    baselineObservations,
    parameter,
  );

  const comparisonMap = buildObservationMap(
    comparisonObservations,
    parameter,
  );

  const observationIds = [...baselineMap.keys()]
    .filter((observationId) =>
      comparisonMap.has(observationId),
    )
    .sort();

  const observations = observationIds.map(
    (observationId) =>
      buildChangeObservation(
        observationId,
        baselineMap.get(observationId),
        comparisonMap.get(observationId),
      ),
  );

  const result = {
    type: "change_detection",
    version: "1.0",
    method: "absolute_and_relative_change",
    parameter: {
      parameter,
      unit: definition.unit,
    },
    baselineLabel,
    comparisonLabel,
    observationCount: observations.length,
    observations,
  };

  validateChangeDetectionResult(result);

  return result;
}

module.exports = {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  extractObservationValue,
  buildObservationMap,
  calculateAbsoluteChange,
  calculateRelativeChange,
  buildChangeObservation,
  buildChangeDetectionResult,
};
