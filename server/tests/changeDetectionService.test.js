"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  extractObservationValue,
  buildObservationMap,
  calculateAbsoluteChange,
  calculateRelativeChange,
  buildChangeObservation,
  buildChangeDetectionResult,
} = require("../services/changeDetectionService");

function observation(
  observationId,
  parameter,
  value,
) {
  return {
    observationId,
    values: {
      [parameter]: {
        value,
      },
    },
  };
}

test("parameter definitions contain all supported soil parameters", () => {
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
  assert.equal(isFiniteNumber(10), true);
  assert.equal(isFiniteNumber(-2.5), true);
});

test("isFiniteNumber rejects non-finite values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber("10"), false);
});

test("validateParameter accepts supported parameter", () => {
  assert.deepEqual(
    validateParameter("nitrogen"),
    {
      sourceKey: "nitrogen",
      unit: "kg/ha",
    },
  );
});

test("validateParameter rejects unsupported parameter", () => {
  assert.throws(
    () => validateParameter("temperature"),
    /Unsupported change detection parameter/,
  );
});

test("extractObservationValue returns authoritative value", () => {
  const result = extractObservationValue(
    observation("S-001", "nitrogen", 215),
    "nitrogen",
  );

  assert.equal(result, 215);
});

test("extractObservationValue returns null for missing value", () => {
  const result = extractObservationValue(
    observation("S-001", "nitrogen", null),
    "nitrogen",
  );

  assert.equal(result, null);
});

test("extractObservationValue returns null for non-finite value", () => {
  const result = extractObservationValue(
    observation("S-001", "nitrogen", NaN),
    "nitrogen",
  );

  assert.equal(result, null);
});

test("buildObservationMap includes valid observations", () => {
  const result = buildObservationMap(
    [
      observation("S-002", "nitrogen", 220),
      observation("S-001", "nitrogen", 215),
    ],
    "nitrogen",
  );

  assert.equal(result.get("S-001"), 215);
  assert.equal(result.get("S-002"), 220);
});

test("buildObservationMap excludes missing values", () => {
  const result = buildObservationMap(
    [
      observation("S-001", "nitrogen", 215),
      observation("S-002", "nitrogen", null),
    ],
    "nitrogen",
  );

  assert.equal(result.size, 1);
  assert.equal(result.has("S-001"), true);
  assert.equal(result.has("S-002"), false);
});

test("buildObservationMap skips invalid observation objects", () => {
  const result = buildObservationMap(
    [
      null,
      observation("S-001", "nitrogen", 215),
    ],
    "nitrogen",
  );

  assert.equal(result.size, 1);
});

test("buildObservationMap skips observations without ID", () => {
  const result = buildObservationMap(
    [
      {
        values: {
          nitrogen: { value: 215 },
        },
      },
    ],
    "nitrogen",
  );

  assert.equal(result.size, 0);
});

test("buildObservationMap rejects duplicate observation IDs", () => {
  assert.throws(
    () =>
      buildObservationMap(
        [
          observation("S-001", "nitrogen", 215),
          observation("S-001", "nitrogen", 220),
        ],
        "nitrogen",
      ),
    /Duplicate change observation: S-001/,
  );
});

test("buildObservationMap rejects non-array input", () => {
  assert.throws(
    () => buildObservationMap(null, "nitrogen"),
    /observations must be an array/,
  );
});

test("calculateAbsoluteChange calculates increase", () => {
  assert.equal(
    calculateAbsoluteChange(100, 125),
    25,
  );
});

test("calculateAbsoluteChange calculates decrease", () => {
  assert.equal(
    calculateAbsoluteChange(125, 100),
    -25,
  );
});

test("calculateAbsoluteChange calculates zero change", () => {
  assert.equal(
    calculateAbsoluteChange(100, 100),
    0,
  );
});

test("calculateAbsoluteChange rejects non-finite values", () => {
  assert.throws(
    () => calculateAbsoluteChange(NaN, 100),
    /values must be finite/,
  );
});

test("calculateRelativeChange calculates percentage increase", () => {
  assert.equal(
    calculateRelativeChange(100, 125),
    25,
  );
});

test("calculateRelativeChange calculates percentage decrease", () => {
  assert.equal(
    calculateRelativeChange(200, 150),
    -25,
  );
});

test("calculateRelativeChange calculates zero change", () => {
  assert.equal(
    calculateRelativeChange(100, 100),
    0,
  );
});

