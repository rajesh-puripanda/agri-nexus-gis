"use strict";

// ============================================================
// server/services/interpolation/comparativeAnalysisService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.9  Comparative Interpolation Analysis
//
// Built on:
//   Phase 12.8  Comparative Interpolation Validation
//
// Responsibilities:
//   1. Consume normalized comparative-validation results
//   2. Analyze per-method error diagnostics
//   3. Analyze fold coverage
//   4. Identify common successful/failed folds
//   5. Calculate pairwise prediction differences
//   6. Preserve diagnostic failures
//
// Scientific rules:
//   - Diagnostic only
//   - No method ranking
//   - No method selection
//   - No composite score
//   - No weighting
//   - No acceptance threshold
//   - No interpolation parameter changes
//   - No additional LOOCV execution
//
// ============================================================

const SUPPORTED_METHODS = Object.freeze([
  "idw",
  "kriging",
  "spline",
  "nearest_neighbour",
]);

const ANALYSIS_TYPE =
  "comparative_interpolation_analysis";

const DIAGNOSTIC_TYPE =
  "loocv_analysis";

const METHOD_PAIRS = Object.freeze([
  ["idw", "kriging"],
  ["idw", "spline"],
  ["idw", "nearest_neighbour"],
  ["kriging", "spline"],
  ["kriging", "nearest_neighbour"],
  ["spline", "nearest_neighbour"],
]);

/* ============================================================
   BASIC HELPERS
   ============================================================ */

