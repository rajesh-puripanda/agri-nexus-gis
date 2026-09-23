"use strict";

// ============================================================
// server/tests/variogramParameterEstimationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.3.4 — Variogram Estimation Robustness Tests
//
// Built on:
//   Phase 12.2 — Experimental Variogram Parameter Estimation
//
// Responsibilities:
//   1. Validate experimental-lag handling
//   2. Validate deterministic parameter estimation
//   3. Validate variogram model evaluation
//   4. Validate robustness diagnostics
//   5. Validate edge-case warnings
//   6. Protect the scientific estimation contract
//
// IMPORTANT:
//   These tests intentionally do NOT integrate the estimator into
//   interpolationService.js.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
  "../services/interpolation/variogramParameterEstimationService",
);

const {
  DEFAULT_MIN_USABLE_LAGS,
  DEFAULT_NUGGET_LAG_COUNT,
  DEFAULT_SILL_UPPER_FRACTION,
  DEFAULT_RANGE_THRESHOLD,
  DEFAULT_MIN_TOTAL_PAIRS,
  FLAT_VARIOGRAM_TOLERANCE,
  NON_MONOTONIC_DECREASE_RATIO,

  isFiniteNumber,
  isUsableExperimentalLag,
  extractUsableExperimentalLags,
  validateEstimationInput,

  estimateNugget,
  estimateSill,
  estimateRange,
  estimateVariogramParameters,
  evaluateEstimatedModel,

  estimateExperimentalVariogramParameters,
  buildEstimationMethodology,
  analyzeExperimentalVariogramQuality,
  analyzeRangeEstimation,
  buildEstimationWarnings,
} = service;

// ============================================================
// TEST DATA
// ============================================================

function buildExperimentalVariogram() {
  return {
    lags: [
      {
        lagNumber: 1,
        distance: 1000,
        semivariance: 0.20,
        pairCount: 4,
        lowerBound: 500,
        upperBound: 1500,
      },
      {
        lagNumber: 2,
        distance: 2000,
        semivariance: 0.45,
        pairCount: 8,
        lowerBound: 1500,
        upperBound: 2500,
      },
      {
        lagNumber: 3,
        distance: 3000,
        semivariance: 0.70,
        pairCount: 12,
        lowerBound: 2500,
        upperBound: 3500,
      },
      {
        lagNumber: 4,
        distance: 4000,
        semivariance: 0.85,
        pairCount: 14,
        lowerBound: 3500,
        upperBound: 4500,
      },
      {
        lagNumber: 5,
        distance: 5000,
        semivariance: 0.90,
        pairCount: 12,
        lowerBound: 4500,
        upperBound: 5500,
      },
    ],
  };
}

function buildLowPairExperimentalVariogram() {
  const experimental = buildExperimentalVariogram();

  experimental.lags = experimental.lags.map(
    (lag) => ({
      ...lag,
      pairCount: 1,
    }),
  );

  return experimental;
}

function buildFlatExperimentalLags() {
  return [
    {
      lagNumber: 1,
      distance: 1000,
      semivariance: 0.5,
      pairCount: 10,
    },
    {
      lagNumber: 2,
      distance: 2000,
      semivariance: 0.5,
      pairCount: 10,
    },
    {
      lagNumber: 3,
      distance: 3000,
      semivariance: 0.5,
      pairCount: 10,
    },
    {
      lagNumber: 4,
      distance: 4000,
      semivariance: 0.5,
      pairCount: 10,
    },
  ];
}

function buildNonMonotonicExperimentalLags() {
  return [
    {
      lagNumber: 1,
      distance: 1000,
      semivariance: 0.20,
      pairCount: 10,
    },
    {
      lagNumber: 2,
      distance: 2000,
      semivariance: 0.50,
      pairCount: 10,
    },
    {
      lagNumber: 3,
      distance: 3000,
      semivariance: 0.40,
      pairCount: 10,
    },
    {
      lagNumber: 4,
      distance: 4000,
      semivariance: 0.30,
      pairCount: 10,
    },
    {
      lagNumber: 5,
      distance: 5000,
      semivariance: 0.70,
      pairCount: 10,
    },
  ];
}

// ============================================================
// CONSTANTS
// ============================================================

