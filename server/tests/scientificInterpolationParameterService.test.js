"use strict";

// ============================================================
// server/tests/scientificInterpolationParameterService.test.js
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveScientificKrigingParameters,
  resolveScientificInterpolationParameters,
} = require("../services/interpolation/scientificInterpolationParameterService");

// ============================================================
// TEST DATA
// ============================================================

function createSoilObservations() {
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
      value: 245,
    },
    {
      latitude: 17.7300,
      longitude: 83.3300,
      value: 260,
    },
    {
      latitude: 17.7400,
      longitude: 83.3400,
      value: 275,
    },
    {
      latitude: 17.7500,
      longitude: 83.3500,
      value: 290,
    },
  ];
}

// ============================================================
// SUCCESS
// ============================================================

test("scientific Kriging pipeline resolves parameters from soil observations", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "nitrogen",
      points: createSoilObservations(),
      model: "spherical",
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");
  assert.equal(result.parameter, "nitrogen");

  assert.ok(result.parameters);
  assert.equal(
    result.parameters.model,
    "spherical",
  );

  assert.ok(
    Number.isFinite(result.parameters.nugget),
  );

  assert.ok(
    Number.isFinite(result.parameters.sill),
  );

  assert.ok(
    Number.isFinite(result.parameters.range),
  );

  assert.deepEqual(result.source, {
    type: "estimated",
    estimated: true,
  });

  assert.ok(result.diagnostics);
  assert.ok(result.diagnostics.input);
  assert.equal(
    result.diagnostics.input.validSampleCount,
    6,
  );
});

// ============================================================
// AUTOMATIC SAMPLE COUNT
// ============================================================

test("scientific pipeline derives sample count from observations", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "ph",
      points: createSoilObservations(),
    });

  assert.equal(result.success, true);
  assert.equal(
    result.diagnostics.input.sampleCount,
    6,
  );
});

// ============================================================
// INVALID OBSERVATIONS ARE TRANSPARENT
// ============================================================

test("scientific pipeline preserves invalid observation diagnostics", () => {
  const points = [
    ...createSoilObservations(),
    {
      latitude: "invalid",
      longitude: 83.3600,
      value: 300,
    },
  ];

  const result =
    resolveScientificKrigingParameters({
      parameter: "potassium",
      points,
    });

  assert.equal(result.success, true);
  assert.equal(
    result.diagnostics.input.sampleCount,
    7,
  );
  assert.equal(
    result.diagnostics.input.validSampleCount,
    6,
  );
  assert.equal(
    result.diagnostics.input.invalidSampleCount,
    1,
  );
});

// ============================================================
// VARIOGRAM OPTIONS ARE PROPAGATED
// ============================================================

test("scientific pipeline propagates variogram options", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "phosphorus",
      points: createSoilObservations(),
      variogramOptions: {
        lagCount: 6,
        toleranceRatio: 0.5,
      },
    });

  assert.equal(result.success, true);
  assert.ok(result.diagnostics.input);
});

// ============================================================
// ESTIMATION OPTIONS ARE PROPAGATED
// ============================================================

test("scientific pipeline propagates estimation options", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "organic_carbon",
      points: createSoilObservations(),
      estimationOptions: {
        sillUpperFraction: 0.4,
        rangeThreshold: 0.95,
      },
    });

  assert.equal(result.success, true);
  assert.ok(result.parameters);
  assert.ok(result.diagnostics.estimation);
});

// ============================================================
// MODEL NORMALIZATION
// ============================================================

test("scientific pipeline accepts normalized variogram model aliases", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "electrical_conductivity",
      points: createSoilObservations(),
      model: "SPHERICAL",
    });

  assert.equal(result.success, true);
  assert.equal(
    result.parameters.model,
    "spherical",
  );
});

// ============================================================
// FAILURE  TOO FEW OBSERVATIONS
// ============================================================

test("scientific pipeline fails with insufficient observations", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "nitrogen",
      points: [
        {
          latitude: 17.7000,
          longitude: 83.3000,
          value: 200,
        },
      ],
    });

  assert.equal(result.success, false);
  assert.equal(result.method, "kriging");
  assert.equal(result.parameters, null);

  assert.deepEqual(result.source, {
    type: "estimated",
    estimated: true,
  });

  assert.match(
    result.error,
    /at least two valid soil observations/i,
  );
});

// ============================================================
// FAILURE  INVALID POINT COLLECTION
// ============================================================

test("scientific pipeline fails for non-array observations", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "nitrogen",
      points: null,
    });

  assert.equal(result.success, false);
  assert.equal(result.parameters, null);
  assert.match(
    result.error,
    /points must be an array/i,
  );
});

// ============================================================
// FAILURE  INVALID MODEL
// ============================================================

test("scientific pipeline fails for unsupported model", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "nitrogen",
      points: createSoilObservations(),
      model: "unsupported_model",
    });

  assert.equal(result.success, false);
  assert.equal(result.parameters, null);
  assert.match(
    result.error,
    /unsupported Kriging variogram model/i,
  );
});

// ============================================================
// NO SILENT DEFAULT FALLBACK
// ============================================================

test("scientific pipeline never falls back to configured defaults", () => {
  const result =
    resolveScientificKrigingParameters({
      parameter: "nitrogen",
      points: [
        {
          latitude: 17.7000,
          longitude: 83.3000,
          value: 200,
        },
        {
          latitude: 17.7000,
          longitude: 83.3000,
          value: 200,
        },
      ],
    });

  assert.equal(result.success, false);
  assert.equal(result.parameters, null);

  assert.notDeepEqual(result.parameters, {
    model: "spherical",
    nugget: 0.1,
    sill: 1.0,
    range: 2000,
  });
});

// ============================================================
// GENERIC DISPATCH
// ============================================================

test("generic scientific resolver dispatches Kriging", () => {
  const result =
    resolveScientificInterpolationParameters({
      method: "kriging",
      parameter: "nitrogen",
      points: createSoilObservations(),
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");
  assert.equal(
    result.source.type,
    "estimated",
  );
});

// ============================================================
// GENERIC DISPATCH FAILURE
// ============================================================

test("generic scientific resolver rejects unsupported methods", () => {
  const result =
    resolveScientificInterpolationParameters({
      method: "idw",
      parameter: "nitrogen",
      points: createSoilObservations(),
    });

  assert.equal(result.success, false);
  assert.equal(result.parameters, null);

  assert.match(
    result.error,
    /unsupported scientific interpolation parameter method/i,
  );
});

// ============================================================
// MISSING METHOD
// ============================================================

test("generic scientific resolver requires a method", () => {
  const result =
    resolveScientificInterpolationParameters({
      parameter: "nitrogen",
      points: createSoilObservations(),
    });

  assert.equal(result.success, false);
  assert.equal(result.method, null);

  assert.match(
    result.error,
    /interpolation method is required/i,
  );
});
