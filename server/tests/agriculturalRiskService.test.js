"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateObservationId,
  validateRiskInputs,
  calculateWeightedRiskIndex,
  buildRiskObservation,
  buildAgriculturalRiskResult,
} = require("../services/agriculturalRiskService");

function input(
  parameter,
  value,
  weight,
  unit = "normalized",
) {
  return {
    parameter,
    unit,
    value,
    weight,
  };
}

test("accepts a valid observation ID", () => {
  assert.equal(
    validateObservationId("S-001"),
    true,
  );
});

test("rejects missing observation ID", () => {
  assert.throws(
    () => validateObservationId(""),
    /observationId is required/,
  );
});

test("rejects non-string observation ID", () => {
  assert.throws(
    () => validateObservationId(101),
    /observationId is required/,
  );
});

test("accepts valid risk inputs", () => {
  assert.equal(
    validateRiskInputs([
      input("nitrogen", 0.8, 0.6),
      input("phosphorus", 0.4, 0.4),
    ]),
    true,
  );
});

test("rejects non-array risk inputs", () => {
  assert.throws(
    () => validateRiskInputs(null),
    /inputs must be an array/,
  );
});

test("rejects empty risk inputs", () => {
  assert.throws(
    () => validateRiskInputs([]),
    /requires at least one parameter input/,
  );
});

test("rejects negative risk contribution", () => {
  assert.throws(
    () =>
      validateRiskInputs([
        input("nitrogen", -0.1, 1),
      ]),
    /value must be non-negative/,
  );
});

test("rejects invalid parameter input", () => {
  assert.throws(
    () =>
      validateRiskInputs([
        {
          parameter: "nitrogen",
          unit: "normalized",
          value: NaN,
          weight: 1,
        },
      ]),
    /value must be finite/,
  );
});

test("calculates a single weighted risk contribution", () => {
  const result = calculateWeightedRiskIndex([
    input("nitrogen", 0.75, 1),
  ]);

  assert.equal(result, 0.75);
});

test("calculates a weighted average", () => {
  const result = calculateWeightedRiskIndex([
    input("nitrogen", 0.8, 0.6),
    input("phosphorus", 0.4, 0.4),
  ]);

  assert.equal(result, 0.64);
});

test("does not require weights to sum to one", () => {
  const result = calculateWeightedRiskIndex([
    input("nitrogen", 0.8, 6),
    input("phosphorus", 0.4, 4),
  ]);

  assert.equal(result, 0.64);
});

test("rejects zero total weight", () => {
  assert.throws(
    () =>
      calculateWeightedRiskIndex([
        input("nitrogen", 0.8, 0),
        input("phosphorus", 0.4, 0),
      ]),
    /total weight must be positive/,
  );
});

test("rejects negative weight", () => {
  assert.throws(
    () =>
      calculateWeightedRiskIndex([
        input("nitrogen", 0.8, -1),
      ]),
    /weight must be non-negative/,
  );
});

test("accepts zero risk contribution", () => {
  assert.equal(
    calculateWeightedRiskIndex([
      input("nitrogen", 0, 1),
    ]),
    0,
  );
});

test("builds a risk observation", () => {
  const observation = buildRiskObservation(
    "S-001",
    [
      input("nitrogen", 0.8, 0.6),
      input("phosphorus", 0.4, 0.4),
    ],
  );

  assert.equal(observation.observationId, "S-001");
  assert.equal(observation.inputs.length, 2);
  assert.equal(observation.riskIndex, 0.64);
});

test("builds a risk observation with normalized inputs", () => {
  const observation = buildRiskObservation(
    "S-001",
    [
      input("nitrogen", 0.25, 1),
    ],
  );

  assert.deepEqual(observation, {
    observationId: "S-001",
    inputs: [
      {
        parameter: "nitrogen",
        unit: "normalized",
        value: 0.25,
        weight: 1,
      },
    ],
    riskIndex: 0.25,
  });
});

test("builds an empty agricultural risk result", () => {
  const result = buildAgriculturalRiskResult([]);

  assert.deepEqual(result, {
    type: "agricultural_risk",
    version: "1.0",
    method: "weighted_risk_index",
    observationCount: 0,
    observations: [],
  });
});

test("builds an agricultural risk result", () => {
  const result = buildAgriculturalRiskResult([
    {
      observationId: "S-001",
      inputs: [
        input("nitrogen", 0.8, 0.6),
        input("phosphorus", 0.4, 0.4),
      ],
    },
  ]);

  assert.equal(result.type, "agricultural_risk");
  assert.equal(result.version, "1.0");
  assert.equal(result.method, "weighted_risk_index");
  assert.equal(result.observationCount, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].riskIndex, 0.64);
});

test("sorts observations deterministically by observation ID", () => {
  const result = buildAgriculturalRiskResult([
    {
      observationId: "S-003",
      inputs: [input("nitrogen", 0.3, 1)],
    },
    {
      observationId: "S-001",
      inputs: [input("nitrogen", 0.1, 1)],
    },
    {
      observationId: "S-002",
      inputs: [input("nitrogen", 0.2, 1)],
    },
  ]);

  assert.deepEqual(
    result.observations.map(
      (observation) => observation.observationId,
    ),
    ["S-001", "S-002", "S-003"],
  );
});

test("rejects duplicate observation IDs", () => {
  assert.throws(
    () =>
      buildAgriculturalRiskResult([
        {
          observationId: "S-001",
          inputs: [input("nitrogen", 0.3, 1)],
        },
        {
          observationId: "S-001",
          inputs: [input("nitrogen", 0.5, 1)],
        },
      ]),
    /Duplicate agricultural risk observation: S-001/,
  );
});

test("preserves parameter and unit metadata", () => {
  const result = buildAgriculturalRiskResult([
    {
      observationId: "S-001",
      inputs: [
        input("nitrogen", 0.7, 0.5, "normalized"),
        input("phosphorus", 0.3, 0.5, "normalized"),
      ],
    },
  ]);

  assert.deepEqual(
    result.observations[0].inputs,
    [
      {
        parameter: "nitrogen",
        unit: "normalized",
        value: 0.7,
        weight: 0.5,
      },
      {
        parameter: "phosphorus",
        unit: "normalized",
        value: 0.3,
        weight: 0.5,
      },
    ],
  );
});

test("produces a non-negative risk index", () => {
  const result = buildAgriculturalRiskResult([
    {
      observationId: "S-001",
      inputs: [
        input("nitrogen", 0.9, 0.7),
        input("phosphorus", 0.2, 0.3),
      ],
    },
  ]);

  assert.equal(result.observations[0].riskIndex >= 0, true);
});

test("rejects non-array observations", () => {
  assert.throws(
    () => buildAgriculturalRiskResult(null),
    /observations must be an array/,
  );
});

test("rejects an observation without inputs", () => {
  assert.throws(
    () =>
      buildAgriculturalRiskResult([
        {
          observationId: "S-001",
          inputs: [],
        },
      ]),
    /requires at least one parameter input/,
  );
});
