"use strict";

// ============================================================
// server/services/interpolation/variogramParameterEstimationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.3.2 — Variogram Estimation Robustness
//
// Responsibilities:
//   1. Validate experimental variogram input
//   2. Extract usable experimental lag observations
//   3. Estimate nugget / sill / practical range
//   4. Calculate structured variance
//   5. Validate estimated parameters
//   6. Evaluate theoretical-model fit diagnostics
//   7. Expose deterministic estimation methodology
//   8. Report experimental variogram quality diagnostics
//   9. Report estimation-quality warnings
//
// Does NOT:
//   - modify interpolationService.js
//   - perform Kriging
//   - replace configured interpolation parameters
//   - automatically select a variogram model
//   - perform numerical optimization
//   - force experimental variogram monotonicity
//
// Scientific authority:
//   variogram.js
//
// ============================================================

const {
  normalizeVariogramModel,
  validateVariogramParameters,
  calculateStructuredVariance,
  evaluateVariogram,
} = require("./variogram");

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_MIN_USABLE_LAGS = 3;
const MIN_USABLE_LAGS = 2;

const DEFAULT_NUGGET_LAG_COUNT = 1;
const DEFAULT_SILL_UPPER_FRACTION = 0.5;
const DEFAULT_RANGE_THRESHOLD = 0.95;

const DEFAULT_MIN_TOTAL_PAIRS = 10;

const FLAT_VARIOGRAM_TOLERANCE = 1e-12;

const NON_MONOTONIC_DECREASE_RATIO = 0.5;

// ============================================================
// NUMERIC HELPERS
// ============================================================

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function toFiniteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

// ============================================================
// ESTIMATION METHODOLOGY
// ============================================================

function buildEstimationMethodology(
  options = {},
) {
  const nuggetLagCount = Number(
    options.nuggetLagCount ??
      DEFAULT_NUGGET_LAG_COUNT,
  );

  const sillUpperFraction = Number(
    options.sillUpperFraction ??
      DEFAULT_SILL_UPPER_FRACTION,
  );

  const rangeThreshold = Number(
    options.rangeThreshold ??
      DEFAULT_RANGE_THRESHOLD,
  );

  return {
    strategy:
      "deterministic_initial_estimate",

    nugget: {
      method:
        "near_origin_lag_mean",

      lagCount:
        Number.isInteger(
          nuggetLagCount,
        ) &&
        nuggetLagCount >= 1
          ? nuggetLagCount
          : DEFAULT_NUGGET_LAG_COUNT,
    },

    sill: {
      method:
        "upper_semivariance_fraction_mean",

      upperFraction:
        Number.isFinite(
          sillUpperFraction,
        ) &&
        sillUpperFraction > 0 &&
        sillUpperFraction <= 1
          ? sillUpperFraction
          : DEFAULT_SILL_UPPER_FRACTION,
    },

    range: {
      method:
        "practical_range_threshold",

      threshold:
        Number.isFinite(
          rangeThreshold,
        ) &&
        rangeThreshold > 0 &&
        rangeThreshold <= 1
          ? rangeThreshold
          : DEFAULT_RANGE_THRESHOLD,
    },

    optimization: {
      applied: false,
      method: null,
    },
  };
}

// ============================================================
// EXPERIMENTAL LAG VALIDATION
// ============================================================

function isUsableExperimentalLag(lag) {
  if (
    !lag ||
    typeof lag !== "object"
  ) {
    return false;
  }

  const distance =
    toFiniteNumber(
      lag.distance,
    );

  const semivariance =
    toFiniteNumber(
      lag.semivariance,
    );

  const pairCount =
    Number(lag.pairCount);

  return (
    distance !== null &&
    distance > 0 &&
    semivariance !== null &&
    semivariance >= 0 &&
    Number.isInteger(pairCount) &&
    pairCount > 0
  );
}

// ============================================================
// USABLE LAG EXTRACTION
// ============================================================

