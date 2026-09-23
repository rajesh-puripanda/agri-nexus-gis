"use strict";

const assert = require("node:assert/strict");
const { test, after } = require("node:test");

const { pool } = require("../config/db");
const soilRepository = require("../repositories/soilRepository");
const historicalRepository = require("../repositories/historicalRepository");
const historicalCandidateService = require(
  "../services/historicalCandidateService",
);

// ============================================================
// TEST HELPERS
// ============================================================

function createCurrentSample(overrides = {}) {
  return {
    id: 1,
    sample_code: "S-001",
    latitude: 17.71234,
    longitude: 83.30125,
    depth_from_cm: 0,
    depth_to_cm: 15,
    ...overrides,
  };
}

function createHistoricalRow(overrides = {}) {
  return {
    id: 101,
    dataset_id: 2,
    dataset_code: "H2",
    dataset_name: "Historical H2",
    publication_year: 2018,
    dataset_status: "active",
    sample_code: "H2-PAD-01-B",
    mandal: "Paderu",
    village: "Village A",
    site_no: 1,
    latitude: 18.0749,
    longitude: 82.668,
    stage: "Before sowing",
    collection_period_start: "2018-05-07",
    collection_period_end: "2018-05-13",
    depth_from_cm: 0,
    depth_to_cm: 15,
    source_status: "verified",
    exclusion_reason: null,
    ...overrides,
  };
}

// ============================================================
// VALIDATE REQUEST
// ============================================================

test("validateRequest accepts a valid request", () => {
  const result = historicalCandidateService.validateRequest({
    sampleId: 1,
    maxCandidates: 10,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.normalized.sampleId, 1);
  assert.equal(result.normalized.maxCandidates, 10);
});

test("validateRequest applies the default maxCandidates", () => {
  const result = historicalCandidateService.validateRequest({
    sampleId: 1,
  });

  assert.equal(result.valid, true);
  assert.equal(
    result.normalized.maxCandidates,
    historicalCandidateService.DEFAULT_MAX_CANDIDATES,
  );
});

test("validateRequest rejects a missing sampleId", () => {
  const result = historicalCandidateService.validateRequest({});

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("sampleId must be a positive integer."),
  );
});

