"use strict";

// ============================================================
// server/tests/interpolationParameterService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.4.1 — Scientific Interpolation Parameter Integration
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_KRIGING_PARAMETERS,
  SUPPORTED_PARAMETER_METHODS,
  validateSampleCount,
  resolveKrigingParameters,
  resolveEstimatedKrigingParameters,
  resolveInterpolationParameters,
} = require("../services/interpolation/interpolationParameterService");

// ============================================================
// TEST EXPERIMENTAL VARIOGRAM
// ============================================================

function createExperimentalVariogram() {
  return {
    lags: [
      {
        distance: 1000,
        semivariance: 0.20,
        pairCount: 4,
      },
      {
        distance: 2000,
        semivariance: 0.45,
        pairCount: 8,
      },
      {
        distance: 3000,
        semivariance: 0.70,
        pairCount: 12,
      },
      {
        distance: 4000,
        semivariance: 0.85,
        pairCount: 14,
      },
      {
        distance: 5000,
        semivariance: 0.90,
        pairCount: 12,
      },
    ],
  };
}

// ============================================================
// DEFAULTS
// ============================================================

test("Kriging default parameters are defined", () => {
  assert.deepEqual(
    DEFAULT_KRIGING_PARAMETERS,
    {
      model: "spherical",
      nugget: 0.1,
      sill: 1.0,
      range: 2000,
    },
  );
});

test("Kriging is a supported parameter-resolution method", () => {
  assert.equal(
    SUPPORTED_PARAMETER_METHODS.kriging,
    "kriging",
  );
});

// ============================================================
// SAMPLE COUNT
// ============================================================

test("sample count accepts an integer", () => {
  const result =
    validateSampleCount(10);

  assert.equal(result.valid, true);
  assert.equal(result.sampleCount, 10);
});

test("sample count accepts omitted value", () => {
  const result =
    validateSampleCount();

  assert.equal(result.valid, true);
  assert.equal(result.sampleCount, null);
});

test("sample count rejects negative values", () => {
  const result =
    validateSampleCount(-1);

  assert.equal(result.valid, false);
});

test("sample count rejects non-integer values", () => {
  const result =
    validateSampleCount(2.5);

  assert.equal(result.valid, false);
});

// ============================================================
// CONFIGURED KRIGING
// ============================================================

test("Kriging resolves configured default parameters", () => {
  const result =
    resolveKrigingParameters({
      parameter: "nitrogen",
      sampleCount: 10,
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");
  assert.equal(result.parameter, "nitrogen");

  assert.deepEqual(
    result.parameters,
    {
      model: "spherical",
      nugget: 0.1,
      sill: 1.0,
      range: 2000,
    },
  );

  assert.deepEqual(
    result.source,
    {
      type: "configured",
      estimated: false,
    },
  );

  assert.equal(
    result.diagnostics.sampleCount,
    10,
  );
});

test("Kriging resolves explicitly configured parameters", () => {
  const result =
    resolveKrigingParameters({
      parameter: "ph",
      sampleCount: 6,
      parameters: {
        model: "gaussian",
        nugget: 0.2,
        sill: 2.5,
        range: 1500,
      },
    });

  assert.equal(result.success, true);

  assert.deepEqual(
    result.parameters,
    {
      model: "gaussian",
      nugget: 0.2,
      sill: 2.5,
      range: 1500,
    },
  );
});

test("Kriging normalizes the variogram model", () => {
  const result =
    resolveKrigingParameters({
      parameters: {
        model: "  GAUSSIAN ",
        nugget: 0,
        sill: 1,
        range: 1000,
      },
    });

  assert.equal(result.success, true);
  assert.equal(
    result.parameters.model,
    "gaussian",
  );
});

test("Kriging rejects unsupported model", () => {
  const result =
    resolveKrigingParameters({
      parameters: {
        model: "unsupported",
        nugget: 0,
        sill: 1,
        range: 1000,
      },
    });

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /Unsupported Kriging variogram model/,
  );
});

test("Kriging rejects invalid parameters", () => {
  const result =
    resolveKrigingParameters({
      parameters: {
        model: "spherical",
        nugget: 2,
        sill: 1,
        range: 1000,
      },
    });

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /Invalid Kriging variogram parameters/,
  );

  assert.ok(
    Array.isArray(result.errors),
  );
});

test("Kriging rejects invalid sample count", () => {
  const result =
    resolveKrigingParameters({
      sampleCount: -2,
    });

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /Sample count must be a non-negative integer/,
  );
});