test("Phase 12.2 constants are defined", () => {
  assert.equal(DEFAULT_MIN_USABLE_LAGS, 3);
  assert.equal(DEFAULT_NUGGET_LAG_COUNT, 1);
  assert.equal(DEFAULT_SILL_UPPER_FRACTION, 0.5);
  assert.equal(DEFAULT_RANGE_THRESHOLD, 0.95);
});

test("Phase 12.3 robustness constants are defined", () => {
  assert.equal(DEFAULT_MIN_TOTAL_PAIRS, 10);
  assert.equal(FLAT_VARIOGRAM_TOLERANCE, 1e-12);
  assert.equal(NON_MONOTONIC_DECREASE_RATIO, 0.5);
});

// ============================================================
// FINITE NUMBER VALIDATION
// ============================================================

test("isFiniteNumber accepts finite numbers only", () => {
  assert.equal(isFiniteNumber(1), true);
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber(-1.5), true);
  assert.equal(isFiniteNumber(Number.NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber("1"), false);
  assert.equal(isFiniteNumber(null), false);
});

// ============================================================
// EXPERIMENTAL LAG VALIDATION
// ============================================================

test("valid experimental lag is accepted", () => {
  assert.equal(
    isUsableExperimentalLag({
      distance: 1000,
      semivariance: 0.25,
      pairCount: 5,
    }),
    true,
  );
});

test("experimental lag rejects zero distance", () => {
  assert.equal(
    isUsableExperimentalLag({
      distance: 0,
      semivariance: 0.25,
      pairCount: 5,
    }),
    false,
  );
});

test("experimental lag rejects negative semivariance", () => {
  assert.equal(
    isUsableExperimentalLag({
      distance: 1000,
      semivariance: -0.25,
      pairCount: 5,
    }),
    false,
  );
});

test("experimental lag rejects zero pair count", () => {
  assert.equal(
    isUsableExperimentalLag({
      distance: 1000,
      semivariance: 0.25,
      pairCount: 0,
    }),
    false,
  );
});

test("experimental lag rejects non-integer pair count", () => {
  assert.equal(
    isUsableExperimentalLag({
      distance: 1000,
      semivariance: 0.25,
      pairCount: 2.5,
    }),
    false,
  );
});

// ============================================================
// LAG EXTRACTION
// ============================================================

test("extractUsableExperimentalLags extracts and sorts valid lags", () => {
  const experimental = {
    lags: [
      {
        lagNumber: 3,
        distance: 3000,
        semivariance: 0.7,
        pairCount: 3,
      },
      {
        lagNumber: 1,
        distance: 1000,
        semivariance: 0.2,
        pairCount: 4,
      },
      {
        lagNumber: 2,
        distance: 2000,
        semivariance: 0.4,
        pairCount: 5,
      },
      {
        lagNumber: 4,
        distance: 0,
        semivariance: 0.8,
        pairCount: 5,
      },
    ],
  };

  const result =
    extractUsableExperimentalLags(
      experimental,
    );

  assert.equal(result.length, 3);

  assert.deepEqual(
    result.map(
      (lag) => lag.distance,
    ),
    [1000, 2000, 3000],
  );
});

test("extractUsableExperimentalLags returns empty array for invalid input", () => {
  assert.deepEqual(
    extractUsableExperimentalLags(null),
    [],
  );

  assert.deepEqual(
    extractUsableExperimentalLags({}),
    [],
  );

  assert.deepEqual(
    extractUsableExperimentalLags({
      lags: [],
    }),
    [],
  );
});

// ============================================================
// ESTIMATION INPUT VALIDATION
// ============================================================