test("validateRequest rejects an invalid maxCandidates", () => {
  const result = historicalCandidateService.validateRequest({
    sampleId: 1,
    maxCandidates: 0,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("maxCandidates must be a positive integer."),
  );
});

test("validateRequest rejects maxCandidates above the service limit", () => {
  const result = historicalCandidateService.validateRequest({
    sampleId: 1,
    maxCandidates: historicalCandidateService.MAX_CANDIDATES + 1,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      `maxCandidates cannot exceed ${historicalCandidateService.MAX_CANDIDATES}.`,
    ),
  );
});

// ============================================================
// DEPTH NORMALIZATION
// ============================================================

test("normalizeDepthInterval normalizes H1 negative depth representation", () => {
  const result = historicalCandidateService.normalizeDepthInterval(0, -30);

  assert.deepEqual(result, {
    fromCm: 0,
    toCm: 30,
    valid: true,
  });
});

test("normalizeDepthInterval preserves normal 0-15 depth", () => {
  const result = historicalCandidateService.normalizeDepthInterval(0, 15);

  assert.deepEqual(result, {
    fromCm: 0,
    toCm: 15,
    valid: true,
  });
});

test("normalizeDepthInterval rejects missing depth information", () => {
  const result = historicalCandidateService.normalizeDepthInterval(0, null);

  assert.equal(result.valid, false);
  assert.equal(result.fromCm, 0);
  assert.equal(result.toCm, null);
});

// ============================================================
// DEPTH COMPATIBILITY
// ============================================================

test("compareDepthIntervals marks identical 0-15 depths compatible", () => {
  const result = historicalCandidateService.compareDepthIntervals(
    { fromCm: 0, toCm: 15 },
    { fromCm: 0, toCm: 15 },
  );

  assert.equal(result.compatible, true);
  assert.equal(result.reason, null);
});

test("compareDepthIntervals marks current 0-15 vs H1 0-30 incompatible", () => {
  const result = historicalCandidateService.compareDepthIntervals(
    { fromCm: 0, toCm: 15 },
    { fromCm: 0, toCm: -30 },
  );

  assert.equal(result.compatible, false);
  assert.equal(result.reason, "Sampling depths are incompatible.");

  assert.deepEqual(result.current, {
    fromCm: 0,
    toCm: 15,
    valid: true,
  });

  assert.deepEqual(result.historical, {
    fromCm: 0,
    toCm: 30,
    valid: true,
  });
});

test("compareDepthIntervals marks missing depth as incompatible", () => {
  const result = historicalCandidateService.compareDepthIntervals(
    { fromCm: 0, toCm: 15 },
    { fromCm: null, toCm: null },
  );

  assert.equal(result.compatible, false);
  assert.equal(
    result.reason,
    "Sampling depth information is unavailable.",
  );
});

// ============================================================
// CANDIDATE GROUPING
// ============================================================

test("getCandidateGroupKey groups H2 by dataset, mandal and site number", () => {
  const key = historicalCandidateService.getCandidateGroupKey(
    createHistoricalRow({
      dataset_code: "H2",
      mandal: "Paderu",
      site_no: 1,
      sample_code: "H2-PAD-01-B",
    }),
  );

  assert.equal(key, "H2|paderu|site:1");
});

test("getCandidateGroupKey uses sample_code fallback for H1 records", () => {
  const key = historicalCandidateService.getCandidateGroupKey(
    createHistoricalRow({
      dataset_code: "H1",
      mandal: "Paderu",
      site_no: null,
      sample_code: "H1-PAD-001",
    }),
  );

  assert.equal(key, "H1|paderu|sample:H1-PAD-001");
});

test("groupHistoricalCandidates keeps H2 three-stage observations together", () => {
  const rows = [
    createHistoricalRow({
      id: 101,
      sample_code: "H2-PAD-01-B",
      stage: "Before sowing",
      collection_period_start: "2018-05-07",
    }),
    createHistoricalRow({
      id: 102,
      sample_code: "H2-PAD-01-D",
      stage: "During growth",
      collection_period_start: "2018-08-11",
    }),
    createHistoricalRow({
      id: 103,
      sample_code: "H2-PAD-01-A",
      stage: "After harvesting",
      collection_period_start: "2018-11-06",
    }),
  ];

  const groups = historicalCandidateService.groupHistoricalCandidates(rows);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].observations.length, 3);
  assert.equal(groups[0].site.siteNo, 1);
});

test("groupHistoricalCandidates does not collapse H1 records without site numbers", () => {
  const rows = [
    createHistoricalRow({
      id: 201,
      dataset_code: "H1",
      site_no: null,
      sample_code: "H1-PAD-001",
    }),
    createHistoricalRow({
      id: 202,
      dataset_code: "H1",
      site_no: null,
      sample_code: "H1-PAD-002",
    }),
  ];

  const groups = historicalCandidateService.groupHistoricalCandidates(rows);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].observations.length, 1);
  assert.equal(groups[1].observations.length, 1);
});

// ============================================================
// BUILD CANDIDATE
// ============================================================

