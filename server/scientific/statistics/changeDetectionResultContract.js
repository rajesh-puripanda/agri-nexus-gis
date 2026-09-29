"use strict";

const REQUIRED_METHOD = "absolute_and_relative_change";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterDescriptor(parameter) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error("Change detection parameter is required");
  }

  if (
    typeof parameter.parameter !== "string" ||
    !parameter.parameter.trim()
  ) {
    throw new Error("Change detection parameter name is required");
  }

  if (
    typeof parameter.unit !== "string" ||
    !parameter.unit.trim()
  ) {
    throw new Error("Change detection parameter unit is required");
  }

  return true;
}

function validateChangeObservation(observation, index) {
  const name = `Change observation ${index}`;

  if (!observation || typeof observation !== "object") {
    throw new Error(`${name} is required`);
  }

  if (
    typeof observation.observationId !== "string" ||
    !observation.observationId.trim()
  ) {
    throw new Error(`${name} observationId is required`);
  }

  if (!isFiniteNumber(observation.baselineValue)) {
    throw new Error(`${name} baselineValue must be finite`);
  }

  if (!isFiniteNumber(observation.comparisonValue)) {
    throw new Error(`${name} comparisonValue must be finite`);
  }

  if (!isFiniteNumber(observation.absoluteChange)) {
    throw new Error(`${name} absoluteChange must be finite`);
  }

  if (
    observation.relativeChange !== null &&
    !isFiniteNumber(observation.relativeChange)
  ) {
    throw new Error(
      `${name} relativeChange must be finite or null`,
    );
  }

  return true;
}

function validateChangeDetectionResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Change detection result is required");
  }

  if (result.type !== "change_detection") {
    throw new Error("Invalid change detection result type");
  }

  if (
    typeof result.version !== "string" ||
    !result.version.trim()
  ) {
    throw new Error("Change detection result version is required");
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error(
      "Change detection method must be absolute_and_relative_change",
    );
  }

  validateParameterDescriptor(result.parameter);

  if (
    typeof result.baselineLabel !== "string" ||
    !result.baselineLabel.trim()
  ) {
    throw new Error("Change detection baselineLabel is required");
  }

  if (
    typeof result.comparisonLabel !== "string" ||
    !result.comparisonLabel.trim()
  ) {
    throw new Error(
      "Change detection comparisonLabel is required",
    );
  }

  if (
    !Number.isInteger(result.observationCount) ||
    result.observationCount < 0
  ) {
    throw new Error(
      "Change detection observationCount must be non-negative",
    );
  }

  if (!Array.isArray(result.observations)) {
    throw new Error(
      "Change detection observations must be an array",
    );
  }

  if (
    result.observations.length !== result.observationCount
  ) {
    throw new Error(
      "Change detection observation count must match observationCount",
    );
  }

  const observationIds = new Set();

  for (
    let index = 0;
    index < result.observations.length;
    index += 1
  ) {
    const observation = result.observations[index];

    validateChangeObservation(observation, index);

    if (observationIds.has(observation.observationId)) {
      throw new Error(
        `Duplicate change observation: ${observation.observationId}`,
      );
    }

    observationIds.add(observation.observationId);
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validateChangeObservation,
  validateChangeDetectionResult,
};