test("validateEstimationInput accepts valid spherical input", () => {
  const result =
    validateEstimationInput({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.model.key, "spherical");
  assert.equal(result.usableLags.length, 5);
});

test("validateEstimationInput normalizes model names", () => {
  const result =
    validateEstimationInput({
      experimental:
        buildExperimentalVariogram(),
      model: " SPHERICAL ",
    });

  assert.equal(result.valid, true);
  assert.equal(result.model.key, "spherical");
});

test("validateEstimationInput rejects unsupported model", () => {
  const result =
    validateEstimationInput({
      experimental:
        buildExperimentalVariogram(),
      model: "unsupported",
    });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateEstimationInput rejects insufficient usable lags", () => {
  const result =
    validateEstimationInput({
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

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// ============================================================
// NUGGET
// ============================================================

test("estimateNugget uses the first usable lag by default", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateNugget(lags),
    0.2,
  );
});

test("estimateNugget can average multiple near-origin lags", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateNugget(lags, {
      nuggetLagCount: 2,
    }),
    0.325,
  );
});

test("estimateNugget returns null for empty data", () => {
  assert.equal(
    estimateNugget([]),
    null,
  );
});

// ============================================================
// SILL
// ============================================================

test("estimateSill estimates the upper experimental semivariance", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateSill(lags),
    0.8166666666666665,
  );
});

test("estimateSill supports a custom upper fraction", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateSill(lags, {
      sillUpperFraction: 0.4,
    }),
    0.875,
  );
});

test("estimateSill returns null for invalid fraction", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateSill(lags, {
      sillUpperFraction: 0,
    }),
    null,
  );

  assert.equal(
    estimateSill(lags, {
      sillUpperFraction: 1.1,
    }),
    null,
  );
});

// ============================================================
// RANGE
// ============================================================

test("estimateRange identifies the practical range", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateRange(
      lags,
      0.2,
      0.8166666666666665,
    );

  assert.equal(result, 4000);
});

test("estimateRange supports a custom threshold", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateRange(
      lags,
      0.2,
      0.8166666666666665,
      {
        rangeThreshold: 0.5,
      },
    );

  assert.equal(result, 3000);
});

test("estimateRange falls back to maximum distance when threshold is not reached", () => {
  const lags =
    extractUsableExperimentalLags({
      lags: [
        {
          distance: 1000,
          semivariance: 0.2,
          pairCount: 5,
        },
        {
          distance: 2000,
          semivariance: 0.3,
          pairCount: 5,
        },
        {
          distance: 3000,
          semivariance: 0.4,
          pairCount: 5,
        },
      ],
    });

  const result =
    estimateRange(
      lags,
      0.1,
      1.0,
    );

  assert.equal(result, 3000);
});

test("estimateRange returns null when sill is not greater than nugget", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateRange(
      lags,
      1.0,
      0.5,
    ),
    null,
  );
});

test("estimateRange returns null for invalid threshold", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  assert.equal(
    estimateRange(
      lags,
      0.2,
      0.8,
      {
        rangeThreshold: 0,
      },
    ),
    null,
  );
});

// ============================================================
// PARAMETER ESTIMATION
// ============================================================

test("estimateVariogramParameters returns validated parameters", () => {
  const usableLags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateVariogramParameters({
      usableLags,
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.deepEqual(
    result.parameters,
    {
      nugget: 0.2,
      sill: 0.8166666666666665,
      structuredVariance:
        0.6166666666666665,
      range: 4000,
    },
  );

  assert.equal(
    result.model,
    "spherical",
  );
});

test("estimateVariogramParameters supports exponential model", () => {
  const usableLags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateVariogramParameters({
      usableLags,
      model: "exponential",
    });

  assert.equal(result.success, true);
  assert.equal(
    result.model,
    "exponential",
  );
});

test("estimateVariogramParameters supports gaussian model", () => {
  const usableLags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateVariogramParameters({
      usableLags,
      model: "gaussian",
    });

  assert.equal(result.success, true);
  assert.equal(
    result.model,
    "gaussian",
  );
});

test("estimateVariogramParameters rejects insufficient lags", () => {
  const usableLags =
    extractUsableExperimentalLags({
      lags: [
        {
          distance: 1000,
          semivariance: 0.2,
          pairCount: 5,
        },
      ],
    });

  const result =
    estimateVariogramParameters({
      usableLags,
      model: "spherical",
    });

  assert.equal(result.success, false);
});

// ============================================================
// MODEL EVALUATION
// ============================================================

test("evaluateEstimatedModel evaluates theoretical semivariance", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    evaluateEstimatedModel({
      usableLags: lags,
      model: "spherical",
      parameters: {
        nugget: 0.2,
        sill: 0.8166666666666665,
        range: 4000,
      },
    });

  assert.equal(result.success, true);
  assert.equal(
    result.lags.length,
    lags.length,
  );

  assert.ok(
    Number.isFinite(
      result.weightedSSE,
    ),
  );

  assert.ok(
    Number.isFinite(
      result.weightedRMSE,
    ),
  );

  assert.equal(
    result.totalPairs,
    50,
  );
});

test("evaluateEstimatedModel rejects invalid model", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    evaluateEstimatedModel({
      usableLags: lags,
      model: "unsupported",
      parameters: {
        nugget: 0.2,
        sill: 0.8,
        range: 4000,
      },
    });

  assert.equal(result.success, false);
});

