"use strict";

// ============================================================
// server/tests/krigingAcceptanceService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.4.2  Kriging Acceptance / Rejection Rules
//
// Test responsibilities:
//   1. Validate public acceptance API
//   2. Validate accepted decisions
//   3. Validate accepted-with-warning decisions
//   4. Validate rejection decisions
//   5. Validate mixed criterion states
//   6. Validate malformed input handling
//   7. Verify deterministic, non-mutating behaviour
//
// Scientific acceptance policy:
//   Hard failures:
//     minimumUsableLags
//     pairSupport
//     structuredVariance
//     practicalRange
//     modelFit
//     parameters
//
//   Warning-only conditions:
//     nonFlatVariogram
//     monotonicVariogram
//     duplicateDistances
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const acceptanceService = require(
  "../services/interpolation/krigingAcceptanceService",
);

const {
  validateAcceptance,
  evaluateKrigingAcceptance,
  DECISION_ACCEPTED,
  DECISION_ACCEPTED_WITH_WARNINGS,
  DECISION_REJECTED,
  HARD_FAILURE_CRITERIA,
  WARNING_CRITERIA,
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setCriterionStatus(result, criterion, status) {
  result.criteria[criterion].status = status;
  return result;
}

/* ============================================================
   API
   ============================================================ */

test("exports required acceptance API", () => {
  assert.equal(typeof validateAcceptance, "function");
  assert.equal(typeof evaluateKrigingAcceptance, "function");
});

test("exports decision constants", () => {
  assert.equal(DECISION_ACCEPTED, "accepted");
  assert.equal(
    DECISION_ACCEPTED_WITH_WARNINGS,
    "accepted_with_warnings",
  );
  assert.equal(DECISION_REJECTED, "rejected");
});

test("exports hard failure criteria", () => {
  assert.ok(Array.isArray(HARD_FAILURE_CRITERIA));

  assert.deepEqual(
    HARD_FAILURE_CRITERIA,
    [
      "minimumUsableLags",
      "pairSupport",
      "structuredVariance",
      "practicalRange",
      "modelFit",
      "parameters",
    ],
  );
});

test("exports warning criteria", () => {
  assert.ok(Array.isArray(WARNING_CRITERIA));

  assert.deepEqual(
    WARNING_CRITERIA,
    [
      "nonFlatVariogram",
      "monotonicVariogram",
      "duplicateDistances",
    ],
  );
});

/* ============================================================
   ACCEPTED
   ============================================================ */

test("all passed criteria produce accepted decision", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(result.success, true);
  assert.equal(result.decision, DECISION_ACCEPTED);
  assert.equal(result.accepted, true);
});

test("accepted decision contains the model", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(result.model, "spherical");
});

test("accepted decision preserves all nine criteria", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(Object.keys(result.criteria).length, 9);

  for (const criterion of [
    "minimumUsableLags",
    "pairSupport",
    "nonFlatVariogram",
    "monotonicVariogram",
    "duplicateDistances",
    "structuredVariance",
    "practicalRange",
    "modelFit",
    "parameters",
  ]) {
    assert.ok(result.criteria[criterion]);
  }
});

test("accepted decision has zero warnings and failures", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(result.summary.warningCount, 0);
  assert.equal(result.summary.failedCount, 0);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
});

/* ============================================================
   ACCEPTED WITH WARNINGS
   ============================================================ */

test("flat variogram produces accepted-with-warnings decision", () => {
  const input = createValidValidationResult();

  input.criteria.nonFlatVariogram = {
    status: "warning",
    actual: true,
  };

  const result = validateAcceptance(input);

  assert.equal(result.success, true);
  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.summary.warningCount, 1);
});

test("non-monotonic variogram produces accepted-with-warnings decision", () => {
  const input = createValidValidationResult();

  input.criteria.monotonicVariogram = {
    status: "warning",
    actual: true,
  };

  const result = validateAcceptance(input);

  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
});

test("duplicate distances produce accepted-with-warnings decision", () => {
  const input = createValidValidationResult();

  input.criteria.duplicateDistances = {
    status: "warning",
    actual: 2,
  };

  const result = validateAcceptance(input);

  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
});

test("range fallback produces accepted-with-warnings decision", () => {
  const input = createValidValidationResult();

  input.criteria.practicalRange = {
    status: "warning",
    actual: 5000,
    fallbackUsed: true,
    earlyDetection: false,
  };

  const result = validateAcceptance(input);

  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
});

test("early range detection produces accepted-with-warnings decision", () => {
  const input = createValidValidationResult();

  input.criteria.practicalRange = {
    status: "warning",
    actual: 2500,
    fallbackUsed: false,
    earlyDetection: true,
  };

  const result = validateAcceptance(input);

  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
});

test("multiple warnings remain accepted", () => {
  const input = createValidValidationResult();

  input.criteria.nonFlatVariogram.status = "warning";
  input.criteria.monotonicVariogram.status = "warning";
  input.criteria.duplicateDistances.status = "warning";
  input.criteria.practicalRange.status = "warning";

  const result = validateAcceptance(input);

  assert.equal(result.success, true);
  assert.equal(
    result.decision,
    DECISION_ACCEPTED_WITH_WARNINGS,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.summary.warningCount, 4);
});

/* ============================================================
   REJECTION
   ============================================================ */

