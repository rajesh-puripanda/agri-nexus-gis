"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_METHOD,
  REQUIRED_TYPE,
  isFiniteNumber,
  validateParameterInput,
  validateObservation,
  validateAgriculturalRiskResult,
} = require("../scientific/statistics/agriculturalRiskResultContract");

function validInput(overrides = {}) {
  return {
    parameter: "nitrogen",
    unit: "kg/ha",
    value: 0.75,
    weight: 0.5,
    ...overrides,
  };
}

function validObservation(overrides = {}) {
  return {
    observationId: "S-001",
    inputs: [validInput()],
    riskIndex: 0.375,
    ...overrides,
  };
}

function validResult(overrides = {}) {
  return {
    type: REQUIRED_TYPE,
    version: "1.0",
    method: REQUIRED_METHOD,
    observationCount: 1,
    observations: [validObservation()],
    ...overrides,
  };
}

test("exports required constants", () => {
  assert.equal(REQUIRED_TYPE, "agricultural_risk");
  assert.equal(REQUIRED_METHOD, "weighted_risk_index");
});

test("accepts finite numbers", () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(1.25), true);
  assert.equal(isFiniteNumber(-2.5), true);
});

test("rejects non-finite numbers", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber(-Infinity), false);
  assert.equal(isFiniteNumber("1"), false);
});

test("accepts valid parameter input", () => {
  assert.equal(validateParameterInput(validInput(), 0), true);
});

test("rejects missing parameter input", () => {
  assert.throws(
    () => validateParameterInput(null, 0),
    /Risk parameter input 0 is required/,
  );
});

test("rejects missing parameter name", () => {
  assert.throws(
    () => validateParameterInput(validInput({ parameter: "" }), 0),
    /parameter is required/,
  );
});

test("rejects missing parameter unit", () => {
  assert.throws(
    () => validateParameterInput(validInput({ unit: "" }), 0),
    /unit is required/,
  );
});

test("rejects non-finite parameter value", () => {
  assert.throws(
    () => validateParameterInput(validInput({ value: NaN }), 0),
    /value must be finite/,
  );
});

test("rejects non-finite weight", () => {
  assert.throws(
    () => validateParameterInput(validInput({ weight: Infinity }), 0),
    /weight must be finite/,
  );
});

test("accepts zero weight", () => {
  assert.equal(
    validateParameterInput(validInput({ weight: 0 }), 0),
    true,
  );
});

test("rejects negative weight", () => {
  assert.throws(
    () => validateParameterInput(validInput({ weight: -0.1 }), 0),
    /weight must be non-negative/,
  );
});

test("accepts valid observation", () => {
  assert.equal(validateObservation(validObservation(), 0), true);
});

test("rejects missing observation", () => {
  assert.throws(
    () => validateObservation(null, 0),
    /Risk observation 0 is required/,
  );
});

test("rejects missing observation ID", () => {
  assert.throws(
    () =>
      validateObservation(
        validObservation({ observationId: "" }),
        0,
      ),
    /observationId is required/,
  );
});

test("rejects non-array inputs", () => {
  assert.throws(
    () =>
      validateObservation(
        validObservation({ inputs: null }),
        0,
      ),
    /inputs must be an array/,
  );
});

test("accepts multiple parameter inputs", () => {
  const observation = validObservation({
    inputs: [
      validInput({
        parameter: "nitrogen",
        unit: "kg/ha",
      }),
      validInput({
        parameter: "phosphorus",
        unit: "kg/ha",
        value: 0.4,
        weight: 0.25,
      }),
    ],
  });

  assert.equal(validateObservation(observation, 0), true);
});

test("rejects non-finite risk index", () => {
  assert.throws(
    () =>
      validateObservation(
        validObservation({ riskIndex: NaN }),
        0,
      ),
    /riskIndex must be finite/,
  );
});

test("rejects negative risk index", () => {
  assert.throws(
    () =>
      validateObservation(
        validObservation({ riskIndex: -1 }),
        0,
      ),
    /riskIndex must be non-negative/,
  );
});

test("accepts valid agricultural risk result", () => {
  assert.equal(
    validateAgriculturalRiskResult(validResult()),
    true,
  );
});

test("rejects missing result", () => {
  assert.throws(
    () => validateAgriculturalRiskResult(null),
    /Agricultural risk result is required/,
  );
});

test("rejects invalid result type", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({ type: "risk" }),
      ),
    /Invalid agricultural risk result type/,
  );
});

test("rejects missing result version", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({ version: "" }),
      ),
    /version is required/,
  );
});

test("rejects invalid method", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({ method: "unknown_method" }),
      ),
    /method must be weighted_risk_index/,
  );
});

test("rejects negative observation count", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({
          observationCount: -1,
          observations: [],
        }),
      ),
    /observationCount must be non-negative/,
  );
});

test("rejects non-integer observation count", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({ observationCount: 1.5 }),
      ),
    /observationCount must be non-negative/,
  );
});

test("rejects non-array observations", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({ observations: null }),
      ),
    /observations must be an array/,
  );
});

test("rejects observation count mismatch", () => {
  assert.throws(
    () =>
      validateAgriculturalRiskResult(
        validResult({
          observationCount: 2,
          observations: [validObservation()],
        }),
      ),
    /observation count must match observationCount/,
  );
});

test("rejects duplicate observation IDs", () => {
  const result = validResult({
    observationCount: 2,
    observations: [
      validObservation({ observationId: "S-001" }),
      validObservation({ observationId: "S-001" }),
    ],
  });

  assert.throws(
    () => validateAgriculturalRiskResult(result),
    /Duplicate agricultural risk observation: S-001/,
  );
});

test("accepts empty agricultural risk result", () => {
  const result = {
    type: REQUIRED_TYPE,
    version: "1.0",
    method: REQUIRED_METHOD,
    observationCount: 0,
    observations: [],
  };

  assert.equal(validateAgriculturalRiskResult(result), true);
});
