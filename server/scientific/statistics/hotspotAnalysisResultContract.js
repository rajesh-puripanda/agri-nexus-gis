"use strict";

const REQUIRED_METHOD = "getis_ord_gi_star";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterDescriptor(parameter) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error("Hotspot parameter is required");
  }

  if (
    typeof parameter.parameter !== "string" ||
    !parameter.parameter.trim()
  ) {
    throw new Error("Hotspot parameter name is required");
  }

  if (
    typeof parameter.unit !== "string" ||
    !parameter.unit.trim()
  ) {
    throw new Error("Hotspot parameter unit is required");
  }

  return true;
}

function validateObservationResult(
  observation,
  index,
) {
  const name = `Hotspot observation ${index}`;

  if (!observation || typeof observation !== "object") {
    throw new Error(`${name} is required`);
  }

  if (
    typeof observation.observationId !== "string" ||
    !observation.observationId.trim()
  ) {
    throw new Error(`${name} observationId is required`);
  }

  if (!isFiniteNumber(observation.latitude)) {
    throw new Error(`${name} latitude must be finite`);
  }

  if (!isFiniteNumber(observation.longitude)) {
    throw new Error(`${name} longitude must be finite`);
  }

  if (!isFiniteNumber(observation.value)) {
    throw new Error(`${name} value must be finite`);
  }

  if (
    !Number.isInteger(observation.neighborCount) ||
    observation.neighborCount < 1
  ) {
    throw new Error(
      `${name} neighborCount must be a positive integer`,
    );
  }

  if (!isFiniteNumber(observation.giStar)) {
    throw new Error(`${name} giStar must be finite`);
  }

  return true;
}

function validateHotspotAnalysisResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Hotspot analysis result is required");
  }

  if (result.type !== "hotspot_analysis") {
    throw new Error("Invalid hotspot analysis result type");
  }

  if (
    typeof result.version !== "string" ||
    !result.version.trim()
  ) {
    throw new Error(
      "Hotspot analysis result version is required",
    );
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error(
      "Hotspot analysis method must be getis_ord_gi_star",
    );
  }

  validateParameterDescriptor(result.parameter);

  if (
    !isFiniteNumber(result.radiusMetres) ||
    result.radiusMetres <= 0
  ) {
    throw new Error(
      "Hotspot analysis radiusMetres must be positive and finite",
    );
  }

  if (
    !Number.isInteger(result.observationCount) ||
    result.observationCount < 0
  ) {
    throw new Error(
      "Hotspot analysis observationCount must be non-negative",
    );
  }

  if (
    !Number.isInteger(result.analyzedObservationCount) ||
    result.analyzedObservationCount < 0
  ) {
    throw new Error(
      "Hotspot analysis analyzedObservationCount must be non-negative",
    );
  }

  if (
    result.analyzedObservationCount >
    result.observationCount
  ) {
    throw new Error(
      "Analyzed observation count cannot exceed observation count",
    );
  }

  if (!Array.isArray(result.observations)) {
    throw new Error(
      "Hotspot analysis observations must be an array",
    );
  }

  if (
    result.observations.length !==
    result.analyzedObservationCount
  ) {
    throw new Error(
      "Hotspot observation count must match analyzedObservationCount",
    );
  }

  const observationIds = new Set();

  for (
    let index = 0;
    index < result.observations.length;
    index += 1
  ) {
    const observation = result.observations[index];

    validateObservationResult(
      observation,
      index,
    );

    if (
      observationIds.has(
        observation.observationId,
      )
    ) {
      throw new Error(
        `Duplicate hotspot observation: ${observation.observationId}`,
      );
    }

    observationIds.add(
      observation.observationId,
    );
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validateObservationResult,
  validateHotspotAnalysisResult,
};