// ============================================================
// ESTIMATED KRIGING
// ============================================================

test("estimated Kriging resolves experimental variogram parameters", () => {
  const result =
    resolveEstimatedKrigingParameters({
      parameter: "nitrogen",
      sampleCount: 10,
      experimental:
        createExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");
  assert.equal(result.parameter, "nitrogen");

  assert.deepEqual(
    result.parameters,
    {
      model: "spherical",
      nugget: 0.20,
      sill:
        0.8166666666666665,
      range: 4000,
    },
  );

  assert.deepEqual(
    result.source,
    {
      type: "estimated",
      estimated: true,
    },
  );

  assert.equal(
    result.diagnostics.sampleCount,
    10,
  );

  assert.ok(
    result.diagnostics.estimation,
  );

  assert.ok(
    result.diagnostics.dataQuality,
  );

  assert.ok(
    result.diagnostics.estimationQuality,
  );

  assert.ok(
    result.diagnostics.fit,
  );

  assert.ok(
    Number.isFinite(
      result.diagnostics.fit.weightedSSE,
    ),
  );

  assert.ok(
    Number.isFinite(
      result.diagnostics.fit.weightedRMSE,
    ),
  );

  assert.equal(
    result.diagnostics.fit.totalPairs,
    50,
  );
});

test("estimated Kriging supports estimation options", () => {
  const result =
    resolveEstimatedKrigingParameters({
      parameter: "ph",
      sampleCount: 10,
      experimental:
        createExperimentalVariogram(),
      model: "spherical",
      estimationOptions: {
        sillUpperFraction: 0.4,
        rangeThreshold: 0.95,
      },
    });

  assert.equal(result.success, true);

  assert.equal(
    result.parameters.sill,
    0.875,
  );

  assert.equal(
    result.parameters.range,
    4000,
  );
});

test("estimated Kriging rejects invalid experimental data", () => {
  const result =
    resolveEstimatedKrigingParameters({
      parameter: "nitrogen",
      sampleCount: 2,
      experimental: {
        lags: [
          {
            distance: 1000,
            semivariance: 0.2,
            pairCount: 5,
          },
        ],
      },
      model: "spherical",
    });

  assert.equal(result.success, false);

  assert.deepEqual(
    result.source,
    {
      type: "estimated",
      estimated: true,
    },
  );

  assert.ok(
    result.diagnostics,
  );

  assert.ok(
    Array.isArray(result.warnings),
  );
});

test("estimated Kriging does not silently fall back to configured defaults", () => {
  const result =
    resolveEstimatedKrigingParameters({
      parameter: "nitrogen",
      sampleCount: 10,
      experimental: {
        lags: [],
      },
      model: "spherical",
    });

  assert.equal(result.success, false);
  assert.equal(result.parameters, null);

  assert.equal(
    result.source.type,
    "estimated",
  );

  assert.equal(
    result.source.estimated,
    true,
  );
});

// ============================================================
// GENERIC RESOLUTION
// ============================================================

test("generic resolution dispatches configured Kriging", () => {
  const result =
    resolveInterpolationParameters({
      method: "kriging",
      parameter: "potassium",
      sampleCount: 5,
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");

  assert.equal(
    result.source.type,
    "configured",
  );
});

test("generic resolution dispatches estimated Kriging", () => {
  const result =
    resolveInterpolationParameters({
      method: "kriging",
      parameter: "nitrogen",
      sampleCount: 10,
      estimation: true,
      experimental:
        createExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");

  assert.equal(
    result.source.type,
    "estimated",
  );

  assert.equal(
    result.source.estimated,
    true,
  );

  assert.equal(
    result.parameters.nugget,
    0.20,
  );

  assert.equal(
    result.parameters.range,
    4000,
  );
});

test("generic resolution normalizes method name", () => {
  const result =
    resolveInterpolationParameters({
      method: " KRIGING ",
      parameter: "ph",
    });

  assert.equal(result.success, true);
  assert.equal(result.method, "kriging");
});

test("generic resolution rejects missing method", () => {
  const result =
    resolveInterpolationParameters({
      parameter: "ph",
    });

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /Interpolation method is required/,
  );
});

test("generic resolution rejects unsupported method", () => {
  const result =
    resolveInterpolationParameters({
      method: "idw",
      parameter: "ph",
    });

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /Unsupported interpolation parameter method/,
  );
});