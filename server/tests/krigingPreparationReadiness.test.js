"use strict";

// ============================================================
// server/tests/krigingPreparationReadiness.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.5.3  Kriging Preparation Readiness Integration
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const interpolationService =
  require("../services/interpolationService");

const validationService =
  require("../services/interpolation/variogramValidationService");

const readinessService =
  require("../services/interpolation/krigingAcceptanceIntegrationService");

console.log(
  "Kriging Preparation Readiness tests loaded.",
);

// ============================================================
// FIXTURES
// ============================================================

function createScientificResult() {
  return {
    success: true,

    method: "kriging",

    parameter: "ph",

    parameters: {
      model: "spherical",
      nugget: 0.2,
      sill: 0.8,
      range: 4000,
      structuredVariance: 0.6,
    },

    source: {
      type: "estimated",
      estimated: true,
    },

    diagnostics: {
      dataQuality: {
        usableLagCount: 5,
        totalPairCount: 50,
        flatVariogram: false,
        nonMonotonicVariogram: false,
        duplicateDistanceCount: 0,
      },

      estimationQuality: {
        rangeFallbackUsed: false,
        earlyRangeDetection: false,
      },

      fit: {
        success: true,
        weightedSSE: 0.25,
        weightedRMSE: 0.05,
        totalPairs: 50,
      },
    },

    warnings: [],
  };
}

// ============================================================
// ADAPTER
// ============================================================

function buildValidationInput(
  scientificResult,
) {
  return {
    ...scientificResult,

    model:
      scientificResult.parameters?.model ??
      null,

    fit:
      scientificResult.diagnostics?.fit ??
      null,
  };
}

function buildValidationResult(
  scientificResult,
) {
  const validationInput =
    buildValidationInput(
      scientificResult,
    );

  return validationService.validateVariogramEstimation(
    validationInput,
  );
}

function evaluateReadiness(
  scientificResult,
) {
  const validationResult =
    buildValidationResult(
      scientificResult,
    );

  const readiness =
    readinessService.evaluateKrigingReadiness(
      validationResult,
    );

  return {
    validationResult,
    readiness,
  };
}

// ============================================================
// TESTS
// ============================================================

test(
  "12.5.5.3 exports readiness integration boundary",
  () => {
    assert.equal(
      typeof interpolationService.prepareInterpolation,
      "function",
    );
  },
);

test(
  "scientific parameter result contains required diagnostics",
  () => {
    const result =
      createScientificResult();

    assert.ok(
      result.parameters,
    );

    assert.ok(
      result.diagnostics,
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
  },
);

test(
  "12.5.5.3 validation adapter preserves scientific parameters",
  () => {
    const result =
      createScientificResult();

    const validationInput =
      buildValidationInput(
        result,
      );

    assert.deepEqual(
      validationInput.parameters,
      result.parameters,
    );

    assert.equal(
      validationInput.model,
      "spherical",
    );

    assert.deepEqual(
      validationInput.fit,
      result.diagnostics.fit,
    );
  },
);

test(
  "12.5.5.3 converts scientific result into Phase 12.5.3 validation result",
  () => {
    const result =
      createScientificResult();

    const validationResult =
      buildValidationResult(
        result,
      );

    assert.equal(
      validationResult.success,
      true,
    );

    assert.ok(
      validationResult.criteria,
    );

    assert.equal(
      validationResult.criteria.minimumUsableLags.status,
      "passed",
    );

    assert.equal(
      validationResult.criteria.pairSupport.status,
      "passed",
    );

    assert.equal(
      validationResult.criteria.structuredVariance.status,
      "passed",
    );

    assert.equal(
      validationResult.criteria.practicalRange.status,
      "passed",
    );

    assert.equal(
      validationResult.criteria.modelFit.status,
      "passed",
    );

    assert.equal(
      validationResult.criteria.parameters.status,
      "passed",
    );
  },
);

test(
  "12.5.5.3 readiness accepts a valid scientific result",
  () => {
    const result =
      createScientificResult();

    const {
      validationResult,
      readiness,
    } =
      evaluateReadiness(
        result,
      );

    assert.equal(
      validationResult.success,
      true,
    );

    assert.equal(
      readiness.success,
      true,
    );

    assert.equal(
      readiness.ready,
      true,
    );

    assert.equal(
      readiness.decision,
      "accepted",
    );

    assert.equal(
      readiness.acceptance.decision,
      "accepted",
    );
  },
);

test(
  "12.5.5.3 preserves rejection when structured variance fails",
  () => {
    const result =
      createScientificResult();

    result.parameters.structuredVariance =
      0;

    const {
      validationResult,
      readiness,
    } =
      evaluateReadiness(
        result,
      );

    assert.equal(
      validationResult.success,
      true,
    );

    assert.equal(
      validationResult.criteria.structuredVariance.status,
      "failed",
    );

    assert.equal(
      readiness.success,
      true,
    );

    assert.equal(
      readiness.ready,
      false,
    );

    assert.equal(
      readiness.decision,
      "rejected",
    );
  },
);

test(
  "12.5.5.3 preserves warnings without rejecting Kriging",
  () => {
    const result =
      createScientificResult();

    result.diagnostics.dataQuality.flatVariogram =
      true;

    const {
      validationResult,
      readiness,
    } =
      evaluateReadiness(
        result,
      );

    assert.equal(
      validationResult.success,
      true,
    );

    assert.equal(
      validationResult.criteria.nonFlatVariogram.status,
      "warning",
    );

    assert.equal(
      readiness.success,
      true,
    );

    assert.equal(
      readiness.ready,
      true,
    );

    assert.equal(
      readiness.decision,
      "accepted_with_warnings",
    );

    assert.ok(
      readiness.warnings.length > 0,
    );
  },
);

test(
  "12.5.5.3 does not mutate scientific result",
  () => {
    const result =
      createScientificResult();

    const original =
      structuredClone(result);

    evaluateReadiness(
      result,
    );

    assert.deepEqual(
      result,
      original,
    );
  },
);