function extractUsableExperimentalLags(
  experimental,
) {
  if (
    !experimental ||
    typeof experimental !== "object" ||
    !Array.isArray(experimental.lags)
  ) {
    return [];
  }

  return experimental.lags
    .filter(isUsableExperimentalLag)
    .map((lag, index) => ({
      lagNumber:
        lag.lagNumber ??
        index + 1,

      distance:
        Number(lag.distance),

      semivariance:
        Number(lag.semivariance),

      pairCount:
        Number(lag.pairCount),

      lowerBound:
        toFiniteNumber(
          lag.lowerBound,
        ),

      upperBound:
        toFiniteNumber(
          lag.upperBound,
        ),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance,
    );
}

// ============================================================
// INPUT VALIDATION
// ============================================================

function validateEstimationInput({
  experimental,
  model,
  minUsableLags =
    DEFAULT_MIN_USABLE_LAGS,
} = {}) {
  const errors = [];

  if (
    !experimental ||
    typeof experimental !== "object"
  ) {
    errors.push(
      "A valid experimental variogram is required.",
    );
  }

  const normalizedModel =
    normalizeVariogramModel(model);

  if (!normalizedModel) {
    errors.push(
      "A supported variogram model is required.",
    );
  }

  const minimum =
    Number(minUsableLags);

  if (
    !Number.isInteger(minimum) ||
    minimum < MIN_USABLE_LAGS
  ) {
    errors.push(
      `minUsableLags must be an integer greater than or equal to ${MIN_USABLE_LAGS}.`,
    );
  }

  const usableLags =
    extractUsableExperimentalLags(
      experimental,
    );

  if (
    Number.isInteger(minimum) &&
    minimum >= MIN_USABLE_LAGS &&
    usableLags.length < minimum
  ) {
    errors.push(
      `At least ${minimum} usable experimental lags are required.`,
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,

    model:
      normalizedModel,

    usableLags,

    minUsableLags:
      Number.isInteger(minimum)
        ? minimum
        : null,
  };
}

// ============================================================
// EXPERIMENTAL VARIOGRAM QUALITY DIAGNOSTICS
// ============================================================

function analyzeExperimentalVariogramQuality(
  experimental,
  usableLags,
  options = {},
) {
  const rawLags =
    experimental &&
    Array.isArray(
      experimental.lags,
    )
      ? experimental.lags
      : [];

  const validLags =
    Array.isArray(usableLags)
      ? usableLags
      : [];

  const invalidLagCount =
    Math.max(
      0,
      rawLags.length -
        validLags.length,
    );

  let duplicateDistanceCount = 0;

  for (
    let index = 1;
    index < validLags.length;
    index += 1
  ) {
    if (
      validLags[index].distance ===
      validLags[index - 1].distance
    ) {
      duplicateDistanceCount += 1;
    }
  }

  const totalPairCount =
    validLags.reduce(
      (sum, lag) =>
        sum + lag.pairCount,
      0,
    );

  const minimumPairCount =
    Number(
      options.minTotalPairs ??
        DEFAULT_MIN_TOTAL_PAIRS,
    );

  const lowPairSupport =
    Number.isFinite(
      minimumPairCount,
    ) &&
    minimumPairCount > 0 &&
    totalPairCount <
      minimumPairCount;

  const semivariances =
    validLags.map(
      (lag) =>
        lag.semivariance,
    );

  let flatVariogram = false;

  if (
    semivariances.length > 1
  ) {
    const minimum =
      Math.min(
        ...semivariances,
      );

    const maximum =
      Math.max(
        ...semivariances,
      );

    flatVariogram =
      Math.abs(
        maximum - minimum,
      ) <=
      FLAT_VARIOGRAM_TOLERANCE;
  }

  let decreasingTransitions = 0;

  for (
    let index = 1;
    index <
    semivariances.length;
    index += 1
  ) {
    if (
      semivariances[index] <
      semivariances[index - 1]
    ) {
      decreasingTransitions += 1;
    }
  }

  const transitionCount =
    Math.max(
      0,
      semivariances.length - 1,
    );

  const nonMonotonicVariogram =
    transitionCount > 0 &&
    decreasingTransitions /
      transitionCount >=
      NON_MONOTONIC_DECREASE_RATIO;

  return {
    usableLagCount:
      validLags.length,

    totalPairCount,

    invalidLagCount,

    duplicateDistanceCount,

    flatVariogram,

    nonMonotonicVariogram,

    lowPairSupport,
  };
}

// ============================================================
// NUGGET ESTIMATION
// ============================================================
//
// Initial deterministic estimate:
// mean of the first N usable near-origin lags.
//
// Default N = 1.
//
// ============================================================

function estimateNugget(
  usableLags,
  options = {},
) {
  if (
    !Array.isArray(usableLags) ||
    usableLags.length === 0
  ) {
    return null;
  }

  const lagCount = Number(
    options.nuggetLagCount ??
      DEFAULT_NUGGET_LAG_COUNT,
  );

  if (
    !Number.isInteger(lagCount) ||
    lagCount < 1
  ) {
    return null;
  }

  const selected =
    usableLags.slice(
      0,
      Math.min(
        lagCount,
        usableLags.length,
      ),
    );

  if (selected.length === 0) {
    return null;
  }

  return (
    selected.reduce(
      (sum, lag) =>
        sum + lag.semivariance,
      0,
    ) / selected.length
  );
}

// ============================================================
// SILL ESTIMATION
// ============================================================
//
// Initial deterministic estimate:
// mean of the upper fraction of experimental
// semivariance observations.
//
// Default upper fraction = 50%.
//
// ============================================================

function estimateSill(
  usableLags,
  options = {},
) {
  if (
    !Array.isArray(usableLags) ||
    usableLags.length === 0
  ) {
    return null;
  }

  const fraction = Number(
    options.sillUpperFraction ??
      DEFAULT_SILL_UPPER_FRACTION,
  );

  if (
    !Number.isFinite(fraction) ||
    fraction <= 0 ||
    fraction > 1
  ) {
    return null;
  }

  const values =
    usableLags
      .map(
        (lag) =>
          lag.semivariance,
      )
      .sort(
        (a, b) => a - b,
      );

  if (values.length === 0) {
    return null;
  }

  const startIndex =
    Math.floor(
      values.length *
        (1 - fraction),
    );

  const upperValues =
    values.slice(
      Math.min(
        startIndex,
        values.length - 1,
      ),
    );

  if (
    upperValues.length === 0
  ) {
    return null;
  }

  return (
    upperValues.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) /
    upperValues.length
  );
}

// ============================================================
// RANGE ANALYSIS
// ============================================================

function analyzeRangeEstimation(
  usableLags,
  nugget,
  sill,
  options = {},
) {
  if (
    !Array.isArray(usableLags) ||
    usableLags.length === 0 ||
    !isFiniteNumber(nugget) ||
    !isFiniteNumber(sill) ||
    sill <= nugget
  ) {
    return {
      range: null,
      rangeFallbackUsed: false,
      earlyRangeDetection: false,
    };
  }

  const thresholdValue =
    Number(
      options.rangeThreshold ??
        DEFAULT_RANGE_THRESHOLD,
    );

  if (
    !Number.isFinite(
      thresholdValue,
    ) ||
    thresholdValue <= 0 ||
    thresholdValue > 1
  ) {
    return {
      range: null,
      rangeFallbackUsed: false,
      earlyRangeDetection: false,
    };
  }

  const target =
    nugget +
    (sill - nugget) *
      thresholdValue;

  for (
    let index = 0;
    index < usableLags.length;
    index += 1
  ) {
    const lag =
      usableLags[index];

    if (
      lag.semivariance >=
      target
    ) {
      return {
        range: lag.distance,

        rangeFallbackUsed:
          false,

        earlyRangeDetection:
          index === 0,
      };
    }
  }

  return {
    range:
      usableLags[
        usableLags.length - 1
      ].distance,

    rangeFallbackUsed: true,

    earlyRangeDetection: false,
  };
}

// ============================================================
// RANGE ESTIMATION
// ============================================================
//
// Initial deterministic estimate:
// first distance where experimental semivariance
// reaches the configured fraction of structured variance.
//
// Default practical-range threshold = 95%.
//
// If the threshold is not reached, maximum observed
// distance is used.
//
// ============================================================

function estimateRange(
  usableLags,
  nugget,
  sill,
  options = {},
) {
  const result =
    analyzeRangeEstimation(
      usableLags,
      nugget,
      sill,
      options,
    );

  return result.range;
}

// ============================================================
// PARAMETER ESTIMATION
// ============================================================

function estimateVariogramParameters({
  usableLags,
  model,
  options = {},
} = {}) {
  const normalizedModel =
    normalizeVariogramModel(model);

  if (!normalizedModel) {
    return {
      success: false,

      model: null,

      parameters: null,

      diagnostics: {},

      error:
        "A supported variogram model is required.",
    };
  }

  if (
    !Array.isArray(usableLags) ||
    usableLags.length <
      MIN_USABLE_LAGS
  ) {
    return {
      success: false,

      model:
        normalizedModel.key,

      parameters: null,

      diagnostics: {
        usableLagCount:
          Array.isArray(
            usableLags,
          )
            ? usableLags.length
            : 0,
      },

      error:
        `At least ${MIN_USABLE_LAGS} usable experimental lags are required.`,
    };
  }

  const nugget =
    estimateNugget(
      usableLags,
      options,
    );

  const initialSill =
    estimateSill(
      usableLags,
      options,
    );

  if (
    !isFiniteNumber(nugget) ||
    !isFiniteNumber(initialSill)
  ) {
    return {
      success: false,

      model:
        normalizedModel.key,

      parameters: null,

      diagnostics: {
        usableLagCount:
          usableLags.length,
      },

      error:
        "Unable to estimate initial variogram nugget and sill.",
    };
  }

  if (
    initialSill <= nugget
  ) {
    return {
      success: false,

      model:
        normalizedModel.key,

      parameters: null,

      diagnostics: {
        usableLagCount:
          usableLags.length,

        nugget,

        sill: initialSill,
      },

      error:
        "Estimated sill must be greater than the estimated nugget.",
    };
  }

  const structuredVariance =
    calculateStructuredVariance(
      nugget,
      initialSill,
    );

  const range =
    estimateRange(
      usableLags,
      nugget,
      initialSill,
      options,
    );

  if (
    !isFiniteNumber(range) ||
    range <= 0
  ) {
    return {
      success: false,

      model:
        normalizedModel.key,

      parameters: null,

      diagnostics: {
        usableLagCount:
          usableLags.length,

        nugget,

        sill: initialSill,

        structuredVariance,
      },

      error:
        "Unable to estimate a positive variogram range.",
    };
  }

  const validation =
    validateVariogramParameters({
      nugget,
      sill: initialSill,
      range,
    });

  if (!validation.valid) {
    return {
      success: false,

      model:
        normalizedModel.key,

      parameters: null,

      diagnostics: {
        usableLagCount:
          usableLags.length,

        validationErrors:
          validation.errors,
      },

      error:
        "Estimated variogram parameters failed validation.",

      errors:
        validation.errors,
    };
  }

  return {
    success: true,

    model:
      normalizedModel.key,

    parameters: {
      nugget:
        validation.nugget,

      sill:
        validation.sill,

      structuredVariance:
        calculateStructuredVariance(
          validation.nugget,
          validation.sill,
        ),

      range:
        validation.range,
    },

    estimation:
      buildEstimationMethodology(
        options,
      ),

    diagnostics: {
      usableLagCount:
        usableLags.length,

      estimationMethod:
        "deterministic_experimental_variogram",

      nuggetEstimation:
        "first_usable_lags",

      sillEstimation:
        "upper_experimental_semivariance",

      rangeEstimation:
        "practical_range_threshold",

      model:
        normalizedModel.key,
    },
  };
}

// ============================================================
// MODEL FIT DIAGNOSTICS
// ============================================================
//
// No optimization is performed here.
//
// Pair count is used as the diagnostic weight:
//
//   weighted SSE = Σ pairCount × residual²
//
// ============================================================

function evaluateEstimatedModel({
  usableLags,
  model,
  parameters,
} = {}) {
  const normalizedModel =
    normalizeVariogramModel(model);

  if (
    !normalizedModel ||
    !Array.isArray(usableLags) ||
    !parameters
  ) {
    return {
      success: false,

      lags: [],

      weightedSSE: null,

      weightedRMSE: null,

      error:
        "Valid model, experimental lags and parameters are required.",
    };
  }

  const validation =
    validateVariogramParameters(
      parameters,
    );

  if (!validation.valid) {
    return {
      success: false,

      lags: [],

      weightedSSE: null,

      weightedRMSE: null,

      error:
        "Invalid variogram parameters.",

      errors:
        validation.errors,
    };
  }

  const modeledLags = [];

  let weightedSSE = 0;
  let totalPairs = 0;

  for (const lag of usableLags) {
    const modeledSemivariance =
      evaluateVariogram(
        normalizedModel.key,
        lag.distance,
        validation,
      );

    if (
      !isFiniteNumber(
        modeledSemivariance,
      )
    ) {
      continue;
    }

    const residual =
      lag.semivariance -
      modeledSemivariance;

    weightedSSE +=
      lag.pairCount *
      residual *
      residual;

    totalPairs +=
      lag.pairCount;

    modeledLags.push({
      lagNumber:
        lag.lagNumber,

      distance:
        lag.distance,

      observedSemivariance:
        lag.semivariance,

      modeledSemivariance,

      residual,

      pairCount:
        lag.pairCount,
    });
  }

  if (totalPairs <= 0) {
    return {
      success: false,

      lags: modeledLags,

      weightedSSE: null,

      weightedRMSE: null,

      error:
        "No valid experimental lag pairs were available for model evaluation.",
    };
  }

  return {
    success: true,

    lags: modeledLags,

    weightedSSE,

    weightedRMSE:
      Math.sqrt(
        weightedSSE /
          totalPairs,
      ),

    totalPairs,
  };
}

// ============================================================
// ROBUSTNESS WARNINGS
// ============================================================

function buildEstimationWarnings({
  dataQuality,
  estimationQuality,
} = {}) {
  const warnings = [];

  if (
    dataQuality &&
    dataQuality.invalidLagCount > 0
  ) {
    warnings.push(
      `${dataQuality.invalidLagCount} invalid experimental lag(s) were excluded.`,
    );
  }

  if (
    dataQuality &&
    dataQuality.duplicateDistanceCount > 0
  ) {
    warnings.push(
      `${dataQuality.duplicateDistanceCount} duplicate lag distance(s) were detected.`,
    );
  }

  if (
    dataQuality &&
    dataQuality.lowPairSupport
  ) {
    warnings.push(
      "Experimental variogram has low pair support.",
    );
  }

  if (
    dataQuality &&
    dataQuality.flatVariogram
  ) {
    warnings.push(
      "Experimental semivariance is effectively flat.",
    );
  }

  if (
    dataQuality &&
    dataQuality.nonMonotonicVariogram
  ) {
    warnings.push(
      "Experimental semivariance is strongly non-monotonic.",
    );
  }

  if (
    estimationQuality &&
    estimationQuality.rangeFallbackUsed
  ) {
    warnings.push(
      "Experimental semivariance does not reach the practical range threshold; maximum observed distance was used.",
    );
  }

  if (
    estimationQuality &&
    estimationQuality.earlyRangeDetection
  ) {
    warnings.push(
      "Practical range threshold is reached at the first usable lag.",
    );
  }

  if (
    estimationQuality &&
    !estimationQuality.sillNuggetSeparation
  ) {
    warnings.push(
      "Estimated sill does not provide positive structured variance above the nugget.",
    );
  }

  return warnings;
}

// ============================================================
// COMPLETE ESTIMATION CONTRACT
// ============================================================

function estimateExperimentalVariogramParameters({
  experimental,
  model,
  options = {},
} = {}) {
  const validation =
    validateEstimationInput({
      experimental,
      model,
      minUsableLags:
        options.minUsableLags ??
        DEFAULT_MIN_USABLE_LAGS,
    });

  if (!validation.valid) {
    return {
      success: false,

      model:
        validation.model
          ? validation.model.key
          : null,

      parameters: null,

      estimation:
        buildEstimationMethodology(
          options,
        ),

      diagnostics: {
        usableLagCount:
          validation.usableLags.length,
      },

      warnings: [],

      error:
        validation.errors.join(
          " ",
        ),

      errors:
        validation.errors,
    };
  }

  const dataQuality =
    analyzeExperimentalVariogramQuality(
      experimental,
      validation.usableLags,
      options,
    );

  const estimation =
    estimateVariogramParameters({
      usableLags:
        validation.usableLags,

      model:
        validation.model.key,

      options,
    });

  if (!estimation.success) {
    return {
      ...estimation,

      estimation:
        buildEstimationMethodology(
          options,
        ),

      diagnostics: {
        ...estimation.diagnostics,

        usableLagCount:
          validation.usableLags.length,

        dataQuality,
      },

      warnings:
        buildEstimationWarnings({
          dataQuality,
          estimationQuality: {
            rangeFallbackUsed:
              false,

            earlyRangeDetection:
              false,

            sillNuggetSeparation:
              false,
          },
        }),
    };
  }

  const rangeAnalysis =
    analyzeRangeEstimation(
      validation.usableLags,
      estimation.parameters.nugget,
      estimation.parameters.sill,
      options,
    );

  const estimationQuality = {
    rangeFallbackUsed:
      rangeAnalysis.rangeFallbackUsed,

    earlyRangeDetection:
      rangeAnalysis.earlyRangeDetection,

    sillNuggetSeparation:
      estimation.parameters
        .structuredVariance > 0,
  };

  const modelEvaluation =
    evaluateEstimatedModel({
      usableLags:
        validation.usableLags,

      model:
        validation.model.key,

      parameters:
        estimation.parameters,
    });

  if (!modelEvaluation.success) {
    const warnings =
      buildEstimationWarnings({
        dataQuality,
        estimationQuality,
      });

    return {
      success: false,

      model:
        estimation.model,

      parameters:
        estimation.parameters,

      estimation:
        estimation.estimation,

      diagnostics: {
        ...estimation.diagnostics,

        totalExperimentalLagCount:
          Array.isArray(
            experimental.lags,
          )
            ? experimental.lags.length
            : 0,

        usableLagCount:
          validation.usableLags.length,

        totalPairCount:
          dataQuality.totalPairCount,

        dataQuality,

        estimationQuality,
      },

      experimental: {
        lagCount:
          validation.usableLags.length,

        lags:
          validation.usableLags,
      },

      modeled:
        modelEvaluation.lags,

      fit: {
        success: false,

        weightedSSE: null,

        weightedRMSE: null,

        totalPairs: 0,
      },

      warnings,

      error:
        modelEvaluation.error,

      errors:
        modelEvaluation.errors,
    };
  }

  const warnings =
    buildEstimationWarnings({
      dataQuality,
      estimationQuality,
    });

  return {
    success: true,

    model:
      estimation.model,

    parameters:
      estimation.parameters,

    estimation:
      estimation.estimation,

    diagnostics: {
      ...estimation.diagnostics,

      totalExperimentalLagCount:
        Array.isArray(
          experimental.lags,
        )
          ? experimental.lags.length
          : 0,

      usableLagCount:
        validation.usableLags.length,

      totalPairCount:
        dataQuality.totalPairCount,

      weightedSSE:
        modelEvaluation.weightedSSE,

      weightedRMSE:
        modelEvaluation.weightedRMSE,

      dataQuality,

      estimationQuality,
    },

    experimental: {
      lagCount:
        validation.usableLags.length,

      lags:
        validation.usableLags,
    },

    modeled:
      modelEvaluation.lags,

    fit: {
      success: true,

      weightedSSE:
        modelEvaluation.weightedSSE,

      weightedRMSE:
        modelEvaluation.weightedRMSE,

      totalPairs:
        modelEvaluation.totalPairs,
    },

    warnings,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  DEFAULT_MIN_USABLE_LAGS,
  MIN_USABLE_LAGS,

  DEFAULT_NUGGET_LAG_COUNT,
  DEFAULT_SILL_UPPER_FRACTION,
  DEFAULT_RANGE_THRESHOLD,

  DEFAULT_MIN_TOTAL_PAIRS,

  FLAT_VARIOGRAM_TOLERANCE,
  NON_MONOTONIC_DECREASE_RATIO,

  isFiniteNumber,
  toFiniteNumber,

  isUsableExperimentalLag,
  extractUsableExperimentalLags,

  validateEstimationInput,

  analyzeExperimentalVariogramQuality,

  buildEstimationMethodology,

  estimateNugget,
  estimateSill,
  analyzeRangeEstimation,
  estimateRange,

  estimateVariogramParameters,

  evaluateEstimatedModel,

  buildEstimationWarnings,

  estimateExperimentalVariogramParameters,
};