"use strict";

// ============================================================
// server/tests/historicalContextService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6 — Historical GIS Context Integration
//
// Tests:
//   1. Request validation
//   2. Parameter validation
//   3. Nearest candidate selection
//   4. Candidate/context normalization
//   5. No historical candidates
//   6. No eligible nearest candidate
//   7. Successful parameter-specific comparison
//   8. Historical comparison failure
//   9. Backend provenance
//  10. Delegation to authoritative historical services
//
// Scientific calculations remain covered by:
//   historicalCandidateService.test.js
//   historicalComparisonService.test.js
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const historicalCandidateService = require(
  "../services/historicalCandidateService",
);

const historicalComparisonService = require(
  "../services/historicalComparisonService",
);

const historicalContextService = require(
  "../services/historicalContextService",
);

// ============================================================
// TEST FIXTURES
// ============================================================

function buildCandidate(overrides = {}) {
  return {
    dataset: {
      id: 2,
      code: "H2",
      name: "Visakhapatnam Kharif Rice Soil Fertility Dataset",
      publicationYear: 2020,
      status: "active",
    },

    site: {
      mandal: "Anakapalle",
      village: "Site Village",
      siteNo: 4,
      latitude: 17.6276,
      longitude: 82.9695,
    },

    distance: {
      value: 1.23,
      unit: "km",
    },

    depth: {
      current: {
        fromCm: 0,
        toCm: 15,
      },
      historical: {
        fromCm: 0,
        toCm: 15,
      },
      compatible: true,
      reason: null,
    },

    comparison: {
      supported: true,
      eligible: true,
      reason: null,
    },

    stages: {
      count: 3,
      values: [
        "Before sowing",
        "During growth",
        "After harvesting",
      ],
    },

    metadata: {
      candidateType: "historical_site",
      spatialRelationship: "spatial_candidate_only",
    },

    ...overrides,
  };
}

function buildCandidateResult(overrides = {}) {
  return {
    success: true,
    phase: "10.4",

    currentSample: {
      id: 4,
      sampleCode: "S-004",
      latitude: 17.7001,
      longitude: 83.1002,
      depth: {
        fromCm: 0,
        toCm: 15,
      },
    },

    candidates: [buildCandidate()],

    metadata: {
      candidateCount: 1,
      totalCandidateSites: 1,
      totalHistoricalObservations: 3,
      distanceCalculation: "haversine",
      candidateRanking: "nearest_first",
      source: "historical_database",
    },

    ...overrides,
  };
}

