"use strict";

const REQUIRED_METHOD = "weighted_risk_index";
const REQUIRED_TYPE = "agricultural_risk";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterInput(input, index) {
  const name = `Risk parameter input ${index}`;

  if (!input || typeof input !== "object") {
    throw new Error(`${name} is required`);
  }

  if (
    typeof input.parameter !== "string" ||
    !input.parameter.trim()
  ) {
    throw new Error(`${name} parameter is required`);
  }

  if (
    typeof input.unit !== "string" ||
    !input.unit.trim()
  ) {
    throw new Error(`${name} unit is required`);
  }

  if (!isFiniteNumber(input.value)) {
    throw new Error(`${name} value must be finite`);
  }

  if (!isFiniteNumber(input.weight)) {
    throw new Error(`${name} weight must be finite`);
  }

  if (input.weight < 0) {
    throw new Error(`${name} weight must be non-negative`);
  }

  return true;
}

function validateObservation(observation, index) {
  const name = `Risk observation ${index}`;

  if (!observation || typeof observation !== "object") {
    throw new Error(`${name} is required`);
  }

  if (
    typeof observation.observationId !== "string" ||
    !observation.observationId.trim()
  ) {
    throw new Error(`${name} observationId is required`);
  }

  if (!Array.isArray(observation.inputs)) {
    throw new Error(`${name} inputs must be an array`);
  }

  if (!isFiniteNumber(observation.riskIndex)) {
    throw new Error(`${name} riskIndex must be finite`);
  }

  if (observation.riskIndex < 0) {
    throw new Error(`${name} riskIndex must be non-negative`);
  }

  for (let index = 0; index < observation.inputs.length; index += 1) {
    validateParameterInput(observation.inputs[index], index);
  }

  return true;
}

function validateAgriculturalRiskResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Agricultural risk result is required");
  }

  if (result.type !== REQUIRED_TYPE) {
    throw new Error("Invalid agricultural risk result type");
  }

  if (
    typeof result.version !== "string" ||
    !result.version.trim()
  ) {
    throw new Error("Agricultural risk result version is required");
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error(
      "Agricultural risk method must be weighted_risk_index",
    );
  }

  if (
    !Number.isInteger(result.observationCount) ||
    result.observationCount < 0
  ) {
    throw new Error(
      "Agricultural risk observationCount must be non-negative",
    );
  }

  if (!Array.isArray(result.observations)) {
    throw new Error(
      "Agricultural risk observations must be an array",
    );
  }

  if (
    result.observations.length !== result.observationCount
  ) {
    throw new Error(
      "Agricultural risk observation count must match observationCount",
    );
  }

  const observationIds = new Set();

  for (
    let index = 0;
    index < result.observations.length;
    index += 1
  ) {
    const observation = result.observations[index];

    validateObservation(observation, index);

    if (observationIds.has(observation.observationId)) {
      throw new Error(
        `Duplicate agricultural risk observation: ${observation.observationId}`,
      );
    }

    observationIds.add(observation.observationId);
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  REQUIRED_TYPE,
  isFiniteNumber,
  validateParameterInput,
  validateObservation,
  validateAgriculturalRiskResult,
};
