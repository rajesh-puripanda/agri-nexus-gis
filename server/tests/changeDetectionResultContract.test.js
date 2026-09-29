"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validateChangeObservation,
  validateChangeDetectionResult,
} = require("../scientific/statistics/changeDetectionResultContract");

function buildObservation(overrides = {}) {
  return {
    observationId: "S-001",
    baselineValue: 100,
    comparisonValue: 125,
    absoluteChange: 25,
    relativeChange: 25,
    ...overrides,
  };
}

function buildResult(overrides = {}) {
  return {
    type: "change_detection",
    version: "1.0",
    method: "absolute_and_relative_change",
    parameter: {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
    baselineLabel: "2025",
    comparisonLabel: "2026",
    observationCount: 1,
    observations: [buildObservation()],
    ...overrides,
  };
}

test("REQUIRED_METHOD is absolute_and_relative_change", () => {
  assert.equal(
    REQUIRED_METHOD,
    "absolute_and_relative_change",
  );
});

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(12.5), true);
  assert.equal(isFiniteNumber(-4), true);
});

test("isFiniteNumber rejects invalid values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber(-Infinity), false);
  assert.equal(isFiniteNumber("12"), false);
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
    /Change detection parameter name is required/,
  );
});

test("validateParameterDescriptor rejects missing unit", () => {
  assert.throws(
    () =>
      validateParameterDescriptor({
        parameter: "nitrogen",
      }),
    /Change detection parameter unit is required/,
  );
});

test("validateChangeObservation accepts valid observation", () => {
  assert.equal(
    validateChangeObservation(buildObservation(), 0),
    true,
  );
});

test("validateChangeObservation rejects missing observationId", () => {
  assert.throws(
    () =>
      validateChangeObservation(
        buildObservation({
          observationId: "",
        }),
        0,
      ),
    /observationId is required/,
  );
});

test("validateChangeObservation rejects non-finite baselineValue", () => {
  assert.throws(
    () =>
      validateChangeObservation(
        buildObservation({
          baselineValue: NaN,
        }),
        0,
      ),
    /baselineValue must be finite/,
  );
});

test("validateChangeObservation rejects non-finite comparisonValue", () => {
  assert.throws(
    () =>
      validateChangeObservation(
        buildObservation({
          comparisonValue: Infinity,
        }),
        0,
      ),
    /comparisonValue must be finite/,
  );
});

test("validateChangeObservation rejects non-finite absoluteChange", () => {
  assert.throws(
    () =>
      validateChangeObservation(
        buildObservation({
          absoluteChange: NaN,
        }),
        0,
      ),
    /absoluteChange must be finite/,
  );
});

test("validateChangeObservation accepts null relativeChange", () => {
  assert.equal(
    validateChangeObservation(
      buildObservation({
        relativeChange: null,
      }),
      0,
    ),
    true,
  );
});

test("validateChangeObservation rejects invalid relativeChange", () => {
  assert.throws(
    () =>
      validateChangeObservation(
        buildObservation({
          relativeChange: Infinity,
        }),
        0,
      ),
    /relativeChange must be finite or null/,
  );
});

test("valid change detection result passes validation", () => {
  assert.equal(
    validateChangeDetectionResult(buildResult()),
    true,
  );
});

test("missing result is rejected", () => {
  assert.throws(
    () => validateChangeDetectionResult(),
    /Change detection result is required/,
  );
});

test("invalid result type is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          type: "prediction",
        }),
      ),
    /Invalid change detection result type/,
  );
});

test("missing version is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          version: "",
        }),
      ),
    /Change detection result version is required/,
  );
});

test("invalid method is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          method: "prediction",
        }),
      ),
    /Change detection method must be absolute_and_relative_change/,
  );
});

test("missing parameter is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          parameter: null,
        }),
      ),
    /Change detection parameter is required/,
  );
});

test("missing baselineLabel is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          baselineLabel: "",
        }),
      ),
    /Change detection baselineLabel is required/,
  );
});

test("missing comparisonLabel is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          comparisonLabel: "",
        }),
      ),
    /Change detection comparisonLabel is required/,
  );
});

test("negative observationCount is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          observationCount: -1,
          observations: [],
        }),
      ),
    /Change detection observationCount must be non-negative/,
  );
});

test("non-integer observationCount is rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          observationCount: 1.5,
        }),
      ),
    /Change detection observationCount must be non-negative/,
  );
});

test("observations must be an array", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          observations: null,
        }),
      ),
    /Change detection observations must be an array/,
  );
});

test("observationCount must match observation array length", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          observationCount: 2,
        }),
      ),
    /observation count must match observationCount/,
  );
});

test("duplicate observation IDs are rejected", () => {
  assert.throws(
    () =>
      validateChangeDetectionResult(
        buildResult({
          observationCount: 2,
          observations: [
            buildObservation({
              observationId: "S-001",
            }),
            buildObservation({
              observationId: "S-001",
            }),
          ],
        }),
      ),
    /Duplicate change observation: S-001/,
  );
});

test("zero observation count with empty observations is valid", () => {
  assert.equal(
    validateChangeDetectionResult(
      buildResult({
        observationCount: 0,
        observations: [],
      }),
    ),
    true,
  );
});

test("negative absolute change is valid", () => {
  assert.equal(
    validateChangeDetectionResult(
      buildResult({
        observations: [
          buildObservation({
            baselineValue: 125,
            comparisonValue: 100,
            absoluteChange: -25,
            relativeChange: -20,
          }),
        ],
      }),
    ),
    true,
  );
});

test("zero relative change is valid", () => {
  assert.equal(
    validateChangeDetectionResult(
      buildResult({
        observations: [
          buildObservation({
            comparisonValue: 100,
            absoluteChange: 0,
            relativeChange: 0,
          }),
        ],
      }),
    ),
    true,
  );
});

test("additional fields do not invalidate the contract", () => {
  assert.equal(
    validateChangeDetectionResult(
      buildResult({
        metadata: {
          source: "soilAnalysisService",
        },
      }),
    ),
    true,
  );
});

test("contract contains no prediction or recommendation fields", () => {
  const result = buildResult();

  assert.equal("prediction" in result, false);
  assert.equal("forecast" in result, false);
  assert.equal("recommendation" in result, false);
  assert.equal("risk" in result, false);
  assert.equal(
    validateChangeDetectionResult(result),
    true,
  );
});