function buildComparisonResult(overrides = {}) {
  return {
    success: true,
    phase: "10.4",

    comparison: {
      eligible: true,
      eligibilityReason: null,

      dataset: {
        id: 2,
        code: "H2",
        name: "Visakhapatnam Kharif Rice Soil Fertility Dataset",
        publicationYear: 2020,
        status: "active",
      },

      site: {
        mandal: "Anakapalle",
        siteNo: 4,
        latitude: 17.6276,
        longitude: 82.9695,
      },

      depth: {
        fromCm: 0,
        toCm: 15,
        compatible: true,
      },

      parameter: {
        key: "phosphorus",
        label: "Phosphorus",
        unit: "kg/ha",
      },

      observations: [
        {
          sampleId: 101,
          sampleCode: "H2-S4-B",
          stage: "Before sowing",
          value: 20.5,
          classification: "Medium",
        },
        {
          sampleId: 102,
          sampleCode: "H2-S4-D",
          stage: "During growth",
          value: 22.4,
          classification: "Medium",
        },
        {
          sampleId: 103,
          sampleCode: "H2-S4-A",
          stage: "After harvesting",
          value: 20.5,
          classification: "Medium",
        },
      ],

      changes: [
        {
          fromStage: "Before sowing",
          toStage: "During growth",
          fromValue: 20.5,
          toValue: 22.4,
          absoluteChange: 1.9,
          percentageChange: 9.27,
          comparisonEligible: true,
          classificationTransition: {
            from: "Medium",
            to: "Medium",
            changed: false,
          },
        },
        {
          fromStage: "During growth",
          toStage: "After harvesting",
          fromValue: 22.4,
          toValue: 20.5,
          absoluteChange: -1.9,
          percentageChange: -8.48,
          comparisonEligible: true,
          classificationTransition: {
            from: "Medium",
            to: "Medium",
            changed: false,
          },
        },
      ],
    },

    metadata: {
      classificationLocation: "backend",
      calculationLocation: "backend",
      source: "historical_database",
    },

    ...overrides,
  };
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

test("historicalContextService validates sampleId and parameter", () => {
  const result = historicalContextService.validateRequest({
    sampleId: 4,
    parameter: "phosphorus",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.normalized.sampleId, 4);
  assert.equal(result.normalized.parameter, "phosphorus");
});

test("historicalContextService rejects invalid sampleId", () => {
  const result = historicalContextService.validateRequest({
    sampleId: 0,
    parameter: "phosphorus",
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("sampleId must be a positive integer."),
  );
});

test("historicalContextService rejects missing parameter", () => {
  const result = historicalContextService.validateRequest({
    sampleId: 4,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("parameter is required."),
  );
});

test("historicalContextService rejects unsupported parameter", () => {
  const result = historicalContextService.validateRequest({
    sampleId: 4,
    parameter: "calcium",
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "Unsupported historical comparison parameter.",
    ),
  );
});

test("historicalContextService accepts all supported historical parameters", () => {
  const parameters = [
    "ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon",
    "electrical_conductivity",
  ];

  for (const parameter of parameters) {
    const result = historicalContextService.validateRequest({
      sampleId: 4,
      parameter,
    });

    assert.equal(
      result.valid,
      true,
      `Expected parameter "${parameter}" to be valid.`,
    );
  }
});

// ============================================================
// CANDIDATE SELECTION
// ============================================================

test("selectNearestCandidate returns the nearest candidate regardless of eligibility", () => {
  const candidates = [
    {
      distance: { value: 0.5, unit: "km" },
      comparison: { supported: true, eligible: false },
    },
    {
      distance: { value: 1.2, unit: "km" },
      comparison: { supported: true, eligible: true },
    },
  ];

  const result =
    historicalContextService.selectNearestCandidate(candidates);

  assert.ok(result);
  assert.equal(result.distance.value, 0.5);
});

test("selectNearestCandidate returns null for an empty candidate collection", () => {
  assert.equal(
    historicalContextService.selectNearestCandidate([]),
    null,
  );
});

test("selectNearestCandidate returns null for an invalid candidate collection", () => {
  assert.equal(
    historicalContextService.selectNearestCandidate(null),
    null,
  );

  assert.equal(
    historicalContextService.selectNearestCandidate(undefined),
    null,
  );
});

// ============================================================
// CONTEXT BUILDERS
// ============================================================

test("buildCandidateContext preserves authoritative candidate information", () => {
  const candidate = buildCandidate();

  const context =
    historicalContextService.buildCandidateContext(candidate);

  assert.deepEqual(context.dataset, candidate.dataset);
  assert.deepEqual(context.site, candidate.site);
  assert.deepEqual(context.distance, candidate.distance);
  assert.deepEqual(context.depth, candidate.depth);
  assert.deepEqual(context.comparison, candidate.comparison);
  assert.deepEqual(context.stages, candidate.stages);
  assert.deepEqual(context.metadata, candidate.metadata);
});

test("buildCandidateContext returns null without a candidate", () => {
  assert.equal(
    historicalContextService.buildCandidateContext(null),
    null,
  );
});

test("buildComparisonContext preserves authoritative comparison information", () => {
  const result = buildComparisonResult();

  const context =
    historicalContextService.buildComparisonContext(result);

  assert.equal(context.eligible, true);
  assert.deepEqual(context.parameter, result.comparison.parameter);
  assert.deepEqual(context.observations, result.comparison.observations);
  assert.deepEqual(context.transitions, result.comparison.changes);
  assert.deepEqual(context.metadata, result.metadata);
});

test("buildComparisonContext returns null for failed comparison", () => {
  assert.equal(
    historicalContextService.buildComparisonContext({
      success: false,
    }),
    null,
  );
});

// ============================================================
// INVALID REQUEST
// ============================================================

test("getHistoricalContext rejects invalid request", async () => {
  const result =
    await historicalContextService.getHistoricalContext({
      sampleId: 0,
      parameter: "phosphorus",
    });

  assert.equal(result.success, false);
  assert.equal(result.phase, "10.6");
  assert.equal(result.code, "INVALID_REQUEST");
});

// ============================================================
// NO CANDIDATES
// ============================================================

test("getHistoricalContext returns unavailable when no historical candidates exist", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async () => ({
        success: true,
        phase: "10.4",

        currentSample: {
          id: 4,
          sampleCode: "S-004",
          latitude: 17.7001,
          longitude: 83.1002,
          depth: {
            fromCm: 0,
            toCm: 15,
          },
        },

        candidates: [],

        metadata: {
          candidateCount: 0,
        },
      });

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 4,
        parameter: "phosphorus",
      });

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.6");
    assert.equal(result.status, "unavailable");

    assert.equal(
      result.candidateSummary.candidateCount,
      0,
    );

    assert.equal(
      result.candidateSummary.eligibleCandidateCount,
      0,
    );

    assert.equal(result.candidate, null);
    assert.equal(result.comparison, null);

    assert.equal(result.parameter.key, "phosphorus");
    assert.equal(result.parameter.label, "Phosphorus");
    assert.equal(result.parameter.unit, "kg/ha");
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// NO ELIGIBLE NEAREST CANDIDATE
// ============================================================

test("getHistoricalContext returns not_eligible when candidates exist but none are eligible", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async () =>
        buildCandidateResult({
          candidates: [
            buildCandidate({
              comparison: {
                supported: true,
                eligible: false,
                reason:
                  "Sampling depths are incompatible.",
              },
            }),
          ],
        });

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 4,
        parameter: "phosphorus",
      });

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.6");
    assert.equal(result.status, "not_eligible");

    assert.equal(
      result.candidateSummary.candidateCount,
      1,
    );

    assert.equal(
      result.candidateSummary.eligibleCandidateCount,
      0,
    );

    assert.ok(result.candidate);
    assert.equal(result.candidate.site.siteNo, 4);
    assert.equal(result.comparison, null);
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// SUCCESSFUL COMPARISON
// ============================================================

test("getHistoricalContext performs comparison using the map-selected parameter", async () => {
  const originalCandidates =
    historicalCandidateService.getHistoricalCandidates;

  const originalComparison =
    historicalComparisonService.getHistoricalComparison;

  let receivedCandidateRequest = null;
  let receivedComparisonRequest = null;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async (request) => {
        receivedCandidateRequest = request;
        return buildCandidateResult();
      };

    historicalComparisonService.getHistoricalComparison =
      async (request) => {
        receivedComparisonRequest = request;
        return buildComparisonResult();
      };

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 4,
        parameter: "phosphorus",
      });

    assert.deepEqual(
      receivedCandidateRequest,
      { sampleId: 4 },
    );

    assert.deepEqual(
      receivedComparisonRequest,
      {
        datasetCode: "H2",
        mandal: "Anakapalle",
        siteNo: 4,
        parameter: "phosphorus",
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.6");
    assert.equal(result.status, "available");

    assert.equal(result.currentSample.id, 4);

    assert.equal(result.parameter.key, "phosphorus");
    assert.equal(result.parameter.label, "Phosphorus");
    assert.equal(result.parameter.unit, "kg/ha");

    assert.equal(
      result.candidateSummary.candidateCount,
      1,
    );

    assert.equal(
      result.candidateSummary.eligibleCandidateCount,
      1,
    );

    assert.equal(result.candidate.site.siteNo, 4);

    assert.equal(result.comparison.available, true);
    assert.equal(result.comparison.eligible, true);
    assert.equal(
      result.comparison.parameter.key,
      "phosphorus",
    );

    assert.equal(
      result.comparison.transitions.length,
      2,
    );

    assert.equal(
      result.comparison.transitions[0].absoluteChange,
      1.9,
    );

    assert.equal(
      result.comparison.transitions[0].percentageChange,
      9.27,
    );

    assert.equal(
      result.comparison.transitions[0]
        .classificationTransition.from,
      "Medium",
    );

    assert.equal(
      result.comparison.transitions[0]
        .classificationTransition.to,
      "Medium",
    );

    assert.equal(
      result.provenance.scientificAuthority,
      "Backend",
    );

    assert.equal(
      result.provenance.calculationLocation,
      "Backend",
    );

    assert.equal(
      result.provenance.classificationLocation,
      "Backend",
    );

    assert.equal(
      result.provenance.source,
      "historical_database",
    );
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      originalCandidates;

    historicalComparisonService.getHistoricalComparison =
      originalComparison;
  }
});

// ============================================================
// COMPARISON FAILURE
// ============================================================

test("getHistoricalContext returns comparison_unavailable when historical comparison fails", async () => {
  const originalCandidates =
    historicalCandidateService.getHistoricalCandidates;

  const originalComparison =
    historicalComparisonService.getHistoricalComparison;

  let receivedRequest = null;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async () => buildCandidateResult();

    historicalComparisonService.getHistoricalComparison =
      async (request) => {
        receivedRequest = request;

        return {
          success: false,
          phase: "10.4",
          code: "SITE_NOT_FOUND",
          message:
            "No historical observations were found for the requested site.",
        };
      };

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 4,
        parameter: "phosphorus",
      });

    assert.deepEqual(
      receivedRequest,
      {
        datasetCode: "H2",
        mandal: "Anakapalle",
        siteNo: 4,
        parameter: "phosphorus",
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.6");
    assert.equal(
      result.status,
      "comparison_unavailable",
    );

    assert.equal(
      result.comparison.available,
      false,
    );

    assert.equal(
      result.comparison.code,
      "SITE_NOT_FOUND",
    );

    assert.equal(result.candidate.site.siteNo, 4);
    assert.equal(result.parameter.key, "phosphorus");
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      originalCandidates;

    historicalComparisonService.getHistoricalComparison =
      originalComparison;
  }
});