test("buildCandidate marks H2 0-15 candidate comparison eligible", () => {
  const group = {
    key: "H2|paderu|site:1",
    dataset: {
      id: 2,
      code: "H2",
      name: "Historical H2",
      publicationYear: 2018,
      status: "active",
    },
    site: {
      mandal: "Paderu",
      village: "Village A",
      siteNo: 1,
      latitude: 18.0749,
      longitude: 82.668,
    },
    observations: [
      {
        sampleId: 101,
        sampleCode: "H2-PAD-01-B",
        stage: "Before sowing",
        collectionPeriod: {
          start: "2018-05-07",
          end: "2018-05-13",
        },
        depth: { fromCm: 0, toCm: 15 },
        sourceStatus: "verified",
        exclusionReason: null,
      },
      {
        sampleId: 102,
        sampleCode: "H2-PAD-01-D",
        stage: "During growth",
        collectionPeriod: {
          start: "2018-08-11",
          end: "2018-08-16",
        },
        depth: { fromCm: 0, toCm: 15 },
        sourceStatus: "verified",
        exclusionReason: null,
      },
      {
        sampleId: 103,
        sampleCode: "H2-PAD-01-A",
        stage: "After harvesting",
        collectionPeriod: {
          start: "2018-11-06",
          end: "2018-11-11",
        },
        depth: { fromCm: 0, toCm: 15 },
        sourceStatus: "verified",
        exclusionReason: null,
      },
    ],
  };

  const candidate = historicalCandidateService.buildCandidate(
    group,
    createCurrentSample(),
  );

  assert.equal(candidate.dataset.code, "H2");
  assert.equal(candidate.site.siteNo, 1);
  assert.equal(candidate.observations.length, 3);
  assert.equal(candidate.stages.count, 3);
  assert.deepEqual(candidate.stages.values, [
    "Before sowing",
    "During growth",
    "After harvesting",
  ]);
  assert.equal(candidate.depth.compatible, true);
  assert.equal(candidate.comparison.supported, true);
  assert.equal(candidate.comparison.eligible, true);
  assert.equal(
    candidate.metadata.spatialRelationship,
    "spatial_candidate_only",
  );
});

test("buildCandidate marks H1 0-30 candidate as depth incompatible", () => {
  const group = {
    key: "H1|paderu|sample:H1-PAD-001",
    dataset: {
      id: 1,
      code: "H1",
      name: "Historical H1",
      publicationYear: 2017,
      status: "active",
    },
    site: {
      mandal: "Paderu",
      village: "Village A",
      siteNo: null,
      latitude: 18.0749,
      longitude: 82.668,
    },
    observations: [
      {
        sampleId: 201,
        sampleCode: "H1-PAD-001",
        stage: null,
        collectionPeriod: { start: null, end: null },
        depth: { fromCm: 0, toCm: -30 },
        sourceStatus: "verified",
        exclusionReason: null,
      },
    ],
  };

  const candidate = historicalCandidateService.buildCandidate(
    group,
    createCurrentSample(),
  );

  assert.equal(candidate.depth.compatible, false);
  assert.equal(candidate.comparison.supported, false);
  assert.equal(candidate.comparison.eligible, false);
  assert.equal(
    candidate.comparison.reason,
    "Historical site number is unavailable for comparison.",
  );
});

// ============================================================
// MAIN SERVICE — VALIDATION
// ============================================================

test("getHistoricalCandidates returns INVALID_REQUEST for invalid request", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({});

  assert.equal(result.success, false);
  assert.equal(result.phase, "10.4");
  assert.equal(result.code, "INVALID_REQUEST");
});

