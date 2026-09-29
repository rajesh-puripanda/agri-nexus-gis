"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validatePredictiveIndicatorResult,
} = require("../scientific/statistics/predictiveIndicatorResultContract");

function buildValidResult(overrides = {}) {
  return {
    type: "predictive_indicator",
    version: "1.0",
    method: "standardized_indicator",
    parameter: {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
    observationCount: 4,
    value: 1.25,
    ...overrides,
  };
}

test("REQUIRED_METHOD is standardized_indicator", () => {
  assert.equal(REQUIRED_METHOD, "standardized_indicator");
});

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(1.25), true);
  assert.equal(isFiniteNumber(-5), true);
});

test("isFiniteNumber rejects non-finite values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber(-Infinity), false);
  assert.equal(isFiniteNumber("1.25"), false);
  assert.equal(isFiniteNumber(null), false);
});

test("validateParameterDescriptor accepts valid parameter", () => {
  assert.equal(
    validateParameterDescriptor({
      parameter: "nitrogen",
      unit: "kg/ha",
    }),
    true,
  );
});

test("validateParameterDescriptor rejects missing parameter", () => {
  assert.throws(
    () =>
      validateParameterDescriptor({
        unit: "kg/ha",
      }),
    /Predictive parameter name is required/,
  );
});

test("validateParameterDescriptor rejects missing unit", () => {
  assert.throws(
    () =>
      validateParameterDescriptor({
        parameter: "nitrogen",
      }),
    /Predictive parameter unit is required/,
  );
});

test("valid predictive indicator passes validation", () => {
  assert.equal(
    validatePredictiveIndicatorResult(buildValidResult()),
    true,
  );
});

test("missing result is rejected", () => {
  assert.throws(
    () => validatePredictiveIndicatorResult(),
    /Predictive indicator result is required/,
  );
});

test("invalid result type is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          type: "prediction",
        }),
      ),
    /Invalid predictive indicator result type/,
  );
});

test("missing version is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          version: "",
        }),
      ),
    /Predictive indicator version is required/,
  );
});

test("invalid method is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          method: "prediction",
        }),
      ),
    /Predictive indicator method must be standardized_indicator/,
  );
});

test("missing parameter is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          parameter: null,
        }),
      ),
    /Predictive parameter is required/,
  );
});

test("invalid observationCount is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          observationCount: -1,
        }),
      ),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("non-integer observationCount is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          observationCount: 2.5,
        }),
      ),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("non-finite value is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          value: NaN,
        }),
      ),
    /Predictive indicator value must be finite/,
  );
});

test("Infinity value is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          value: Infinity,
        }),
      ),
    /Predictive indicator value must be finite/,
  );
});

test("zero observationCount is valid", () => {
  assert.equal(
    validatePredictiveIndicatorResult(
      buildValidResult({
        observationCount: 0,
      }),
    ),
    true,
  );
});

test("negative indicator value is valid", () => {
  assert.equal(
    validatePredictiveIndicatorResult(
      buildValidResult({
        value: -1.75,
      }),
    ),
    true,
  );
});

test("zero indicator value is valid", () => {
  assert.equal(
    validatePredictiveIndicatorResult(
      buildValidResult({
        value: 0,
      }),
    ),
    true,
  );
});

test("decimal observationCount is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          observationCount: 4.1,
        }),
      ),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("string observationCount is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          observationCount: "4",
        }),
      ),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("string value is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          value: "1.25",
        }),
      ),
    /Predictive indicator value must be finite/,
  );
});

test("NaN observationCount is rejected", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          observationCount: NaN,
        }),
      ),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("missing value is rejected", () => {
  const result = buildValidResult();
  delete result.value;

  assert.throws(
    () => validatePredictiveIndicatorResult(result),
    /Predictive indicator value must be finite/,
  );
});

test("missing observationCount is rejected", () => {
  const result = buildValidResult();
  delete result.observationCount;

  assert.throws(
    () => validatePredictiveIndicatorResult(result),
    /Predictive indicator observationCount must be non-negative/,
  );
});

test("parameter name must be non-empty", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          parameter: {
            parameter: "   ",
            unit: "kg/ha",
          },
        }),
      ),
    /Predictive parameter name is required/,
  );
});

test("parameter unit must be non-empty", () => {
  assert.throws(
    () =>
      validatePredictiveIndicatorResult(
        buildValidResult({
          parameter: {
            parameter: "nitrogen",
            unit: "   ",
          },
        }),
      ),
    /Predictive parameter unit is required/,
  );
});

test("additional fields do not invalidate the contract", () => {
  assert.equal(
    validatePredictiveIndicatorResult(
      buildValidResult({
        metadata: {
          source: "soilAnalysisService",
        },
      }),
    ),
    true,
  );
});

test("contract contains no prediction target requirement", () => {
  const result = buildValidResult();

  assert.equal("target" in result, false);
  assert.equal("prediction" in result, false);
  assert.equal("forecast" in result, false);
  assert.equal(
    validatePredictiveIndicatorResult(result),
    true,
  );
});
