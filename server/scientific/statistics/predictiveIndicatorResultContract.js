"use strict";

const REQUIRED_METHOD = "standardized_indicator";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterDescriptor(parameter) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error("Predictive parameter is required");
  }

  if (
    typeof parameter.parameter !== "string" ||
    !parameter.parameter.trim()
  ) {
    throw new Error("Predictive parameter name is required");
  }

  if (
    typeof parameter.unit !== "string" ||
    !parameter.unit.trim()
  ) {
    throw new Error("Predictive parameter unit is required");
  }

  return true;
}

function validatePredictiveIndicatorResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Predictive indicator result is required");
  }

  if (result.type !== "predictive_indicator") {
    throw new Error("Invalid predictive indicator result type");
  }

  if (
    typeof result.version !== "string" ||
    !result.version.trim()
  ) {
    throw new Error("Predictive indicator version is required");
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error(
      "Predictive indicator method must be standardized_indicator",
    );
  }

  validateParameterDescriptor(result.parameter);

  if (!Number.isInteger(result.observationCount) || result.observationCount < 0) {
    throw new Error(
      "Predictive indicator observationCount must be non-negative",
    );
  }

  if (!isFiniteNumber(result.value)) {
    throw new Error("Predictive indicator value must be finite");
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validatePredictiveIndicatorResult,
};