test("evaluateEstimatedModel rejects invalid parameters", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    evaluateEstimatedModel({
      usableLags: lags,
      model: "spherical",
      parameters: {
        nugget: 1,
        sill: 0.5,
        range: 4000,
      },
    });

  assert.equal(result.success, false);
});

// ============================================================
// METHODOLOGY
// ============================================================

test("default estimation methodology is explicit", () => {
  const result =
    buildEstimationMethodology();

  assert.deepEqual(result, {
    strategy:
      "deterministic_initial_estimate",

    nugget: {
      method:
        "near_origin_lag_mean",
      lagCount: 1,
    },

    sill: {
      method:
        "upper_semivariance_fraction_mean",
      upperFraction: 0.5,
    },

    range: {
      method:
        "practical_range_threshold",
      threshold: 0.95,
    },

    optimization: {
      applied: false,
      method: null,
    },
  });
});

test("estimation methodology reflects configured options", () => {
  const result =
    buildEstimationMethodology({
      nuggetLagCount: 2,
      sillUpperFraction: 0.4,
      rangeThreshold: 0.8,
    });

  assert.equal(
    result.nugget.lagCount,
    2,
  );

  assert.equal(
    result.sill.upperFraction,
    0.4,
  );

  assert.equal(
    result.range.threshold,
    0.8,
  );
});

test("estimation methodology is included in parameter result", () => {
  const usableLags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    estimateVariogramParameters({
      usableLags,
      model: "spherical",
      options: {
        nuggetLagCount: 2,
        sillUpperFraction: 0.4,
        rangeThreshold: 0.8,
      },
    });

  assert.equal(result.success, true);

  assert.equal(
    result.estimation.nugget.lagCount,
    2,
  );

  assert.equal(
    result.estimation.sill.upperFraction,
    0.4,
  );

  assert.equal(
    result.estimation.range.threshold,
    0.8,
  );
});

// ============================================================
// COMPLETE ESTIMATION CONTRACT
// ============================================================

test("complete estimation exposes methodology contract", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.deepEqual(
    result.estimation,
    {
      strategy:
        "deterministic_initial_estimate",

      nugget: {
        method:
          "near_origin_lag_mean",
        lagCount: 1,
      },

      sill: {
        method:
          "upper_semivariance_fraction_mean",
        upperFraction: 0.5,
      },

      range: {
        method:
          "practical_range_threshold",
        threshold: 0.95,
      },

      optimization: {
        applied: false,
        method: null,
      },
    },
  );
});

test("complete estimation returns experimental and modeled diagnostics", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);
  assert.ok(
    Array.isArray(
      result.experimental.lags,
    ),
  );
  assert.ok(
    Array.isArray(result.modeled),
  );
  assert.ok(result.fit);

  assert.ok(
    Number.isFinite(
      result.fit.weightedSSE,
    ),
  );

  assert.ok(
    Number.isFinite(
      result.fit.weightedRMSE,
    ),
  );
});

test("complete estimation rejects missing experimental variogram", () => {
  const result =
    estimateExperimentalVariogramParameters({
      model: "spherical",
    });

  assert.equal(result.success, false);
});

test("complete estimation rejects unsupported model", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "unsupported",
    });

  assert.equal(result.success, false);
});