test("calculateRelativeChange returns null for zero baseline", () => {
  assert.equal(
    calculateRelativeChange(0, 25),
    null,
  );
});

test("buildChangeObservation creates complete change record", () => {
  assert.deepEqual(
    buildChangeObservation("S-001", 100, 125),
    {
      observationId: "S-001",
      baselineValue: 100,
      comparisonValue: 125,
      absoluteChange: 25,
      relativeChange: 25,
    },
  );
});

test("buildChangeDetectionResult matches observations by ID", () => {
  const result = buildChangeDetectionResult(
    [
      observation("S-001", "nitrogen", 100),
      observation("S-002", "nitrogen", 200),
    ],
    [
      observation("S-001", "nitrogen", 125),
      observation("S-002", "nitrogen", 150),
    ],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal(result.type, "change_detection");
  assert.equal(result.method, "absolute_and_relative_change");
  assert.equal(result.observationCount, 2);
});

test("buildChangeDetectionResult preserves parameter unit", () => {
  const result = buildChangeDetectionResult(
    [observation("S-001", "nitrogen", 100)],
    [observation("S-001", "nitrogen", 125)],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.deepEqual(result.parameter, {
    parameter: "nitrogen",
    unit: "kg/ha",
  });
});

test("buildChangeDetectionResult excludes unmatched baseline observations", () => {
  const result = buildChangeDetectionResult(
    [
      observation("S-001", "nitrogen", 100),
      observation("S-002", "nitrogen", 200),
    ],
    [
      observation("S-001", "nitrogen", 125),
    ],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal(result.observationCount, 1);
  assert.equal(result.observations[0].observationId, "S-001");
});

test("buildChangeDetectionResult excludes unmatched comparison observations", () => {
  const result = buildChangeDetectionResult(
    [
      observation("S-001", "nitrogen", 100),
    ],
    [
      observation("S-001", "nitrogen", 125),
      observation("S-002", "nitrogen", 150),
    ],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal(result.observationCount, 1);
  assert.equal(result.observations[0].observationId, "S-001");
});

test("buildChangeDetectionResult orders observations deterministically", () => {
  const result = buildChangeDetectionResult(
    [
      observation("S-003", "nitrogen", 100),
      observation("S-001", "nitrogen", 100),
      observation("S-002", "nitrogen", 100),
    ],
    [
      observation("S-003", "nitrogen", 120),
      observation("S-001", "nitrogen", 110),
      observation("S-002", "nitrogen", 130),
    ],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.deepEqual(
    result.observations.map(
      (item) => item.observationId,
    ),
    ["S-001", "S-002", "S-003"],
  );
});

test("buildChangeDetectionResult supports zero baseline", () => {
  const result = buildChangeDetectionResult(
    [observation("S-001", "nitrogen", 0)],
    [observation("S-001", "nitrogen", 25)],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal(
    result.observations[0].absoluteChange,
    25,
  );

  assert.equal(
    result.observations[0].relativeChange,
    null,
  );
});

test("buildChangeDetectionResult rejects missing baseline label", () => {
  assert.throws(
    () =>
      buildChangeDetectionResult(
        [observation("S-001", "nitrogen", 100)],
        [observation("S-001", "nitrogen", 125)],
        "nitrogen",
        "",
        "2026",
      ),
    /baselineLabel is required/,
  );
});

test("buildChangeDetectionResult rejects missing comparison label", () => {
  assert.throws(
    () =>
      buildChangeDetectionResult(
        [observation("S-001", "nitrogen", 100)],
        [observation("S-001", "nitrogen", 125)],
        "nitrogen",
        "2025",
        "",
      ),
    /comparisonLabel is required/,
  );
});

test("buildChangeDetectionResult returns zero observations when no IDs match", () => {
  const result = buildChangeDetectionResult(
    [observation("S-001", "nitrogen", 100)],
    [observation("S-002", "nitrogen", 125)],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal(result.observationCount, 0);
  assert.deepEqual(result.observations, []);
});

test("result does not contain prediction fields", () => {
  const result = buildChangeDetectionResult(
    [observation("S-001", "nitrogen", 100)],
    [observation("S-001", "nitrogen", 125)],
    "nitrogen",
    "2025",
    "2026",
  );

  assert.equal("prediction" in result, false);
  assert.equal("forecast" in result, false);
  assert.equal("risk" in result, false);
  assert.equal("recommendation" in result, false);
});