for (const criterion of HARD_FAILURE_CRITERIA) {
  test(`${criterion} failure rejects Kriging`, () => {
    const input = createValidValidationResult();

    input.criteria[criterion].status = "failed";

    const result = validateAcceptance(input);

    assert.equal(result.success, true);
    assert.equal(result.decision, DECISION_REJECTED);
    assert.equal(result.accepted, false);
    assert.equal(result.summary.failedCount, 1);
  });
}

test("warning plus hard failure remains rejected", () => {
  const input = createValidValidationResult();

  input.criteria.nonFlatVariogram.status = "warning";
  input.criteria.modelFit.status = "failed";

  const result = validateAcceptance(input);

  assert.equal(result.decision, DECISION_REJECTED);
  assert.equal(result.accepted, false);
  assert.equal(result.summary.warningCount, 1);
  assert.equal(result.summary.failedCount, 1);
});

test("multiple hard failures remain rejected", () => {
  const input = createValidValidationResult();

  input.criteria.minimumUsableLags.status = "failed";
  input.criteria.pairSupport.status = "failed";
  input.criteria.parameters.status = "failed";

  const result = validateAcceptance(input);

  assert.equal(result.decision, DECISION_REJECTED);
  assert.equal(result.accepted, false);
  assert.equal(result.summary.failedCount, 3);
});

/* ============================================================
   DECISION INVARIANTS
   ============================================================ */

test("accepted decision invariant is preserved", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(
    result.accepted,
    result.decision === DECISION_ACCEPTED ||
      result.decision === DECISION_ACCEPTED_WITH_WARNINGS,
  );
});

test("rejected decision invariant is preserved", () => {
  const input = createValidValidationResult();
  input.criteria.parameters.status = "failed";

  const result = validateAcceptance(input);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_REJECTED);
});

test("scientific rejection does not set success to false", () => {
  const input = createValidValidationResult();
  input.criteria.modelFit.status = "failed";

  const result = validateAcceptance(input);

  assert.equal(result.success, true);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_REJECTED);
});

/* ============================================================
   INVALID INPUT
   ============================================================ */

test("missing validation result returns evaluation failure", () => {
  const result = validateAcceptance();

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

test("null validation result is rejected", () => {
  const result = validateAcceptance(null);

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

test("non-object validation result is rejected", () => {
  const result = validateAcceptance("invalid");

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

test("missing criteria returns evaluation failure", () => {
  const input = createValidValidationResult();
  delete input.criteria;

  const result = validateAcceptance(input);

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

test("malformed criteria returns evaluation failure", () => {
  const input = createValidValidationResult();

  input.criteria.modelFit = null;

  const result = validateAcceptance(input);

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

test("invalid criterion status returns evaluation failure", () => {
  const input = createValidValidationResult();

  input.criteria.parameters.status = "unknown";

  const result = validateAcceptance(input);

  assert.equal(result.success, false);
  assert.equal(result.accepted, false);
  assert.equal(result.decision, null);
});

/* ============================================================
   ALIAS
   ============================================================ */

test("evaluateKrigingAcceptance is equivalent to validateAcceptance", () => {
  const input = createValidValidationResult();

  const first = validateAcceptance(input);
  const second = evaluateKrigingAcceptance(input);

  assert.deepEqual(second, first);
});

/* ============================================================
   DETERMINISM / IMMUTABILITY
   ============================================================ */

test("acceptance evaluation is deterministic", () => {
  const input = createValidValidationResult();

  const first = validateAcceptance(input);
  const second = validateAcceptance(input);

  assert.deepEqual(first, second);
});

test("acceptance evaluation does not mutate input", () => {
  const input = createValidValidationResult();
  const before = clone(input);

  validateAcceptance(input);

  assert.deepEqual(input, before);
});

test("warning decision does not mutate input", () => {
  const input = createValidValidationResult();

  input.criteria.duplicateDistances.status = "warning";

  const before = clone(input);

  validateAcceptance(input);

  assert.deepEqual(input, before);
});

test("rejection decision does not mutate input", () => {
  const input = createValidValidationResult();

  input.criteria.modelFit.status = "failed";

  const before = clone(input);

  validateAcceptance(input);

  assert.deepEqual(input, before);
});

/* ============================================================
   SUMMARY
   ============================================================ */

test("accepted result reports nine passed criteria", () => {
  const result = validateAcceptance(
    createValidValidationResult(),
  );

  assert.equal(result.summary.passedCount, 9);
  assert.equal(result.summary.warningCount, 0);
  assert.equal(result.summary.failedCount, 0);
});

test("warning result reports passed and warning counts", () => {
  const input = createValidValidationResult();

  input.criteria.nonFlatVariogram.status = "warning";
  input.criteria.duplicateDistances.status = "warning";

  const result = validateAcceptance(input);

  assert.equal(result.summary.passedCount, 7);
  assert.equal(result.summary.warningCount, 2);
  assert.equal(result.summary.failedCount, 0);
});

test("rejected result reports passed and failed counts", () => {
  const input = createValidValidationResult();

  input.criteria.structuredVariance.status = "failed";
  input.criteria.parameters.status = "failed";

  const result = validateAcceptance(input);

  assert.equal(result.summary.passedCount, 7);
  assert.equal(result.summary.warningCount, 0);
  assert.equal(result.summary.failedCount, 2);
});

console.log("Kriging Acceptance / Rejection tests loaded.");