// ============================================================
// CANDIDATE SERVICE FAILURE
// ============================================================

test("getHistoricalContext propagates candidate discovery failure", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async () => ({
        success: false,
        phase: "10.4",
        code: "SAMPLE_NOT_FOUND",
        message:
          'Current soil sample "999" was not found.',
      });

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 999,
        parameter: "phosphorus",
      });

    assert.equal(result.success, false);
    assert.equal(result.phase, "10.6");
    assert.equal(result.code, "SAMPLE_NOT_FOUND");

    assert.equal(
      result.message,
      'Current soil sample "999" was not found.',
    );
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// NEAREST CANDIDATE ONLY
// ============================================================
//
// Critical Phase 10.6 rule:
//
//   candidates[0] = nearest candidate
//
//   If candidates[0] is eligible:
//       compare candidates[0]
//
//   If candidates[0] is NOT eligible:
//       status = not_eligible
//       comparison = null
//       DO NOT fall back to candidates[1+]
//
// ============================================================

test("getHistoricalContext uses only the nearest candidate when it is ineligible", async () => {
  const originalCandidates =
    historicalCandidateService.getHistoricalCandidates;

  const originalComparison =
    historicalComparisonService.getHistoricalComparison;

  let comparisonCalled = false;

  try {
    historicalCandidateService.getHistoricalCandidates =
      async () =>
        buildCandidateResult({
          candidates: [
            buildCandidate({
              site: {
                mandal: "Anakapalle",
                village: "Site Village",
                siteNo: 4,
                latitude: 17.6276,
                longitude: 82.9695,
              },
              distance: {
                value: 1.23,
                unit: "km",
              },
              comparison: {
                supported: true,
                eligible: false,
                reason:
                  "Sampling depths are incompatible.",
              },
            }),

            buildCandidate({
              site: {
                mandal: "Anakapalle",
                village: "Site Village",
                siteNo: 5,
                latitude: 17.6235,
                longitude: 82.9693,
              },
              distance: {
                value: 2.50,
                unit: "km",
              },
              comparison: {
                supported: true,
                eligible: true,
                reason: null,
              },
            }),
          ],

          metadata: {
            candidateCount: 2,
          },
        });

    historicalComparisonService.getHistoricalComparison =
      async () => {
        comparisonCalled = true;
        return buildComparisonResult();
      };

    const result =
      await historicalContextService.getHistoricalContext({
        sampleId: 4,
        parameter: "phosphorus",
      });

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.6");
    assert.equal(result.status, "not_eligible");

    assert.equal(
      result.candidateSummary.candidateCount,
      2,
    );

    assert.equal(
      result.candidateSummary.eligibleCandidateCount,
      1,
    );

    assert.ok(result.candidate);
    assert.equal(result.candidate.site.siteNo, 4);
    assert.equal(result.candidate.distance.value, 1.23);

    assert.equal(result.comparison, null);
    assert.equal(comparisonCalled, false);
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      originalCandidates;

    historicalComparisonService.getHistoricalComparison =
      originalComparison;
  }
});

// ============================================================
// EXPORT CONTRACT
// ============================================================

test("historicalContextService exports the expected public API", () => {
  assert.equal(
    typeof historicalContextService.validateRequest,
    "function",
  );

  assert.equal(
    typeof historicalContextService.selectNearestCandidate,
    "function",
  );

  assert.equal(
    typeof historicalContextService.buildCandidateContext,
    "function",
  );

  assert.equal(
    typeof historicalContextService.buildComparisonContext,
    "function",
  );

  assert.equal(
    typeof historicalContextService.getHistoricalContext,
    "function",
  );
});