"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  extractValidValues,
  calculateMean,
  calculatePopulationStandardDeviation,
  calculateStandardizedIndicator,
  buildPredictiveIndicatorResult,
} = require("../services/predictiveIndicatorService");

function buildObservation(
  nitrogen,
  observationId = "S-001",
) {
  return {
    observationId,
    values: {
      nitrogen: {
        value: nitrogen,
        unit: "kg/ha",
      },
    },
  };
}

function buildObservations(values) {
  return values.map((value, index) =>
    buildObservation(value, `S-${String(index + 1).padStart(3, "0")}`),
  );
}

test("parameter definitions contain supported soil parameters", () => {
  assert.deepEqual(
    Object.keys(PARAMETER_DEFINITIONS),
    [
      "pH",
      "nitrogen",
      "phosphorus",
      "potassium",
      "organicCarbon",
      "electricalConductivity",
    ],
  );
});

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(12.5), true);
  assert.equal(isFiniteNumber(-3), true);
});

test("isFiniteNumber rejects invalid values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber(-Infinity), false);
  assert.equal(isFiniteNumber("12"), false);
  assert.equal(isFiniteNumber(null), false);
});

test("validateParameter accepts nitrogen", () => {
  assert.deepEqual(
    validateParameter("nitrogen"),
    {
      sourceKey: "nitrogen",
      unit: "kg/ha",
    },
  );
});

test("validateParameter accepts all supported parameters", () => {
  for (const parameter of Object.keys(PARAMETER_DEFINITIONS)) {
    assert.deepEqual(
      validateParameter(parameter),
      PARAMETER_DEFINITIONS[parameter],
    );
  }
});

test("validateParameter rejects unsupported parameter", () => {
  assert.throws(
    () => validateParameter("temperature"),
    /Unsupported predictive parameter/,
  );
});

test("extractValidValues extracts finite authoritative values", () => {
  const observations = [
    buildObservation(100, "S-001"),
    buildObservation(200, "S-002"),
    buildObservation(300, "S-003"),
  ];

  assert.deepEqual(
    extractValidValues(observations, "nitrogen"),
    [100, 200, 300],
  );
});

test("extractValidValues excludes missing values", () => {
  const observations = [
    buildObservation(100, "S-001"),
    buildObservation(null, "S-002"),
    buildObservation(300, "S-003"),
  ];

  assert.deepEqual(
    extractValidValues(observations, "nitrogen"),
    [100, 300],
  );
});

test("extractValidValues excludes non-finite values", () => {
  const observations = [
    buildObservation(100, "S-001"),
    buildObservation(NaN, "S-002"),
    buildObservation(Infinity, "S-003"),
    buildObservation(300, "S-004"),
  ];

  assert.deepEqual(
    extractValidValues(observations, "nitrogen"),
    [100, 300],
  );
});

test("extractValidValues rejects non-array observations", () => {
  assert.throws(
    () => extractValidValues(null, "nitrogen"),
    /Predictive observations must be an array/,
  );
});

test("calculateMean calculates arithmetic mean", () => {
  assert.equal(
    calculateMean([100, 200, 300]),
    200,
  );
});

test("calculateMean supports negative values", () => {
  assert.equal(
    calculateMean([-2, 0, 2]),
    0,
  );
});

test("calculateMean rejects empty values", () => {
  assert.throws(
    () => calculateMean([]),
    /Predictive values are required/,
  );
});

test("calculatePopulationStandardDeviation calculates population standard deviation", () => {
  assert.equal(
    calculatePopulationStandardDeviation(
      [100, 200, 300],
      200,
    ),
    Math.sqrt(6666.666666666667),
  );
});

test("calculatePopulationStandardDeviation rejects empty values", () => {
  assert.throws(
    () =>
      calculatePopulationStandardDeviation([], 0),
    /Predictive values are required/,
  );
});

test("calculatePopulationStandardDeviation rejects zero variance", () => {
  assert.throws(
    () =>
      calculatePopulationStandardDeviation(
        [100, 100, 100],
        100,
      ),
    /non-zero population variance/,
  );
});

