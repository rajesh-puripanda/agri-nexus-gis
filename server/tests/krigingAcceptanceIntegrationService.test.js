"use strict";

// ============================================================
// server/tests/krigingAcceptanceIntegrationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.5.1  Kriging Acceptance Integration Boundary
//
// Test responsibilities:
//   1. Validate the public integration API
//   2. Verify accepted Kriging readiness
//   3. Verify accepted-with-warnings readiness
//   4. Verify rejected Kriging readiness
//   5. Verify technical evaluation failure
//   6. Preserve acceptance/validation diagnostics
//   7. Verify deterministic, non-mutating behaviour
//   8. Verify delegation to Phase 12.5.4
//
// Architectural boundary:
//   This service only connects the validation result to the
//   acceptance decision. It does not perform scientific
//   calculations or Kriging operations.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const integrationService = require(
  "../services/interpolation/krigingAcceptanceIntegrationService",
);

const acceptanceService = require(
  "../services/interpolation/krigingAcceptanceService",
);

const {
  evaluateKrigingReadiness,
} = integrationService;

const {
  DECISION_ACCEPTED,
  DECISION_ACCEPTED_WITH_WARNINGS,
  DECISION_REJECTED,
} = acceptanceService;

/* ============================================================
   FIXTURE
   ============================================================ */

function createValidValidationResult() {
  return {
    success: true,
    model: "spherical",

    criteria: {
      minimumUsableLags: {
        status: "passed",
        actual: 5,
        required: 3,
      },

      pairSupport: {
        status: "passed",
        actual: 50,
        required: 10,
      },

      nonFlatVariogram: {
        status: "passed",
        actual: false,
      },

      monotonicVariogram: {
        status: "passed",
        actual: false,
      },

      duplicateDistances: {
        status: "passed",
        actual: 0,
      },

      structuredVariance: {
        status: "passed",
        actual: 0.6166666666666665,
      },

      practicalRange: {
        status: "passed",
        actual: 4000,
        fallbackUsed: false,
        earlyDetection: false,
      },

      modelFit: {
        status: "passed",
        weightedSSE: 0.125,
        weightedRMSE: 0.05,
        totalPairs: 50,
      },

      parameters: {
        status: "passed",
        nugget: 0.2,
        sill: 0.8166666666666665,
        range: 4000,
      },
    },

    summary: {
      passedCount: 9,
      warningCount: 0,
      failedCount: 0,
    },

    warnings: [],
    errors: [],
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */

test("exports evaluateKrigingReadiness", () => {
  assert.equal(
    typeof evaluateKrigingReadiness,
    "function",
  );
});

/* ============================================================
   ACCEPTED
   ============================================================ */

test("accepted validation produces ready Kriging result", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.success, true);
  assert.equal(result.ready, true);
  assert.equal(result.decision, DECISION_ACCEPTED);
});

test("accepted result preserves the model", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.model, "spherical");
});

test("accepted result preserves validation diagnostics", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.deepEqual(result.validation, validation);
});

test("accepted result preserves acceptance diagnostics", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.acceptance.success, true);
  assert.equal(
    result.acceptance.decision,
    DECISION_ACCEPTED,
  );
  assert.equal(result.acceptance.accepted, true);
});

/* ============================================================
   ACCEPTED WITH WARNINGS
   ============================================================ */

test("accepted-with-warnings validation remains ready", () => {
  const validation = createValidValidationResult();

  validation.criteria.nonFlatVariogram.status =
    "warning";

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.success, true);
  assert.equal(result.ready, true);
  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
});

test("accepted-with-warnings preserves warnings", () => {
  const validation = createValidValidationResult();

  validation.criteria.duplicateDistances.status =
    "warning";

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.ready, true);
  assert.equal(
    result.acceptance.warnings.length,
    1,
  );
  assert.equal(
    result.warnings.length,
    1,
  );
});

/* ============================================================
   REJECTED
   ============================================================ */

test("rejected validation is not ready for Kriging", () => {
  const validation = createValidValidationResult();

  validation.criteria.modelFit.status = "failed";

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.success, true);
  assert.equal(result.ready, false);
  assert.equal(result.decision, DECISION_REJECTED);
});

test("rejected result preserves failure diagnostics", () => {
  const validation = createValidValidationResult();

  validation.criteria.parameters.status =
    "failed";

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.ready, false);
  assert.equal(
    result.acceptance.errors.length,
    1,
  );
  assert.equal(
    result.errors.length,
    1,
  );
});