test("complete estimation rejects insufficient experimental data", () => {
  const result =
    estimateExperimentalVariogramParameters({
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
});

// ============================================================
// PHASE 12.3 — DATA QUALITY
// ============================================================

test("quality diagnostics report clean experimental data", () => {
  const experimental =
    buildExperimentalVariogram();

  const lags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      lags,
    );

  assert.deepEqual(result, {
    usableLagCount: 5,
    totalPairCount: 50,
    invalidLagCount: 0,
    duplicateDistanceCount: 0,
    flatVariogram: false,
    nonMonotonicVariogram: false,
    lowPairSupport: false,
  });
});

test("quality diagnostics count invalid lags excluded from estimation", () => {
  const experimental =
    buildExperimentalVariogram();

  experimental.lags.push(
    {
      distance: 0,
      semivariance: 0.3,
      pairCount: 5,
    },
    {
      distance: 6000,
      semivariance: -0.2,
      pairCount: 5,
    },
  );

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.usableLagCount,
    5,
  );

  assert.equal(
    result.invalidLagCount,
    2,
  );
});

test("quality diagnostics detect duplicate distances", () => {
  const experimental =
    buildExperimentalVariogram();

  experimental.lags[4].distance = 4000;

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.duplicateDistanceCount,
    1,
  );
});

test("quality diagnostics detect low pair support", () => {
  const experimental =
    buildLowPairExperimentalVariogram();

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.totalPairCount,
    5,
  );

  assert.equal(
    result.lowPairSupport,
    true,
  );
});

test("quality diagnostics support a custom pair-support threshold", () => {
  const experimental =
    buildExperimentalVariogram();

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
      {
        minTotalPairs: 100,
      },
    );

  assert.equal(
    result.lowPairSupport,
    true,
  );
});

// ============================================================
// PHASE 12.3 — FLAT VARIOGRAM
// ============================================================

test("quality diagnostics detect a flat variogram", () => {
  const experimental = {
    lags:
      buildFlatExperimentalLags(),
  };

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.flatVariogram,
    true,
  );
});

test("quality diagnostics allow a non-flat variogram", () => {
  const experimental =
    buildExperimentalVariogram();

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.flatVariogram,
    false,
  );
});

// ============================================================
// PHASE 12.3 — NON-MONOTONIC VARIOGRAM
// ============================================================

test("quality diagnostics detect strongly non-monotonic semivariance", () => {
  const experimental = {
    lags:
      buildNonMonotonicExperimentalLags(),
  };

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.nonMonotonicVariogram,
    true,
  );
});

test("quality diagnostics do not flag monotonic semivariance", () => {
  const experimental =
    buildExperimentalVariogram();

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  const result =
    analyzeExperimentalVariogramQuality(
      experimental,
      usableLags,
    );

  assert.equal(
    result.nonMonotonicVariogram,
    false,
  );
});

// ============================================================
// PHASE 12.3 — RANGE DIAGNOSTICS
// ============================================================

test("range diagnostics identify practical range", () => {
  const lags =
    extractUsableExperimentalLags(
      buildExperimentalVariogram(),
    );

  const result =
    analyzeRangeEstimation(
      lags,
      0.2,
      0.8166666666666665,
    );

  assert.equal(result.range, 4000);
  assert.equal(
    result.rangeFallbackUsed,
    false,
  );
  assert.equal(
    result.earlyRangeDetection,
    false,
  );
});

test("range diagnostics detect fallback to maximum distance", () => {
  const lags =
    extractUsableExperimentalLags({
      lags: [
        {
          distance: 1000,
          semivariance: 0.2,
          pairCount: 5,
        },
        {
          distance: 2000,
          semivariance: 0.3,
          pairCount: 5,
        },
        {
          distance: 3000,
          semivariance: 0.4,
          pairCount: 5,
        },
      ],
    });

  const result =
    analyzeRangeEstimation(
      lags,
      0.1,
      1.0,
    );

  assert.equal(result.range, 3000);
  assert.equal(
    result.rangeFallbackUsed,
    true,
  );
  assert.equal(
    result.earlyRangeDetection,
    false,
  );
});

test("range diagnostics detect early range", () => {
  const lags =
    extractUsableExperimentalLags({
      lags: [
        {
          distance: 1000,
          semivariance: 0.9,
          pairCount: 5,
        },
        {
          distance: 2000,
          semivariance: 0.95,
          pairCount: 5,
        },
        {
          distance: 3000,
          semivariance: 0.96,
          pairCount: 5,
        },
      ],
    });

  const result =
    analyzeRangeEstimation(
      lags,
      0.2,
      0.9,
    );

  assert.equal(result.range, 1000);
  assert.equal(
    result.rangeFallbackUsed,
    false,
  );
  assert.equal(
    result.earlyRangeDetection,
    true,
  );
});

