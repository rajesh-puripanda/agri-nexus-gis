"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isFiniteNumber,
  isValidObservation,
  extractValidObservations,
  buildExperimentalVariogram,
} = require("../services/interpolation/experimentalVariogramService");

// ============================================================
// TEST DATA
// ============================================================

function createPoints() {
  return [
    {
      latitude: 17.7000,
      longitude: 83.3000,
      value: 200,
    },
    {
      latitude: 17.7100,
      longitude: 83.3100,
      value: 220,
    },
    {
      latitude: 17.7200,
      longitude: 83.3200,
      value: 240,
    },
  ];
}

// ============================================================
// NUMERIC VALIDATION
// ============================================================

test("finite numeric values are recognized", () => {
  assert.equal(isFiniteNumber(10), true);
  assert.equal(isFiniteNumber("10"), true);
  assert.equal(isFiniteNumber("abc"), false);
  assert.equal(isFiniteNumber(Infinity), false);
});

// ============================================================
// OBSERVATION VALIDATION
// ============================================================

test("valid observation is accepted", () => {
  assert.equal(
    isValidObservation({
      latitude: 17.7,
      longitude: 83.3,
      value: 200,
    }),
    true,
  );
});

test("numeric-string observation is accepted", () => {
  assert.equal(
    isValidObservation({
      latitude: "17.7",
      longitude: "83.3",
      value: "200",
    }),
    true,
  );
});

test("invalid latitude is rejected", () => {
  assert.equal(
    isValidObservation({
      latitude: 100,
      longitude: 83.3,
      value: 200,
    }),
    false,
  );
});

test("invalid longitude is rejected", () => {
  assert.equal(
    isValidObservation({
      latitude: 17.7,
      longitude: 200,
      value: 200,
    }),
    false,
  );
});

test("invalid value is rejected", () => {
  assert.equal(
    isValidObservation({
      latitude: 17.7,
      longitude: 83.3,
      value: "invalid",
    }),
    false,
  );
});

// ============================================================
// EXTRACTION
// ============================================================

test("valid observations are normalized to numbers", () => {
  const result = extractValidObservations([
    {
      latitude: "17.7",
      longitude: "83.3",
      value: "200",
    },
  ]);

  assert.deepEqual(result, {
    observations: [
      {
        latitude: 17.7,
        longitude: 83.3,
        value: 200,
      },
    ],
    invalidCount: 0,
  });
});

test("invalid observations are excluded and counted", () => {
  const result = extractValidObservations([
    createPoints()[0],
    {
      latitude: 999,
      longitude: 83.3,
      value: 200,
    },
  ]);

  assert.equal(result.observations.length, 1);
  assert.equal(result.invalidCount, 1);
});

// ============================================================
// EXPERIMENTAL VARIOGRAM
// ============================================================

test("builds experimental variogram from valid observations", () => {
  const result =
    buildExperimentalVariogram({
      points: createPoints(),
      options: {
        lagCount: 4,
        toleranceRatio: 0.5,
      },
    });

  assert.equal(result.success, true);
  assert.ok(result.experimental);
  assert.ok(Array.isArray(result.experimental.lags));
  assert.equal(
    result.diagnostics.sampleCount,
    3,
  );
  assert.equal(
    result.diagnostics.validSampleCount,
    3,
  );
  assert.equal(
    result.diagnostics.invalidSampleCount,
    0,
  );
  assert.equal(
    result.diagnostics.distanceMetric,
    "local_euclidean",
  );
  assert.equal(
    result.diagnostics.distanceUnit,
    "metres",
  );
});

test("numeric-string observations build successfully", () => {
  const result =
    buildExperimentalVariogram({
      points: [
        {
          latitude: "17.7000",
          longitude: "83.3000",
          value: "200",
        },
        {
          latitude: "17.7100",
          longitude: "83.3100",
          value: "220",
        },
      ],
    });

  assert.equal(result.success, true);
  assert.equal(
    result.diagnostics.validSampleCount,
    2,
  );
});

test("invalid observations are reported", () => {
  const result =
    buildExperimentalVariogram({
      points: [
        createPoints()[0],
        {
          latitude: 999,
          longitude: 83.3,
          value: 200,
        },
        createPoints()[1],
      ],
    });

  assert.equal(result.success, true);
  assert.equal(
    result.diagnostics.sampleCount,
    3,
  );
  assert.equal(
    result.diagnostics.validSampleCount,
    2,
  );
  assert.equal(
    result.diagnostics.invalidSampleCount,
    1,
  );
});

test("fewer than two valid observations fail", () => {
  const result =
    buildExperimentalVariogram({
      points: [
        createPoints()[0],
        {
          latitude: 999,
          longitude: 83.3,
          value: 200,
        },
      ],
    });

  assert.equal(result.success, false);
  assert.equal(result.experimental, null);
  assert.match(
    result.error,
    /at least two valid soil observations/i,
  );
});

test("non-array input fails", () => {
  const result =
    buildExperimentalVariogram({
      points: null,
    });

  assert.equal(result.success, false);
  assert.equal(result.experimental, null);
  assert.equal(
    result.error,
    "points must be an array.",
  );
});

// ============================================================
// OPTION PROPAGATION
// ============================================================

test("variogram options are propagated", () => {
  const result =
    buildExperimentalVariogram({
      points: createPoints(),
      options: {
        lagCount: 5,
        toleranceRatio: 0.25,
      },
    });

  assert.equal(result.success, true);
  assert.equal(
    result.experimental.lagCount,
    5,
  );
  assert.equal(
    result.experimental.toleranceRatio,
    0.25,
  );
});
