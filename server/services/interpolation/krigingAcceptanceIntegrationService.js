"use strict";

// ============================================================
// server/services/interpolation/krigingAcceptanceIntegrationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.5.2  Kriging Acceptance Integration Boundary
//
// Built on:
//   Phase 12.5.3  Variogram / Model Validation Criteria
//   Phase 12.5.4  Kriging Acceptance / Rejection Rules
//
// Responsibilities:
//   1. Receive completed variogram validation results
//   2. Delegate acceptance evaluation to Phase 12.5.4
//   3. Translate acceptance decision into Kriging readiness
//   4. Preserve validation and acceptance diagnostics
//
// Does NOT:
//   - calculate variograms
//   - estimate parameters
//   - optimize parameters
//   - select models
//   - calculate Kriging weights
//   - solve Kriging systems
//   - perform cross-validation
//   - access repositories/databases
//   - generate interpolation surfaces
//
// Readiness states:
//
//   accepted
//       ready: true
//
//   accepted_with_warnings
//       ready: true
//
//   rejected
//       ready: false
//
// Technical evaluation failure:
//
//   success: false
//   ready: false
//   decision: null
//
// ============================================================

const acceptanceService = require(
  "./krigingAcceptanceService",
);

/* ============================================================
   INTERNAL HELPERS
   ============================================================ */

function createTechnicalFailure(message, errors = []) {
  const normalizedErrors = Array.isArray(errors)
    ? errors.slice()
    : [String(errors)];

  if (
    message &&
    !normalizedErrors.includes(message)
  ) {
    normalizedErrors.unshift(message);
  }

  return {
    success: false,
    ready: false,
    decision: null,
    model: null,
    validation: null,
    acceptance: null,
    warnings: [],
    errors: normalizedErrors,
  };
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function validateAcceptanceResult(result) {
  if (!isPlainObject(result)) {
    return {
      valid: false,
      error:
        "Kriging acceptance evaluation returned an invalid result.",
    };
  }

  if (typeof result.success !== "boolean") {
    return {
      valid: false,
      error:
        "Kriging acceptance result has an invalid success state.",
    };
  }

  if (!Array.isArray(result.warnings)) {
    return {
      valid: false,
      error:
        "Kriging acceptance result has invalid warnings.",
    };
  }

  if (!Array.isArray(result.errors)) {
    return {
      valid: false,
      error:
        "Kriging acceptance result has invalid errors.",
    };
  }

  if (!result.success) {
    if (result.decision !== null) {
      return {
        valid: false,
        error:
          "Technical acceptance failure must have decision:null.",
      };
    }

    if (result.accepted !== false) {
      return {
        valid: false,
        error:
          "Technical acceptance failure must have accepted:false.",
      };
    }

    return {
      valid: true,
      technicalFailure: true,
    };
  }

  if (
    result.decision !==
      acceptanceService.DECISION_ACCEPTED &&
    result.decision !==
      acceptanceService.DECISION_ACCEPTED_WITH_WARNINGS &&
    result.decision !==
      acceptanceService.DECISION_REJECTED
  ) {
    return {
      valid: false,
      error:
        "Kriging acceptance result contains an unsupported decision.",
    };
  }

  if (typeof result.accepted !== "boolean") {
    return {
      valid: false,
      error:
        "Kriging acceptance result has an invalid accepted state.",
    };
  }

  return {
    valid: true,
    technicalFailure: false,
  };
}

/* ============================================================
   KRIGING READINESS
   ============================================================ */

/**
 * Evaluate whether Kriging is ready to proceed based on the
 * completed Phase 12.5.3 validation result and Phase 12.5.4
 * acceptance decision.
 *
 * No scientific calculation is performed here.
 *
 * @param {object} validationResult
 * @returns {object}
 */
function evaluateKrigingReadiness(validationResult) {
  const acceptance =
    acceptanceService.evaluateKrigingAcceptance(
      validationResult,
    );

  const validation =
    validateAcceptanceResult(acceptance);

  if (!validation.valid) {
    return createTechnicalFailure(
      validation.error,
    );
  }

  if (validation.technicalFailure) {
    return {
      success: false,
      ready: false,
      decision: null,
      model:
        typeof validationResult?.model === "string"
          ? validationResult.model
          : null,
      validation: validationResult ?? null,
      acceptance,
      warnings: acceptance.warnings.slice(),
      errors: acceptance.errors.slice(),
    };
  }

  const ready =
    acceptance.decision !==
    acceptanceService.DECISION_REJECTED;

  return {
    success: true,
    ready,
    decision: acceptance.decision,
    model:
      typeof acceptance.model === "string"
        ? acceptance.model
        : null,
    validation: validationResult,
    acceptance,
    warnings: acceptance.warnings.slice(),
    errors: acceptance.errors.slice(),
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */

module.exports = {
  evaluateKrigingReadiness,
};