function isFiniteNumericValue(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeMethod(method) {
  return SUPPORTED_METHODS.includes(method)
    ? method
    : null;
}

/* ============================================================
   FOLD VALUE NORMALIZATION
   ============================================================ */

function getObservedValue(fold) {
  if (!isObject(fold)) {
    return null;
  }

  const candidates = [
    fold.observed,
    fold.observedValue,
    fold.sample?.value,
  ];

  for (const value of candidates) {
    if (isFiniteNumericValue(value)) {
      return value;
    }
  }

  return null;
}

function getPredictedValue(fold) {
  if (!isObject(fold)) {
    return null;
  }

  const candidates = [
    fold.predicted,
    fold.predictedValue,
  ];

  for (const value of candidates) {
    if (isFiniteNumericValue(value)) {
      return value;
    }
  }

  return null;
}

function getErrorValue(fold) {
  if (!isObject(fold)) {
    return null;
  }

  const candidates = [
    fold.error,
    fold.residual,
  ];

  for (const value of candidates) {
    if (isFiniteNumericValue(value)) {
      return value;
    }
  }

  const observed =
    getObservedValue(fold);

  const predicted =
    getPredictedValue(fold);

  if (
    isFiniteNumericValue(observed) &&
    isFiniteNumericValue(predicted)
  ) {
    return predicted - observed;
  }

  return null;
}

function getAbsoluteErrorValue(fold) {
  if (!isObject(fold)) {
    return null;
  }

  if (
    isFiniteNumericValue(
      fold.absoluteError,
    )
  ) {
    return fold.absoluteError;
  }

  const error =
    getErrorValue(fold);

  return isFiniteNumericValue(error)
    ? Math.abs(error)
    : null;
}

function getSquaredErrorValue(fold) {
  if (!isObject(fold)) {
    return null;
  }

  if (
    isFiniteNumericValue(
      fold.squaredError,
    )
  ) {
    return fold.squaredError;
  }

  const error =
    getErrorValue(fold);

  return isFiniteNumericValue(error)
    ? error * error
    : null;
}

/* ============================================================
   FOLD IDENTIFICATION
   ============================================================ */

function getFoldIdentifier(fold, index) {
  if (!isObject(fold)) {
    return String(index);
  }

  if (
    fold.sampleCode !== undefined &&
    fold.sampleCode !== null
  ) {
    return String(fold.sampleCode);
  }

  if (
    fold.sample?.sample_code !== undefined &&
    fold.sample?.sample_code !== null
  ) {
    return String(
      fold.sample.sample_code,
    );
  }

  if (
    fold.sample?.id !== undefined &&
    fold.sample?.id !== null
  ) {
    return String(
      fold.sample.id,
    );
  }

  if (
    fold.index !== undefined &&
    fold.index !== null
  ) {
    return String(fold.index);
  }

  return String(index);
}

/* ============================================================
   FOLD NORMALIZATION
   ============================================================ */

function normalizeFold(
  fold,
  index,
) {
  const observed =
    getObservedValue(fold);

  const predicted =
    getPredictedValue(fold);

  const error =
    getErrorValue(fold);

  const absoluteError =
    getAbsoluteErrorValue(fold);

  const squaredError =
    getSquaredErrorValue(fold);

  const success =
    fold?.success === true &&
    isFiniteNumericValue(observed) &&
    isFiniteNumericValue(predicted);

  return {
    identifier:
      getFoldIdentifier(
        fold,
        index,
      ),

    index:
      Number.isInteger(fold?.index)
        ? fold.index
        : index,

    success,

    observed,

    predicted,

    error,

    absoluteError,

    squaredError,
  };
}

function normalizeFolds(methodResult) {
  if (
    !isObject(methodResult) ||
    !Array.isArray(methodResult.folds)
  ) {
    return [];
  }

  return methodResult.folds.map(
    (fold, index) =>
      normalizeFold(
        fold,
        index,
      ),
  );
}

/* ============================================================
   ERROR ANALYSIS
   ============================================================ */

function normalizeMetric(
  value,
) {
  return isFiniteNumericValue(value)
    ? value
    : null;
}

function analyzeErrorMetrics(
  methodResult,
) {
  const metrics =
    isObject(methodResult?.metrics)
      ? methodResult.metrics
      : {};

  return {
    meanError:
      normalizeMetric(
        metrics.meanError,
      ),

    meanAbsoluteError:
      normalizeMetric(
        metrics.meanAbsoluteError,
      ),

    rmse:
      normalizeMetric(
        metrics.rmse,
      ),

    maxAbsoluteError:
      normalizeMetric(
        metrics.maxAbsoluteError,
      ),
  };
}

/* ============================================================
   FOLD COVERAGE
   ============================================================ */

function analyzeFoldCoverage(
  methodResult,
  folds,
) {
  const totalFolds =
    folds.length;

  const successfulFoldCount =
    folds.filter(
      (fold) =>
        fold.success === true,
    ).length;

  const failedFoldCount =
    totalFolds -
    successfulFoldCount;

  const successRate =
    totalFolds > 0
      ? successfulFoldCount /
        totalFolds
      : null;

  return {
    totalFolds,

    successfulFolds:
      successfulFoldCount,

    failedFolds:
      failedFoldCount,

    successRate,

    reportedSuccessfulFolds:
      Number.isInteger(
        methodResult?.successfulFolds,
      )
        ? methodResult.successfulFolds
        : null,

    reportedFailedFolds:
      Number.isInteger(
        methodResult?.failedFolds,
      )
        ? methodResult.failedFolds
        : null,
  };
}

/* ============================================================
   METHOD ANALYSIS
   ============================================================ */

function analyzeMethod(
  method,
  methodResult,
) {
  const normalizedMethod =
    normalizeMethod(method);

  if (!normalizedMethod) {
    return null;
  }

  const safeResult =
    isObject(methodResult)
      ? methodResult
      : {
          success: false,
          status: "failed",
          applicable: false,
          sampleCount: null,
          folds: [],
          errors: [
            "Method result is unavailable.",
          ],
        };

  const folds =
    normalizeFolds(
      safeResult,
    );

  return {
    method:
      normalizedMethod,

    success:
      safeResult.success === true,

    status:
      safeResult.status ?? null,

    applicable:
      safeResult.applicable === true,

    sampleCount:
      Number.isInteger(
        safeResult.sampleCount,
      )
        ? safeResult.sampleCount
        : null,

    errorAnalysis:
      analyzeErrorMetrics(
        safeResult,
      ),

    foldCoverage:
      analyzeFoldCoverage(
        safeResult,
        folds,
      ),

    folds,

    errors:
      Array.isArray(
        safeResult.errors,
      )
        ? safeResult.errors.slice()
        : [],
  };
}

/* ============================================================
   COMMON FOLD ANALYSIS
   ============================================================ */

function buildSuccessfulFoldMap(
  methodAnalysis,
) {
  const map = new Map();

  if (
    !methodAnalysis ||
    !Array.isArray(
      methodAnalysis.folds,
    )
  ) {
    return map;
  }

  for (const fold of methodAnalysis.folds) {
    if (
      fold.success !== true
    ) {
      continue;
    }

    if (
      !isFiniteNumericValue(
        fold.predicted,
      )
    ) {
      continue;
    }

    map.set(
      fold.identifier,
      fold,
    );
  }

  return map;
}

function buildFailedFoldSet(
  methodAnalysis,
) {
  const set = new Set();

  if (
    !methodAnalysis ||
    !Array.isArray(
      methodAnalysis.folds,
    )
  ) {
    return set;
  }

  for (const fold of methodAnalysis.folds) {
    if (
      fold.success === false
    ) {
      set.add(
        fold.identifier,
      );
    }
  }

  return set;
}

function analyzePredictionConsistency(
  methods,
) {
  const successfulMaps = {};

  const failedSets = {};

  for (const method of SUPPORTED_METHODS) {
    successfulMaps[method] =
      buildSuccessfulFoldMap(
        methods[method],
      );

    failedSets[method] =
      buildFailedFoldSet(
        methods[method],
      );
  }

  let commonSuccessfulIds =
    null;

  let commonFailedIds =
    null;

  for (const method of SUPPORTED_METHODS) {
    const successfulIds =
      new Set(
        successfulMaps[method].keys(),
      );

    const failedIds =
      failedSets[method];

    if (
      commonSuccessfulIds === null
    ) {
      commonSuccessfulIds =
        successfulIds;
    } else {
      commonSuccessfulIds =
        new Set(
          [
            ...commonSuccessfulIds,
          ].filter(
            (id) =>
              successfulIds.has(id),
          ),
        );
    }

    if (
      commonFailedIds === null
    ) {
      commonFailedIds =
        new Set(
          failedIds,
        );
    } else {
      commonFailedIds =
        new Set(
          [
            ...commonFailedIds,
          ].filter(
            (id) =>
              failedIds.has(id),
          ),
        );
    }
  }

  return {
    commonSuccessfulFoldCount:
      commonSuccessfulIds?.size ?? 0,

    commonFailedFoldCount:
      commonFailedIds?.size ?? 0,

    commonSuccessfulFolds:
      Array.from(
        commonSuccessfulIds ?? [],
      ),

    commonFailedFolds:
      Array.from(
        commonFailedIds ?? [],
      ),
  };
}

/* ============================================================
   PAIRWISE PREDICTION DIFFERENCES
   ============================================================ */

function calculatePairwiseDifference(
  methodA,
  methodB,
  methods,
) {
  const first =
    buildSuccessfulFoldMap(
      methods[methodA],
    );

  const second =
    buildSuccessfulFoldMap(
      methods[methodB],
    );

  const commonIds =
    [
      ...first.keys(),
    ].filter(
      (id) =>
        second.has(id),
    );

  if (
    commonIds.length === 0
  ) {
    return {
      methodA,
      methodB,
      comparableFoldCount: 0,
      meanAbsoluteDifference: null,
      maxAbsoluteDifference: null,
      differences: [],
    };
  }

  const differences =
    [];

  for (const identifier of commonIds) {
    const firstFold =
      first.get(identifier);

    const secondFold =
      second.get(identifier);

    const difference =
      firstFold.predicted -
      secondFold.predicted;

    if (
      !isFiniteNumericValue(
        difference,
      )
    ) {
      continue;
    }

    differences.push({
      identifier,
      methodA,
      methodB,
      predictionA:
        firstFold.predicted,
      predictionB:
        secondFold.predicted,
      difference,
      absoluteDifference:
        Math.abs(
          difference,
        ),
    });
  }

  if (
    differences.length === 0
  ) {
    return {
      methodA,
      methodB,
      comparableFoldCount: 0,
      meanAbsoluteDifference: null,
      maxAbsoluteDifference: null,
      differences: [],
    };
  }

  const totalAbsoluteDifference =
    differences.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.absoluteDifference,
      0,
    );

  const maxAbsoluteDifference =
    differences.reduce(
      (
        maximum,
        item,
      ) =>
        Math.max(
          maximum,
          item.absoluteDifference,
        ),
      0,
    );

  return {
    methodA,
    methodB,

    comparableFoldCount:
      differences.length,

    meanAbsoluteDifference:
      totalAbsoluteDifference /
      differences.length,

    maxAbsoluteDifference,

    differences,
  };
}