// ============================================================
// PHASE 12.3 — WARNINGS
// ============================================================

test("clean data produces no estimation warnings", () => {
  const experimental =
    buildExperimentalVariogram();

  const lags =
    extractUsableExperimentalLags(
      experimental,
    );

  const quality =
    analyzeExperimentalVariogramQuality(
      experimental,
      lags,
    );

  const estimationQuality = {
    rangeFallbackUsed: false,
    earlyRangeDetection: false,
    sillNuggetSeparation: true,
  };

  const warnings =
    buildEstimationWarnings({
      dataQuality: quality,
      estimationQuality,
    });

  assert.deepEqual(
    warnings,
    [],
  );
});

test("range fallback produces a warning", () => {
  const quality = {
    usableLagCount: 3,
    totalPairCount: 15,
    invalidLagCount: 0,
    duplicateDistanceCount: 0,
    flatVariogram: false,
    nonMonotonicVariogram: false,
    lowPairSupport: false,
  };

  const estimationQuality = {
    rangeFallbackUsed: true,
    earlyRangeDetection: false,
    sillNuggetSeparation: true,
  };

  const warnings =
    buildEstimationWarnings({
      dataQuality: quality,
      estimationQuality,
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("range"),
    ),
  );
});

test("low pair support produces a warning", () => {
  const quality = {
    usableLagCount: 5,
    totalPairCount: 5,
    invalidLagCount: 0,
    duplicateDistanceCount: 0,
    flatVariogram: false,
    nonMonotonicVariogram: false,
    lowPairSupport: true,
  };

  const estimationQuality = {
    rangeFallbackUsed: false,
    earlyRangeDetection: false,
    sillNuggetSeparation: true,
  };

  const warnings =
    buildEstimationWarnings({
      dataQuality: quality,
      estimationQuality,
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("pair"),
    ),
  );
});

test("invalid lag exclusion produces a warning", () => {
  const warnings =
    buildEstimationWarnings({
      dataQuality: {
        invalidLagCount: 2,
        duplicateDistanceCount: 0,
        lowPairSupport: false,
        flatVariogram: false,
        nonMonotonicVariogram: false,
      },
      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
        sillNuggetSeparation: true,
      },
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("invalid"),
    ),
  );
});

test("duplicate distance produces a warning", () => {
  const warnings =
    buildEstimationWarnings({
      dataQuality: {
        invalidLagCount: 0,
        duplicateDistanceCount: 1,
        lowPairSupport: false,
        flatVariogram: false,
        nonMonotonicVariogram: false,
      },
      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
        sillNuggetSeparation: true,
      },
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("duplicate"),
    ),
  );
});

test("flat variogram produces a warning", () => {
  const warnings =
    buildEstimationWarnings({
      dataQuality: {
        invalidLagCount: 0,
        duplicateDistanceCount: 0,
        lowPairSupport: false,
        flatVariogram: true,
        nonMonotonicVariogram: false,
      },
      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
        sillNuggetSeparation: true,
      },
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("flat"),
    ),
  );
});

test("non-monotonic variogram produces a warning", () => {
  const warnings =
    buildEstimationWarnings({
      dataQuality: {
        invalidLagCount: 0,
        duplicateDistanceCount: 0,
        lowPairSupport: false,
        flatVariogram: false,
        nonMonotonicVariogram: true,
      },
      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
        sillNuggetSeparation: true,
      },
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("monotonic"),
    ),
  );
});

test("early range detection produces a warning", () => {
  const warnings =
    buildEstimationWarnings({
      dataQuality: {
        invalidLagCount: 0,
        duplicateDistanceCount: 0,
        lowPairSupport: false,
        flatVariogram: false,
        nonMonotonicVariogram: false,
      },
      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: true,
        sillNuggetSeparation: true,
      },
    });

  assert.ok(
    warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("first usable lag"),
    ),
  );
});

// ============================================================
// PHASE 12.3 — COMPLETE ROBUSTNESS CONTRACT
// ============================================================