/* ============================================================
   TECHNICAL FAILURE
   ============================================================ */

test("missing validation result produces technical failure", () => {
  const result = evaluateKrigingReadiness();

  assert.equal(result.success, false);
  assert.equal(result.ready, false);
  assert.equal(result.decision, null);
});

test("malformed validation result produces technical failure", () => {
  const result = evaluateKrigingReadiness({
    success: true,
    model: "spherical",
  });

  assert.equal(result.success, false);
  assert.equal(result.ready, false);
  assert.equal(result.decision, null);
});

/* ============================================================
   MIXED STATES
   ============================================================ */

test("warning plus hard failure remains not ready", () => {
  const validation = createValidValidationResult();

  validation.criteria.nonFlatVariogram.status =
    "warning";

  validation.criteria.practicalRange.status =
    "failed";

  const result = evaluateKrigingReadiness(validation);

  assert.equal(result.success, true);
  assert.equal(result.ready, false);
  assert.equal(result.decision, DECISION_REJECTED);
});

/* ============================================================
   DIAGNOSTIC PRESERVATION
   ============================================================ */

test("result preserves all nine validation criteria", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.deepEqual(
    Object.keys(result.validation.criteria),
    Object.keys(validation.criteria),
  );
});

test("result exposes acceptance summary", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.deepEqual(
    result.acceptance.summary,
    {
      passedCount: 9,
      warningCount: 0,
      failedCount: 0,
    },
  );
});

/* ============================================================
   DETERMINISM
   ============================================================ */

test("acceptance readiness evaluation is deterministic", () => {
  const validation = createValidValidationResult();

  const first = evaluateKrigingReadiness(validation);
  const second = evaluateKrigingReadiness(validation);

  assert.deepEqual(first, second);
});

/* ============================================================
   IMMUTABILITY
   ============================================================ */

test("acceptance readiness evaluation does not mutate input", () => {
  const validation = createValidValidationResult();
  const original = structuredClone(validation);

  evaluateKrigingReadiness(validation);

  assert.deepEqual(validation, original);
});

/* ============================================================
   DELEGATION BOUNDARY
   ============================================================ */

test("delegates acceptance decision to Phase 12.5.4 service", () => {
  const validation = createValidValidationResult();

  const original = acceptanceService.evaluateKrigingAcceptance;

  let callCount = 0;

  acceptanceService.evaluateKrigingAcceptance = (
    validationResult,
  ) => {
    callCount += 1;

    assert.strictEqual(
      validationResult,
      validation,
    );

    return {
      success: true,
      decision: DECISION_ACCEPTED,
      accepted: true,
      model: "spherical",
      criteria: validation.criteria,
      summary: {
        passedCount: 9,
        warningCount: 0,
        failedCount: 0,
      },
      warnings: [],
      errors: [],
    };
  };

  try {
    const result =
      evaluateKrigingReadiness(validation);

    assert.equal(callCount, 1);
    assert.equal(result.success, true);
    assert.equal(result.ready, true);
    assert.equal(
      result.decision,
      DECISION_ACCEPTED,
    );
  } finally {
    acceptanceService.evaluateKrigingAcceptance =
      original;
  }
});

/* ============================================================
   READY DECISION INVARIANTS
   ============================================================ */

test("accepted decision always produces ready true", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  if (result.decision === DECISION_ACCEPTED) {
    assert.equal(result.ready, true);
  }
});

test("accepted-with-warnings decision always produces ready true", () => {
  const validation = createValidValidationResult();

  validation.criteria.monotonicVariogram.status =
    "warning";

  const result = evaluateKrigingReadiness(validation);

  if (
    result.decision ===
    DECISION_ACCEPTED_WITH_WARNINGS
  ) {
    assert.equal(result.ready, true);
  }
});

test("rejected decision always produces ready false", () => {
  const validation = createValidValidationResult();

  validation.criteria.structuredVariance.status =
    "failed";

  const result = evaluateKrigingReadiness(validation);

  if (result.decision === DECISION_REJECTED) {
    assert.equal(result.ready, false);
  }
});

/* ============================================================
   WARNING / ERROR CONTRACT
   ============================================================ */

test("accepted result has no warnings or errors", () => {
  const validation = createValidValidationResult();

  const result = evaluateKrigingReadiness(validation);

  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
});

test("technical failure exposes errors", () => {
  const result = evaluateKrigingReadiness(null);

  assert.equal(result.success, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
});

/* ============================================================
   END
   ============================================================ */

console.log(
  "Kriging Acceptance Integration tests loaded.",
);