function analyzeMethodDifferences(
  methods,
) {
  const result = {};

  for (
    const [
      methodA,
      methodB,
    ] of METHOD_PAIRS
  ) {
    const key =
      `${methodA}_vs_${methodB}`;

    result[key] =
      calculatePairwiseDifference(
        methodA,
        methodB,
        methods,
      );
  }

  return result;
}

/* ============================================================
   INPUT VALIDATION
   ============================================================ */

function validateComparativeValidationResult(
  comparativeValidation,
) {
  const errors = [];

  if (
    !isObject(
      comparativeValidation,
    )
  ) {
    errors.push(
      "Comparative validation result must be an object.",
    );

    return {
      valid: false,
      errors,
    };
  }

  if (
    !isObject(
      comparativeValidation.methods,
    )
  ) {
    errors.push(
      "Comparative validation methods must be an object.",
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

/* ============================================================
   MAIN ANALYSIS
   ============================================================ */

function analyzeComparativeValidation(
  comparativeValidation,
  options = {},
) {
  const validation =
    validateComparativeValidationResult(
      comparativeValidation,
    );

  if (!validation.valid) {
    return {
      success: false,

      status: "failed",

      analysisType:
        ANALYSIS_TYPE,

      diagnosticType:
        DIAGNOSTIC_TYPE,

      sampleCount: null,

      methods: {},

      predictionConsistency: {
        commonSuccessfulFoldCount: 0,
        commonFailedFoldCount: 0,
        commonSuccessfulFolds: [],
        commonFailedFolds: [],
      },

      methodDifferences: {},

      errors:
        validation.errors.slice(),
    };
  }

  const methods = {};

  for (const method of SUPPORTED_METHODS) {
    methods[method] =
      analyzeMethod(
        method,
        comparativeValidation
          .methods[method],
      );
  }

  const predictionConsistency =
    analyzePredictionConsistency(
      methods,
    );

  const methodDifferences =
    analyzeMethodDifferences(
      methods,
    );

  const sampleCount =
    Number.isInteger(
      comparativeValidation.sampleCount,
    )
      ? comparativeValidation.sampleCount
      : null;

  const executionFailed =
    comparativeValidation.success !== true ||
    comparativeValidation.status ===
      "completed_with_failures";

  return {
    success:
      !executionFailed,

    status:
      executionFailed
        ? "completed_with_failures"
        : "complete",

    analysisType:
      ANALYSIS_TYPE,

    diagnosticType:
      DIAGNOSTIC_TYPE,

    sampleCount,

    methods,

    predictionConsistency,

    methodDifferences,

    errors:
      Array.isArray(
        comparativeValidation.errors,
      )
        ? comparativeValidation.errors.slice()
        : [],

    options:
      isObject(options)
        ? { ...options }
        : {},
  };
}

/* ============================================================
   ALIASES
   ============================================================ */

const comparativeInterpolationAnalysis =
  analyzeComparativeValidation;

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  SUPPORTED_METHODS,
  ANALYSIS_TYPE,
  DIAGNOSTIC_TYPE,
  METHOD_PAIRS,

  isFiniteNumericValue,
  isObject,

  normalizeMethod,

  getObservedValue,
  getPredictedValue,
  getErrorValue,
  getAbsoluteErrorValue,
  getSquaredErrorValue,

  getFoldIdentifier,
  normalizeFold,
  normalizeFolds,

  analyzeErrorMetrics,
  analyzeFoldCoverage,
  analyzeMethod,

  buildSuccessfulFoldMap,
  buildFailedFoldSet,

  analyzePredictionConsistency,

  calculatePairwiseDifference,
  analyzeMethodDifferences,

  validateComparativeValidationResult,

  analyzeComparativeValidation,
  comparativeInterpolationAnalysis,
};