test("complete estimation exposes data-quality diagnostics", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.deepEqual(
    result.diagnostics.dataQuality,
    {
      usableLagCount: 5,
      totalPairCount: 50,
      invalidLagCount: 0,
      duplicateDistanceCount: 0,
      flatVariogram: false,
      nonMonotonicVariogram: false,
      lowPairSupport: false,
    },
  );
});

test("complete estimation exposes estimation-quality diagnostics", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.equal(
    result.diagnostics
      .estimationQuality
      .rangeFallbackUsed,
    false,
  );

  assert.equal(
    result.diagnostics
      .estimationQuality
      .earlyRangeDetection,
    false,
  );

  assert.equal(
    result.diagnostics
      .estimationQuality
      .sillNuggetSeparation,
    true,
  );
});

test("complete estimation exposes warnings array", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);
  assert.ok(
    Array.isArray(result.warnings),
  );
  assert.deepEqual(
    result.warnings,
    [],
  );
});

test("complete estimation reports invalid lags without silently correcting them", () => {
  const experimental =
    buildExperimentalVariogram();

  experimental.lags.push({
    distance: 0,
    semivariance: 0.5,
    pairCount: 5,
  });

  const result =
    estimateExperimentalVariogramParameters({
      experimental,
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.equal(
    result.diagnostics.dataQuality
      .invalidLagCount,
    1,
  );

  assert.equal(
    result.diagnostics.dataQuality
      .usableLagCount,
    5,
  );

  assert.ok(
    result.warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("invalid"),
    ),
  );
});

test("complete estimation reports low pair support", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildLowPairExperimentalVariogram(),
      model: "spherical",
      options: {
        minTotalPairs: 10,
      },
    });

  assert.equal(result.success, true);

  assert.equal(
    result.diagnostics.dataQuality
      .lowPairSupport,
    true,
  );

  assert.ok(
    result.warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("pair"),
    ),
  );
});

test("complete estimation reports duplicate distances", () => {
  const experimental =
    buildExperimentalVariogram();

  experimental.lags[4].distance = 4000;

  const result =
    estimateExperimentalVariogramParameters({
      experimental,
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.equal(
    result.diagnostics.dataQuality
      .duplicateDistanceCount,
    1,
  );

  assert.ok(
    result.warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("duplicate"),
    ),
  );
});

test("complete estimation reports non-monotonic variogram warning", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental: {
        lags:
          buildNonMonotonicExperimentalLags(),
      },
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.equal(
    result.diagnostics.dataQuality
      .nonMonotonicVariogram,
    true,
  );

  assert.ok(
    result.warnings.some(
      (warning) =>
        warning
          .toLowerCase()
          .includes("monotonic"),
    ),
  );
});

test("complete estimation reports flat variogram warning", () => {
  const experimental = {
    lags: [
      { distance: 1000, semivariance: 0.5, pairCount: 10 },
      { distance: 2000, semivariance: 0.5, pairCount: 10 },
      { distance: 3000, semivariance: 0.5, pairCount: 10 },
      { distance: 4000, semivariance: 0.5, pairCount: 10 },
      { distance: 5000, semivariance: 0.5, pairCount: 10 },
    ],
  };

  const result = estimateExperimentalVariogramParameters({
    experimental,
    model: "spherical",
  });

  assert.equal(result.success, false);
  assert.ok(result.diagnostics);
  assert.ok(result.diagnostics.dataQuality);
  assert.equal(result.diagnostics.dataQuality.flatVariogram, true);
  assert.ok(Array.isArray(result.warnings));
  assert.ok(
    result.warnings.some((warning) =>
      warning.toLowerCase().includes("flat"),
    ),
  );
});

test("complete estimation preserves deterministic estimation strategy", () => {
  const result =
    estimateExperimentalVariogramParameters({
      experimental:
        buildExperimentalVariogram(),
      model: "spherical",
    });

  assert.equal(result.success, true);

  assert.equal(
    result.estimation.strategy,
    "deterministic_initial_estimate",
  );

  assert.equal(
    result.estimation.optimization
      .applied,
    false,
  );

  assert.equal(
    result.estimation.optimization
      .method,
    null,
  );
});