test("getHistoricalCandidates returns SAMPLE_NOT_FOUND for unknown sample", async () => {
  const original = soilRepository.getSoilSampleById;
  soilRepository.getSoilSampleById = async () => null;

  try {
    const result = await historicalCandidateService.getHistoricalCandidates({
      sampleId: 999999,
    });

    assert.equal(result.success, false);
    assert.equal(result.code, "SAMPLE_NOT_FOUND");
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

test("getHistoricalCandidates returns INVALID_SAMPLE_COORDINATES for invalid coordinates", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () =>
    createCurrentSample({
      latitude: null,
      longitude: null,
    });

  try {
    const result = await historicalCandidateService.getHistoricalCandidates({
      sampleId: 1,
    });

    assert.equal(result.success, false);
    assert.equal(result.code, "INVALID_SAMPLE_COORDINATES");
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// MAIN SERVICE — EMPTY RESULT
// ============================================================

test("getHistoricalCandidates returns an empty successful result when no historical rows exist", async () => {
  const originalSample = soilRepository.getSoilSampleById;
  const originalHistorical =
    historicalRepository.getHistoricalSpatialCandidates;

  soilRepository.getSoilSampleById = async () => createCurrentSample();
  historicalRepository.getHistoricalSpatialCandidates = async () => [];

  try {
    const result = await historicalCandidateService.getHistoricalCandidates({
      sampleId: 1,
    });

    assert.equal(result.success, true);
    assert.equal(result.phase, "10.4");
    assert.deepEqual(result.candidates, []);
    assert.equal(result.metadata.candidateCount, 0);
    assert.equal(result.metadata.totalHistoricalObservations, 0);
  } finally {
    soilRepository.getSoilSampleById = originalSample;
    historicalRepository.getHistoricalSpatialCandidates =
      originalHistorical;
  }
});

// ============================================================
// MAIN SERVICE — REAL REPOSITORY PATH
// ============================================================

test("getHistoricalCandidates returns ranked candidates for current sample", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({
    sampleId: 1,
    maxCandidates: 5,
  });

  assert.equal(result.success, true);
  assert.equal(result.phase, "10.4");
  assert.equal(result.currentSample.id, 1);
  assert.equal(result.currentSample.sampleCode, "S-001");
  assert.ok(result.candidates.length <= 5);

  for (let i = 1; i < result.candidates.length; i += 1) {
    assert.ok(
      result.candidates[i - 1].distance.value <=
        result.candidates[i].distance.value,
    );
  }
});

test("getHistoricalCandidates excludes H2 Anakapalle Site 3", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({
    sampleId: 1,
    maxCandidates: 50,
  });

  assert.equal(result.success, true);

  const excludedCandidate = result.candidates.find(
    (candidate) =>
      candidate.dataset.code === "H2" &&
      candidate.site.mandal === "Anakapalle" &&
      candidate.site.siteNo === 3,
  );

  assert.equal(excludedCandidate, undefined);
});

test("getHistoricalCandidates returns three observations for each returned H2 site", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({
    sampleId: 1,
    maxCandidates: 50,
  });

  assert.equal(result.success, true);

  const h2Candidates = result.candidates.filter(
    (candidate) => candidate.dataset.code === "H2",
  );

  assert.ok(h2Candidates.length > 0);

  for (const candidate of h2Candidates) {
    assert.equal(candidate.observations.length, 3);
    assert.equal(candidate.stages.count, 3);
    assert.deepEqual(candidate.stages.values, [
      "Before sowing",
      "During growth",
      "After harvesting",
    ]);
  }
});

test("getHistoricalCandidates identifies H2 0-15 candidates as comparison eligible", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({
    sampleId: 1,
    maxCandidates: 50,
  });

  assert.equal(result.success, true);

  const h2Candidates = result.candidates.filter(
    (candidate) => candidate.dataset.code === "H2",
  );

  assert.ok(h2Candidates.length > 0);

  for (const candidate of h2Candidates) {
    assert.equal(candidate.depth.compatible, true);
    assert.equal(candidate.comparison.supported, true);
    assert.equal(candidate.comparison.eligible, true);
  }
});

test("getHistoricalCandidates identifies H1 0-30 candidates as depth incompatible", async () => {
  const result = await historicalCandidateService.getHistoricalCandidates({
    sampleId: 1,
    maxCandidates: 50,
  });

  assert.equal(result.success, true);

  const h1Candidates = result.candidates.filter(
    (candidate) => candidate.dataset.code === "H1",
  );

  assert.ok(h1Candidates.length > 0);

  for (const candidate of h1Candidates) {
    assert.equal(candidate.depth.compatible, false);
    assert.equal(candidate.comparison.eligible, false);
  }
});

// ============================================================
// TEST CLEANUP
// ============================================================

after(async () => {
  await pool.end();
});
