"use strict";

const {
  isFiniteNumber,
  validateParameterInput,
  validateObservation,
  validateAgriculturalRiskResult,
} = require("../scientific/statistics/agriculturalRiskResultContract");

function validateObservationId(observationId) {
  if (
    typeof observationId !== "string" ||
    !observationId.trim()
  ) {
    throw new Error("Agricultural risk observationId is required");
  }

  return true;
}

function validateRiskInputs(inputs) {
  if (!Array.isArray(inputs)) {
    throw new Error("Agricultural risk inputs must be an array");
  }

  if (inputs.length === 0) {
    throw new Error(
      "Agricultural risk requires at least one parameter input",
    );
  }

  for (let index = 0; index < inputs.length; index += 1) {
    validateParameterInput(inputs[index], index);

    if (inputs[index].value < 0) {
      throw new Error(
        `Risk parameter input ${index} value must be non-negative`,
      );
    }
  }

  return true;
}

function calculateWeightedRiskIndex(inputs) {
  validateRiskInputs(inputs);

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const input of inputs) {
    weightedTotal += input.value * input.weight;
    totalWeight += input.weight;
  }

  if (!isFiniteNumber(weightedTotal)) {
    throw new Error(
      "Agricultural risk weighted total must be finite",
    );
  }

  if (!isFiniteNumber(totalWeight) || totalWeight <= 0) {
    throw new Error(
      "Agricultural risk total weight must be positive",
    );
  }

  const riskIndex = weightedTotal / totalWeight;

  if (!isFiniteNumber(riskIndex) || riskIndex < 0) {
    throw new Error(
      "Agricultural risk index must be finite and non-negative",
    );
  }

  return riskIndex;
}

function buildRiskObservation(observationId, inputs) {
  validateObservationId(observationId);

  const riskIndex = calculateWeightedRiskIndex(inputs);

  const observation = {
    observationId,
    inputs: inputs.map((input) => ({
      parameter: input.parameter,
      unit: input.unit,
      value: input.value,
      weight: input.weight,
    })),
    riskIndex,
  };

  validateObservation(observation, 0);

  return observation;
}

function buildAgriculturalRiskResult(observations) {
  if (!Array.isArray(observations)) {
    throw new Error(
      "Agricultural risk observations must be an array",
    );
  }

  const observationIds = new Set();

  const resultObservations = observations.map(
    (observation, index) => {
      if (!observation || typeof observation !== "object") {
        throw new Error(
          `Agricultural risk observation ${index} is required`,
        );
      }

      validateObservationId(observation.observationId);

      if (observationIds.has(observation.observationId)) {
        throw new Error(
          `Duplicate agricultural risk observation: ${observation.observationId}`,
        );
      }

      observationIds.add(observation.observationId);

      return buildRiskObservation(
        observation.observationId,
        observation.inputs,
      );
    },
  );

  resultObservations.sort((a, b) =>
    a.observationId.localeCompare(b.observationId),
  );

  const result = {
    type: "agricultural_risk",
    version: "1.0",
    method: "weighted_risk_index",
    observationCount: resultObservations.length,
    observations: resultObservations,
  };

  validateAgriculturalRiskResult(result);

  return result;
}

module.exports = {
  isFiniteNumber,
  validateObservationId,
  validateRiskInputs,
  calculateWeightedRiskIndex,
  buildRiskObservation,
  buildAgriculturalRiskResult,
};
