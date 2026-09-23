"use strict";

// ============================================================
// server/services/historicalCandidateService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.5.1 — Historical Spatial Candidate Discovery
//
// Responsibilities:
//   1. Validate current soil sample selection
//   2. Retrieve the authoritative current soil sample
//   3. Retrieve historical spatial candidate observations
//   4. Calculate Haversine distance
//   5. Group historical observations into historical candidate sites
//   6. Normalize historical depth representation for comparison
//   7. Determine depth compatibility
//   8. Rank candidates by spatial distance
//   9. Return stable candidate-discovery results
//
// This service does NOT:
//   - perform historical parameter comparisons
//   - calculate historical parameter changes
//   - perform scientific classification
//   - infer agricultural stages from dates
//   - treat spatial proximity as scientific comparability
//   - modify historical database values
//
// Historical comparison remains authoritative in:
//   server/services/historicalComparisonService.js
//
// Scientific classification remains authoritative in:
//   server/services/soilAnalysisService.js
//
// ============================================================

const soilRepository = require("../repositories/soilRepository");
const historicalRepository = require("../repositories/historicalRepository");
const {
  calculateDistanceMeters,
} = require("./spatialQueryService");

// ============================================================
// CONSTANTS
// ============================================================

const API_PHASE = "10.4";

const DEFAULT_MAX_CANDIDATES = 10;
const MAX_CANDIDATES = 50;

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
// GENERIC HELPERS
// ============================================================

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function roundValue(value, decimals = 3) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  const factor = 10 ** decimals;

  return (
    Math.round((Number(value) + Number.EPSILON) * factor) / factor
  );
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

