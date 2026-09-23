"use strict";

// ============================================================
// server/services/interpolation/krigingAcceptanceService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.4.3  Kriging Acceptance / Rejection Rules
//
// Built on:
//   Phase 12.5.3  Variogram / Model Validation Criteria
//
// Responsibilities:
//   1. Consume variogram validation results
//   2. Apply frozen Kriging acceptance/rejection policy
//   3. Distinguish acceptance warnings from hard failures
//   4. Produce deterministic acceptance decision
//
// Does NOT:
//   - calculate variograms
//   - estimate parameters
//   - optimize models
//   - select models
//   - modify Kriging calculations
//   - perform cross-validation
//   - access repositories/databases
//   - generate interpolation surfaces
//
// Scientific decision states:
//   accepted
//   accepted_with_warnings
//   rejected
//
// Technical evaluation failure:
//   success:false
//   decision:null
//
// ============================================================

const DECISION_ACCEPTED = "accepted";
const DECISION_ACCEPTED_WITH_WARNINGS =
  "accepted_with_warnings";
const DECISION_REJECTED = "rejected";

const VALID_STATUSES = new Set([
  "passed",
  "warning",
  "failed",
]);

const HARD_FAILURE_CRITERIA = Object.freeze([
  "minimumUsableLags",
  "pairSupport",
  "structuredVariance",
  "practicalRange",
  "modelFit",
  "parameters",
]);

const WARNING_CRITERIA = Object.freeze([
  "nonFlatVariogram",
  "monotonicVariogram",
  "duplicateDistances",
]);

const ALL_CRITERIA = Object.freeze([
  ...HARD_FAILURE_CRITERIA.slice(0, 2),
  ...WARNING_CRITERIA,
  ...HARD_FAILURE_CRITERIA.slice(2),
]);

/* ============================================================
   INTERNAL HELPERS
   ============================================================ */

function createEvaluationFailure(message, errors = []) {
  const normalizedErrors = Array.isArray(errors)
    ? errors.slice()
    : [String(errors)];

  if (message && !normalizedErrors.includes(message)) {
    normalizedErrors.unshift(message);
  }

  return {
    success: false,
    decision: null,
    accepted: false,
    model: null,
    criteria: null,
    summary: null,
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

function validateInput(validationResult) {
  if (!isPlainObject(validationResult)) {
    return {
      valid: false,
      error:
        "Kriging acceptance requires a validation result object.",
    };
  }

  if (!isPlainObject(validationResult.criteria)) {
    return {
      valid: false,
      error:
        "Kriging acceptance requires validation criteria.",
    };
  }

  for (const criterion of ALL_CRITERIA) {
    const entry = validationResult.criteria[criterion];

    if (!isPlainObject(entry)) {
      return {
        valid: false,
        error:
          `Validation criterion "${criterion}" is missing or malformed.`,
      };
    }

    if (!VALID_STATUSES.has(entry.status)) {
      return {
        valid: false,
        error:
          `Validation criterion "${criterion}" has an invalid status.`,
      };
    }
  }

  return {
    valid: true,
    error: null,
  };
}

function countStatuses(criteria) {
  const summary = {
    passedCount: 0,
    warningCount: 0,
    failedCount: 0,
  };

  for (const criterion of ALL_CRITERIA) {
    const status = criteria[criterion].status;

    if (status === "passed") {
      summary.passedCount += 1;
    } else if (status === "warning") {
      summary.warningCount += 1;
    } else if (status === "failed") {
      summary.failedCount += 1;
    }
  }

  return summary;
}

function collectWarnings(criteria) {
  const warnings = [];

  for (const criterion of ALL_CRITERIA) {
    if (criteria[criterion].status === "warning") {
      warnings.push(
        `Validation criterion "${criterion}" produced a warning.`,
      );
    }
  }

  return warnings;
}

function collectFailures(criteria) {
  const failures = [];

  for (const criterion of HARD_FAILURE_CRITERIA) {
    if (criteria[criterion].status === "failed") {
      failures.push(
        `Validation criterion "${criterion}" failed.`,
      );
    }
  }

  return failures;
}

/* ============================================================
   ACCEPTANCE EVALUATION
   ============================================================ */

/**
 * Evaluate a completed variogram validation result.
 *
 * This function applies the frozen Phase 12.5.4 policy:
 *
 *   no failures + no warnings
 *       -> accepted
 *
 *   no failures + warnings
 *       -> accepted_with_warnings
 *
 *   one or more failures
 *       -> rejected
 *
 * Scientific rejection is still a successful evaluation:
 *
 *   success: true
 *   accepted: false
 *   decision: "rejected"
 *
 * Technical evaluation errors use:
 *
 *   success: false
 *   accepted: false
 *   decision: null
 *
 * @param {object} validationResult
 * @returns {object}
 */
function validateAcceptance(validationResult) {
  const validation = validateInput(validationResult);

  if (!validation.valid) {
    return createEvaluationFailure(validation.error);
  }

  const criteria = validationResult.criteria;
  const summary = countStatuses(criteria);
  const warnings = collectWarnings(criteria);
  const errors = collectFailures(criteria);

  let decision;

  if (summary.failedCount > 0) {
    decision = DECISION_REJECTED;
  } else if (summary.warningCount > 0) {
    decision = DECISION_ACCEPTED_WITH_WARNINGS;
  } else {
    decision = DECISION_ACCEPTED;
  }

  const accepted = decision !== DECISION_REJECTED;

  return {
    success: true,
    decision,
    accepted,
    model:
      typeof validationResult.model === "string"
        ? validationResult.model
        : null,
    criteria: validationResult.criteria,
    summary,
    warnings,
    errors,
  };
}

/**
 * Explicit public alias for Kriging acceptance evaluation.
 *
 * @param {object} validationResult
 * @returns {object}
 */
function evaluateKrigingAcceptance(validationResult) {
  return validateAcceptance(validationResult);
}

/* ============================================================
   PUBLIC API
   ============================================================ */

module.exports = {
  DECISION_ACCEPTED,
  DECISION_ACCEPTED_WITH_WARNINGS,
  DECISION_REJECTED,

  HARD_FAILURE_CRITERIA,
  WARNING_CRITERIA,

  validateAcceptance,
  evaluateKrigingAcceptance,
};
