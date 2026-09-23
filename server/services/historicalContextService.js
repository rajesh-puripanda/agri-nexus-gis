"use strict";

// ============================================================
// server/services/historicalContextService.js
// ============================================================
//
// Soil Analysis GIS
// Phase 10.6 — Historical GIS Context Integration
//
// GIS rule:
//   ONLY the 1st nearest historical candidate is compared.
//   A farther candidate is never substituted if the nearest
//   candidate is ineligible.
//
// Scientific calculations/classification remain delegated to:
//   historicalCandidateService.js
//   historicalComparisonService.js
// ============================================================

const historicalCandidateService = require(
  "./historicalCandidateService",
);

const historicalComparisonService = require(
  "./historicalComparisonService",
);

const API_PHASE = "10.6";

// ============================================================
// FAILURE HELPER
// ============================================================

function fail(code, message, details = {}) {
  return {
    success: false,
    phase: API_PHASE,
    code,
    message,
    ...details,
  };
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

function validateRequest(request = {}) {
  const errors = [];
  const sampleId = Number(request.sampleId);
  const parameter =
    typeof request.parameter === "string"
      ? request.parameter.trim()
      : "";

  if (!Number.isInteger(sampleId) || sampleId <= 0) {
    errors.push("sampleId must be a positive integer.");
  }

  if (!parameter) {
    errors.push("parameter is required.");
  } else if (
    !historicalComparisonService.PARAMETERS[parameter]
  ) {
    errors.push(
      "Unsupported historical comparison parameter.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      sampleId,
      parameter,
    },
  };
}

// ============================================================
// CANDIDATE SELECTION
// ============================================================
//
// historicalCandidateService already ranks candidates
// nearest-first. GIS context uses ONLY candidates[0].
//
// A farther candidate is never substituted.
// ============================================================

function selectNearestCandidate(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  return candidates[0] ?? null;
}

// ============================================================
// BUILD CANDIDATE CONTEXT
// ============================================================

function buildCandidateContext(candidate) {
  if (!candidate) {
    return null;
  }

  return {
    dataset: candidate.dataset ?? null,
    site: candidate.site ?? null,
    distance: candidate.distance ?? null,
    depth: candidate.depth ?? null,
    comparison: candidate.comparison ?? null,
    stages: candidate.stages ?? null,
    metadata: candidate.metadata ?? null,
  };
}

// ============================================================
// BUILD COMPARISON CONTEXT
// ============================================================

function buildComparisonContext(comparisonResult) {
  if (!comparisonResult?.success) {
    return null;
  }

  const comparison =
    comparisonResult.comparison ?? {};

  return {
    eligible: comparison.eligible ?? false,
    eligibilityReason:
      comparison.eligibilityReason ?? null,
    dataset: comparison.dataset ?? null,
    site: comparison.site ?? null,
    depth: comparison.depth ?? null,
    parameter: comparison.parameter ?? null,
    observations: comparison.observations ?? [],
    transitions: comparison.changes ?? [],
    metadata: comparisonResult.metadata ?? null,
  };
}

// ============================================================
// PARAMETER CONTEXT
// ============================================================

function buildParameterContext(parameter) {
  const definition =
    historicalComparisonService.PARAMETERS[parameter];

  return {
    key: parameter,
    label: definition.label,
    unit: definition.unit,
  };
}

// ============================================================
// PROVENANCE
// ============================================================

function buildProvenance() {
  return {
    scientificAuthority: "Backend",
    calculationLocation: "Backend",
    classificationLocation: "Backend",
    source: "historical_database",
  };
}

// ============================================================
// MAIN SERVICE
// ============================================================

async function getHistoricalContext(request = {}) {
  const validation = validateRequest(request);

  if (!validation.valid) {
    return fail(
      "INVALID_REQUEST",
      "Invalid historical context request.",
      { errors: validation.errors },
    );
  }

  const { sampleId, parameter } =
    validation.normalized;

  // ----------------------------------------------------------
  // Historical candidate discovery
  // ----------------------------------------------------------

  const candidateResult =
    await historicalCandidateService.getHistoricalCandidates({
      sampleId,
    });

  if (!candidateResult.success) {
    return {
      ...candidateResult,
      phase: API_PHASE,
    };
  }

  const candidates = Array.isArray(
    candidateResult.candidates,
  )
    ? candidateResult.candidates
    : [];

  const parameterContext =
    buildParameterContext(parameter);

  // ----------------------------------------------------------
  // No historical candidates
  // ----------------------------------------------------------

  if (candidates.length === 0) {
    return {
      success: true,
      phase: API_PHASE,
      status: "unavailable",

      currentSample:
        candidateResult.currentSample ?? null,

      parameter: parameterContext,

      candidateSummary: {
        candidateCount: 0,
        eligibleCandidateCount: 0,
      },

      candidate: null,
      comparison: null,

      provenance: buildProvenance(),

      metadata: {
        candidateDiscovery:
          "historicalCandidateService",
        comparison:
          "historicalComparisonService",
        candidateSelection:
          "nearest_candidate_only",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ----------------------------------------------------------
  // ONLY the 1st nearest candidate
  // ----------------------------------------------------------

  const nearestCandidate =
    selectNearestCandidate(candidates);

  const eligibleCandidateCount =
    candidates.filter(
      (candidate) =>
        candidate?.comparison?.eligible === true,
    ).length;

  // ----------------------------------------------------------
  // Nearest candidate is not eligible
  // ----------------------------------------------------------

  if (
    !nearestCandidate ||
    nearestCandidate.comparison?.eligible !== true
  ) {
    return {
      success: true,
      phase: API_PHASE,
      status: "not_eligible",

      currentSample:
        candidateResult.currentSample ?? null,

      parameter: parameterContext,

      candidateSummary: {
        candidateCount: candidates.length,
        eligibleCandidateCount,
      },

      candidate:
        buildCandidateContext(nearestCandidate),

      comparison: null,

      provenance: buildProvenance(),

      metadata: {
        candidateDiscovery:
          "historicalCandidateService",
        comparison:
          "historicalComparisonService",
        candidateSelection:
          "nearest_candidate_only",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ----------------------------------------------------------
  // Compare ONLY the nearest candidate
  // ----------------------------------------------------------

  const comparisonResult =
    await historicalComparisonService.getHistoricalComparison({
      datasetCode: nearestCandidate.dataset?.code,
      mandal: nearestCandidate.site?.mandal,
      siteNo: nearestCandidate.site?.siteNo,
      parameter,
    });

  // ----------------------------------------------------------
  // Comparison failure
  // ----------------------------------------------------------

  if (!comparisonResult.success) {
    return {
      success: true,
      phase: API_PHASE,
      status: "comparison_unavailable",

      currentSample:
        candidateResult.currentSample ?? null,

      parameter: parameterContext,

      candidateSummary: {
        candidateCount: candidates.length,
        eligibleCandidateCount,
      },

      candidate:
        buildCandidateContext(nearestCandidate),

      comparison: {
        available: false,
        code: comparisonResult.code ?? null,
        message:
          comparisonResult.message ?? null,
      },

      provenance: buildProvenance(),

      metadata: {
        candidateDiscovery:
          "historicalCandidateService",
        comparison:
          "historicalComparisonService",
        candidateSelection:
          "nearest_candidate_only",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ----------------------------------------------------------
  // Successful integrated historical context
  // ----------------------------------------------------------

  return {
    success: true,
    phase: API_PHASE,
    status: "available",

    currentSample:
      candidateResult.currentSample ?? null,

    parameter: parameterContext,

    candidateSummary: {
      candidateCount: candidates.length,
      eligibleCandidateCount,
    },

    candidate:
      buildCandidateContext(nearestCandidate),

    comparison: {
      available: true,
      ...buildComparisonContext(comparisonResult),
    },

    provenance: buildProvenance(),

    metadata: {
      candidateDiscovery:
        "historicalCandidateService",
      comparison:
        "historicalComparisonService",
      candidateSelection:
        "nearest_candidate_only",
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  API_PHASE,
  validateRequest,
  selectNearestCandidate,
  buildCandidateContext,
  buildComparisonContext,
  getHistoricalContext,
};