function validateRequest(request = {}) {
  const errors = [];

  const sampleId = Number(request.sampleId);

  if (!Number.isInteger(sampleId) || sampleId <= 0) {
    errors.push("sampleId must be a positive integer.");
  }

  if (request.maxCandidates !== undefined) {
    const maxCandidates = Number(request.maxCandidates);

    if (!Number.isInteger(maxCandidates) || maxCandidates <= 0) {
      errors.push("maxCandidates must be a positive integer.");
    } else if (maxCandidates > MAX_CANDIDATES) {
      errors.push(
        `maxCandidates cannot exceed ${MAX_CANDIDATES}.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      sampleId,
      maxCandidates:
        request.maxCandidates === undefined
          ? DEFAULT_MAX_CANDIDATES
          : Number(request.maxCandidates),
    },
  };
}

// ============================================================
// DEPTH NORMALIZATION
// ============================================================
//
// Historical H1 data represents depth as:
//
//   0.00 -> -30.00 cm
//
// while H2/current samples use:
//
//   0.00 -> 15.00 cm
//
// The database values are NOT modified.
//
// Negative depth values are normalized only for comparison.
//
// Example:
//
//   0 -> -30  becomes 0 -> 30
//   0 -> 15   remains 0 -> 15
//
// ============================================================

function normalizeDepthInterval(fromCm, toCm) {
  const from = normalizeNumber(fromCm);
  const to = normalizeNumber(toCm);

  if (from === null || to === null) {
    return {
      fromCm: from,
      toCm: to,
      valid: false,
    };
  }

  const normalizedFrom = Math.min(
    Math.abs(from),
    Math.abs(to),
  );

  const normalizedTo = Math.max(
    Math.abs(from),
    Math.abs(to),
  );

  return {
    fromCm: normalizedFrom,
    toCm: normalizedTo,
    valid: true,
  };
}

// ============================================================
// DEPTH COMPATIBILITY
// ============================================================

function compareDepthIntervals(currentDepth, historicalDepth) {
  const current = normalizeDepthInterval(
    currentDepth.fromCm,
    currentDepth.toCm,
  );

  const historical = normalizeDepthInterval(
    historicalDepth.fromCm,
    historicalDepth.toCm,
  );

  if (!current.valid || !historical.valid) {
    return {
      compatible: false,
      reason: "Sampling depth information is unavailable.",
      current,
      historical,
    };
  }

  const compatible =
    current.fromCm === historical.fromCm &&
    current.toCm === historical.toCm;

  return {
    compatible,
    reason: compatible
      ? null
      : "Sampling depths are incompatible.",
    current,
    historical,
  };
}

// ============================================================
// HISTORICAL SITE IDENTITY
// ============================================================
//
// H2:
//
//   dataset + mandal + site_no
//
// H1 does not have site_no in the imported data.
//
// Therefore H1 falls back to sample_code so that individual
// H1 records are not incorrectly collapsed into one site.
//
// ============================================================

function getCandidateGroupKey(row) {
  const datasetCode = String(row.dataset_code ?? "").trim();
  const mandal = String(row.mandal ?? "").trim().toLowerCase();

  const siteNo = normalizeNumber(row.site_no);

  if (siteNo !== null) {
    return [
      datasetCode,
      mandal,
      `site:${siteNo}`,
    ].join("|");
  }

  const sampleCode = String(row.sample_code ?? "").trim();

  return [
    datasetCode,
    mandal,
    `sample:${sampleCode}`,
  ].join("|");
}

// ============================================================
// GROUP HISTORICAL OBSERVATIONS
// ============================================================

function groupHistoricalCandidates(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = getCandidateGroupKey(row);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        dataset: {
          id: normalizeNumber(row.dataset_id),
          code: row.dataset_code ?? null,
          name: row.dataset_name ?? null,
          publicationYear: normalizeNumber(
            row.publication_year,
          ),
          status: row.dataset_status ?? null,
        },
        site: {
          mandal: row.mandal ?? null,
          village: row.village ?? null,
          siteNo: normalizeNumber(row.site_no),
          latitude: normalizeNumber(row.latitude),
          longitude: normalizeNumber(row.longitude),
        },
        observations: [],
      });
    }

    groups.get(key).observations.push({
      sampleId: normalizeNumber(row.id),
      sampleCode: row.sample_code ?? null,
      stage: row.stage ?? null,
      collectionPeriod: {
        start: row.collection_period_start ?? null,
        end: row.collection_period_end ?? null,
      },
      depth: {
        fromCm: normalizeNumber(row.depth_from_cm),
        toCm: normalizeNumber(row.depth_to_cm),
      },
      sourceStatus: row.source_status ?? null,
      exclusionReason: row.exclusion_reason ?? null,
    });
  }

  return [...groups.values()];
}

// ============================================================
// BUILD CANDIDATE
// ============================================================

function buildCandidate(group, currentSample) {
  const distance = calculateDistanceMeters(
    currentSample.latitude,
    currentSample.longitude,
    group.site.latitude,
    group.site.longitude,
  );

  const firstObservation = group.observations[0];

  const historicalDepth = {
    fromCm: firstObservation?.depth.fromCm ?? null,
    toCm: firstObservation?.depth.toCm ?? null,
  };

  const currentDepth = {
    fromCm: normalizeNumber(currentSample.depth_from_cm),
    toCm: normalizeNumber(currentSample.depth_to_cm),
  };

  const depthComparison = compareDepthIntervals(
    currentDepth,
    historicalDepth,
  );

  const comparisonSupported =
    group.site.siteNo !== null;

  const observations = [...group.observations].sort(
    (a, b) => {
      const aDate =
        a.collectionPeriod.start ?? "";
      const bDate =
        b.collectionPeriod.start ?? "";

      if (aDate < bDate) return -1;
      if (aDate > bDate) return 1;

      return (
        Number(a.sampleId ?? 0) -
        Number(b.sampleId ?? 0)
      );
    },
  );

  const stages = [
    ...new Set(
      observations
        .map((observation) => observation.stage)
        .filter(Boolean),
    ),
  ];

  return {
    dataset: group.dataset,

    site: {
      mandal: group.site.mandal,
      village: group.site.village,
      siteNo: group.site.siteNo,
      latitude: group.site.latitude,
      longitude: group.site.longitude,
    },

    distance: {
      value: roundValue(distance, 2),
      unit: "m",
    },

    depth: {
      current: {
        fromCm: depthComparison.current.fromCm,
        toCm: depthComparison.current.toCm,
      },
      historical: {
        fromCm: depthComparison.historical.fromCm,
        toCm: depthComparison.historical.toCm,
      },
      compatible: depthComparison.compatible,
      reason: depthComparison.reason,
    },

    comparison: {
      supported: comparisonSupported,
      eligible:
        comparisonSupported &&
        depthComparison.compatible,
      reason: !comparisonSupported
        ? "Historical site number is unavailable for comparison."
        : depthComparison.reason,
    },

    stages: {
      count: stages.length,
      values: stages,
    },

    observations,

    metadata: {
      candidateType: "historical_site",
      spatialRelationship:
        "spatial_candidate_only",
    },
  };
}

// ============================================================
// MAIN SERVICE
// ============================================================

async function getHistoricalCandidates(request = {}) {
  const validation = validateRequest(request);

  if (!validation.valid) {
    return fail(
      "INVALID_REQUEST",
      "Invalid historical candidate request.",
      {
        errors: validation.errors,
      },
    );
  }

  const {
    sampleId,
    maxCandidates,
  } = validation.normalized;

  // ----------------------------------------------------------
  // Retrieve current authoritative soil sample
  // ----------------------------------------------------------

  const currentSample =
    await soilRepository.getSoilSampleById(sampleId);

  if (!currentSample) {
    return fail(
      "SAMPLE_NOT_FOUND",
      `Current soil sample "${sampleId}" was not found.`,
    );
  }

  // ----------------------------------------------------------
  // Validate current sample coordinates
  // ----------------------------------------------------------

  const currentLatitude = normalizeNumber(
    currentSample.latitude,
  );

  const currentLongitude = normalizeNumber(
    currentSample.longitude,
  );

  if (
    currentLatitude === null ||
    currentLongitude === null
  ) {
    return fail(
      "INVALID_SAMPLE_COORDINATES",
      "Current soil sample does not contain valid coordinates.",
      {
        sampleId,
      },
    );
  }

  // ----------------------------------------------------------
  // Retrieve historical candidate observations
  // ----------------------------------------------------------

  const historicalRows =
    await historicalRepository.getHistoricalSpatialCandidates();

  if (
    !Array.isArray(historicalRows) ||
    historicalRows.length === 0
  ) {
    return {
      success: true,
      phase: API_PHASE,
      currentSample: {
        id: currentSample.id,
        sampleCode: currentSample.sample_code,
        latitude: currentLatitude,
        longitude: currentLongitude,
        depth: {
          fromCm: normalizeNumber(
            currentSample.depth_from_cm,
          ),
          toCm: normalizeNumber(
            currentSample.depth_to_cm,
          ),
        },
      },
      candidates: [],
      metadata: {
        candidateCount: 0,
        totalHistoricalObservations: 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ----------------------------------------------------------
  // Group observations into historical candidate sites
  // ----------------------------------------------------------

  const groups =
    groupHistoricalCandidates(historicalRows);

  // ----------------------------------------------------------
  // Calculate distance and build candidates
  // ----------------------------------------------------------

  const candidates = groups
    .map((group) =>
      buildCandidate(group, currentSample),
    )
    .filter(
      (candidate) =>
        Number.isFinite(candidate.distance.value),
    )
    .sort(
      (a, b) =>
        a.distance.value - b.distance.value,
    );

  const limitedCandidates =
    candidates.slice(0, maxCandidates);

  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  return {
    success: true,
    phase: API_PHASE,

    currentSample: {
      id: currentSample.id,
      sampleCode: currentSample.sample_code,
      latitude: currentLatitude,
      longitude: currentLongitude,

      depth: {
        fromCm: normalizeNumber(
          currentSample.depth_from_cm,
        ),
        toCm: normalizeNumber(
          currentSample.depth_to_cm,
        ),
      },
    },

    candidates: limitedCandidates,

    metadata: {
      candidateCount: limitedCandidates.length,
      totalCandidateSites: candidates.length,
      totalHistoricalObservations:
        historicalRows.length,
      maxCandidates,
      distanceCalculation: "haversine",
      candidateRanking: "nearest_first",
      spatialRelationship:
        "candidate_discovery_only",
      depthCompatibility:
        "normalized_exact_interval_match",
      classificationLocation: "not_applicable",
      calculationLocation: "backend",
      source: "historical_database",
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  API_PHASE,
  DEFAULT_MAX_CANDIDATES,
  MAX_CANDIDATES,

  validateRequest,
  normalizeDepthInterval,
  compareDepthIntervals,
  getCandidateGroupKey,
  groupHistoricalCandidates,
  buildCandidate,

  getHistoricalCandidates,
};