test("calculateStandardizedIndicator calculates z-score", () => {
  assert.equal(
    calculateStandardizedIndicator(300, 200, 100),
    1,
  );
});

test("calculateStandardizedIndicator supports negative z-score", () => {
  assert.equal(
    calculateStandardizedIndicator(100, 200, 100),
    -1,
  );
});

test("calculateStandardizedIndicator returns zero at the mean", () => {
  assert.equal(
    calculateStandardizedIndicator(200, 200, 100),
    0,
  );
});

test("calculateStandardizedIndicator rejects non-finite value", () => {
  assert.throws(
    () =>
      calculateStandardizedIndicator(
        NaN,
        200,
        100,
      ),
    /Predictive indicator value must be finite/,
  );
});

test("calculateStandardizedIndicator rejects non-finite mean", () => {
  assert.throws(
    () =>
      calculateStandardizedIndicator(
        200,
        NaN,
        100,
      ),
    /Predictive indicator mean must be finite/,
  );
});

test("calculateStandardizedIndicator rejects zero standard deviation", () => {
  assert.throws(
    () =>
      calculateStandardizedIndicator(
        200,
        200,
        0,
      ),
    /standard deviation must be positive/,
  );
});

test("buildPredictiveIndicatorResult builds standardized indicator", () => {
  const result = buildPredictiveIndicatorResult(
    buildObservations([100, 200, 300]),
    "nitrogen",
    300,
  );

  assert.equal(result.type, "predictive_indicator");
  assert.equal(result.version, "1.0");
  assert.equal(result.method, "standardized_indicator");
  assert.deepEqual(result.parameter, {
    parameter: "nitrogen",
    unit: "kg/ha",
  });
  assert.equal(result.observationCount, 3);
  assert.equal(
    result.value,
    100 / Math.sqrt(6666.666666666667),
  );
});

test("buildPredictiveIndicatorResult uses only valid observations", () => {
  const observations = [
    buildObservation(100, "S-001"),
    buildObservation(null, "S-002"),
    buildObservation(200, "S-003"),
    buildObservation(300, "S-004"),
  ];

  const result = buildPredictiveIndicatorResult(
    observations,
    "nitrogen",
    300,
  );

  assert.equal(result.observationCount, 3);
});

test("buildPredictiveIndicatorResult requires at least two valid observations", () => {
  assert.throws(
    () =>
      buildPredictiveIndicatorResult(
        [buildObservation(100)],
        "nitrogen",
        100,
      ),
    /at least two valid observations/,
  );
});

test("buildPredictiveIndicatorResult rejects zero variance", () => {
  assert.throws(
    () =>
      buildPredictiveIndicatorResult(
        buildObservations([100, 100, 100]),
        "nitrogen",
        100,
      ),
    /non-zero population variance/,
  );
});

test("buildPredictiveIndicatorResult rejects unsupported parameter", () => {
  assert.throws(
    () =>
      buildPredictiveIndicatorResult(
        buildObservations([100, 200]),
        "temperature",
        200,
      ),
    /Unsupported predictive parameter/,
  );
});

test("buildPredictiveIndicatorResult rejects non-finite target value", () => {
  assert.throws(
    () =>
      buildPredictiveIndicatorResult(
        buildObservations([100, 200]),
        "nitrogen",
        NaN,
      ),
    /Predictive indicator value must be finite/,
  );
});

test("buildPredictiveIndicatorResult preserves parameter unit", () => {
  const result = buildPredictiveIndicatorResult(
    buildObservations([100, 200, 300]),
    "nitrogen",
    200,
  );

  assert.equal(result.parameter.unit, "kg/ha");
});

test("result contains no prediction or forecast field", () => {
  const result = buildPredictiveIndicatorResult(
    buildObservations([100, 200, 300]),
    "nitrogen",
    200,
  );

  assert.equal("prediction" in result, false);
  assert.equal("forecast" in result, false);
  assert.equal("target" in result, false);
});
