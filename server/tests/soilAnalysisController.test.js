// ============================================================
// server/tests/soilAnalysisController.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 6.4 — Soil Analysis Controller Tests
//
// Tests the controller/API orchestration layer.
//
// Responsibilities tested:
//
//   - Sample ID validation
//   - Soil sample retrieval
//   - Soil analysis delegation
//   - Recommendation delegation
//   - Complete report delegation
//   - HTTP status handling
//   - Response structure
//
// Business rules remain in the service layer.
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ============================================================
// CONTROLLER
// ============================================================

const soilAnalysisController = require("../controllers/soilAnalysisController");

// ============================================================
// REPOSITORY
// ============================================================

const soilRepository = require("../repositories/soilRepository");

// ============================================================
// TEST SAMPLE
// ============================================================

function createTestSample(overrides = {}) {
  return {
    id: 1,

    sample_code: "S-TEST-001",

    latitude: 17.71234,

    longitude: 83.30125,

    depth_from_cm: 0,

    depth_to_cm: 15,

    sample_date: "2026-09-01",

    ph: 6.8,

    nitrogen: 285,

    phosphorus: 18,

    potassium: 240,

    organic_carbon: 0.72,

    electrical_conductivity: 0.35,

    soil_texture: "Loamy",

    ...overrides,
  };
}

// ============================================================
// MOCK RESPONSE
// ============================================================

function createMockResponse() {
  return {
    statusCode: 200,

    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// ============================================================
// MOCK REQUEST
// ============================================================

function createMockRequest(id) {
  return {
    params: {
      id,
    },
  };
}

// ============================================================
// TEST HEADER
// ============================================================

console.log("");
console.log("========================================");
console.log(" SOIL ANALYSIS CONTROLLER TESTS");
console.log("========================================");
console.log("");

// ============================================================
// CONTROLLER LOADING
// ============================================================

test("Soil analysis controller can be loaded", () => {
  assert.equal(
    typeof soilAnalysisController.getSoilAnalysisBySampleId,
    "function",
  );

  assert.equal(
    typeof soilAnalysisController.getSoilRecommendationsBySampleId,
    "function",
  );

  assert.equal(
    typeof soilAnalysisController.getSoilAnalysisReportBySampleId,
    "function",
  );
});

// ============================================================
// SAMPLE RESPONSE BUILDER
// ============================================================

test("buildSampleResponse returns expected sample fields", () => {
  const sample = createTestSample();

  const result = soilAnalysisController.buildSampleResponse(sample);

  assert.equal(result.id, sample.id);
  assert.equal(result.sample_code, sample.sample_code);
  assert.equal(result.latitude, sample.latitude);
  assert.equal(result.longitude, sample.longitude);
  assert.equal(result.depth_from_cm, sample.depth_from_cm);
  assert.equal(result.depth_to_cm, sample.depth_to_cm);
  assert.equal(result.sample_date, sample.sample_date);
  assert.equal(result.soil_texture, sample.soil_texture);
});

// ============================================================
// SAMPLE RESPONSE DOES NOT EXPOSE LAB VALUES
// ============================================================

test("buildSampleResponse contains sample information only", () => {
  const sample = createTestSample();

  const result = soilAnalysisController.buildSampleResponse(sample);

  assert.equal(Object.prototype.hasOwnProperty.call(result, "ph"), false);

  assert.equal(Object.prototype.hasOwnProperty.call(result, "nitrogen"), false);

  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "phosphorus"),
    false,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "potassium"),
    false,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "organic_carbon"),
    false,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "electrical_conductivity"),
    false,
  );
});

// ============================================================
// ANALYSIS COMPONENT BUILDER
// ============================================================

test("buildAnalysisComponents returns all analysis components", () => {
  const sample = createTestSample();

  const result = soilAnalysisController.buildAnalysisComponents(sample);

  assert.ok(result);

  assert.ok(result.analysis);

  assert.ok(result.recommendations);

  assert.ok(result.cropSuitability);

  assert.ok(result.managementPlan);
});

// ============================================================
// GET SOIL ANALYSIS
// ============================================================

test("GET soil analysis returns 200 for valid sample", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => createTestSample();

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisBySampleId(req, res);

    assert.equal(res.statusCode, 200);

    assert.ok(res.body);

    assert.equal(res.body.success, true);

    assert.ok(res.body.data);

    assert.ok(res.body.data.sample);

    assert.ok(res.body.data.analysis);
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// GET SOIL ANALYSIS — INVALID ID
// ============================================================

test("GET soil analysis rejects invalid sample ID", async () => {
  const req = createMockRequest("abc");
  const res = createMockResponse();

  await soilAnalysisController.getSoilAnalysisBySampleId(req, res);

  assert.equal(res.statusCode, 400);

  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid soil sample ID",
  });
});

// ============================================================
// GET SOIL ANALYSIS — ZERO ID
// ============================================================

test("GET soil analysis rejects zero sample ID", async () => {
  const req = createMockRequest("0");
  const res = createMockResponse();

  await soilAnalysisController.getSoilAnalysisBySampleId(req, res);

  assert.equal(res.statusCode, 400);

  assert.equal(res.body.success, false);

  assert.equal(res.body.message, "Invalid soil sample ID");
});

// ============================================================
// GET SOIL ANALYSIS — NEGATIVE ID
// ============================================================

test("GET soil analysis rejects negative sample ID", async () => {
  const req = createMockRequest("-1");
  const res = createMockResponse();

  await soilAnalysisController.getSoilAnalysisBySampleId(req, res);

  assert.equal(res.statusCode, 400);

  assert.equal(res.body.success, false);

  assert.equal(res.body.message, "Invalid soil sample ID");
});

// ============================================================
// GET SOIL ANALYSIS — NOT FOUND
// ============================================================

test("GET soil analysis returns 404 when sample does not exist", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => null;

  try {
    const req = createMockRequest("999");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisBySampleId(req, res);

    assert.equal(res.statusCode, 404);

    assert.deepEqual(res.body, {
      success: false,
      message: "Soil sample not found",
    });
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// GET RECOMMENDATIONS
// ============================================================

test("GET soil recommendations returns complete recommendation data", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => createTestSample();

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilRecommendationsBySampleId(req, res);

    assert.equal(res.statusCode, 200);

    assert.equal(res.body.success, true);

    assert.ok(res.body.data);

    assert.ok(res.body.data.sample);

    assert.ok(res.body.data.analysis);

    assert.ok(res.body.data.recommendations);

    assert.ok(res.body.data.cropSuitability);

    assert.ok(res.body.data.managementPlan);
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// RECOMMENDATIONS — INVALID ID
// ============================================================

test("GET soil recommendations rejects invalid sample ID", async () => {
  const req = createMockRequest("invalid");
  const res = createMockResponse();

  await soilAnalysisController.getSoilRecommendationsBySampleId(req, res);

  assert.equal(res.statusCode, 400);

  assert.equal(res.body.success, false);

  assert.equal(res.body.message, "Invalid soil sample ID");
});

// ============================================================
// RECOMMENDATIONS — NOT FOUND
// ============================================================

test("GET soil recommendations returns 404 when sample does not exist", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => null;

  try {
    const req = createMockRequest("999");
    const res = createMockResponse();

    await soilAnalysisController.getSoilRecommendationsBySampleId(req, res);

    assert.equal(res.statusCode, 404);

    assert.equal(res.body.success, false);

    assert.equal(res.body.message, "Soil sample not found");
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// COMPLETE REPORT
// ============================================================

test("GET soil analysis report returns complete report", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => createTestSample();

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

    assert.equal(res.statusCode, 200);

    assert.equal(res.body.success, true);

    assert.ok(res.body.data);

    assert.ok(res.body.data.sample);

    assert.ok(res.body.data.laboratoryResults);

    assert.ok(res.body.data.analysis);

    assert.ok(res.body.data.interpretation);

    assert.ok(res.body.data.cropSuitability);

    assert.ok(res.body.data.managementPlan);

    assert.ok(res.body.data.reportMetadata);
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// COMPLETE REPORT — INVALID ID
// ============================================================

test("GET soil analysis report rejects invalid sample ID", async () => {
  const req = createMockRequest("abc");
  const res = createMockResponse();

  await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

  assert.equal(res.statusCode, 400);

  assert.equal(res.body.success, false);

  assert.equal(res.body.message, "Invalid soil sample ID");
});

// ============================================================
// COMPLETE REPORT — NOT FOUND
// ============================================================

test("GET soil analysis report returns 404 when sample does not exist", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => null;

  try {
    const req = createMockRequest("999");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

    assert.equal(res.statusCode, 404);

    assert.equal(res.body.success, false);

    assert.equal(res.body.message, "Soil sample not found");
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// REPORT SAMPLE INFORMATION
// ============================================================

test("GET soil analysis report preserves sample identity and location", async () => {
  const original = soilRepository.getSoilSampleById;

  const sample = createTestSample();

  soilRepository.getSoilSampleById = async () => sample;

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

    const reportSample = res.body.data.sample;

    assert.equal(reportSample.id, sample.id);

    assert.equal(reportSample.sample_code, sample.sample_code);

    assert.equal(reportSample.location.latitude, Number(sample.latitude));

    assert.equal(reportSample.location.longitude, Number(sample.longitude));

    assert.equal(reportSample.depth.from_cm, Number(sample.depth_from_cm));

    assert.equal(reportSample.depth.to_cm, Number(sample.depth_to_cm));
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// REPORT LABORATORY RESULTS
// ============================================================

test("GET soil analysis report returns laboratory results", async () => {
  const original = soilRepository.getSoilSampleById;

  const sample = createTestSample();

  soilRepository.getSoilSampleById = async () => sample;

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

    const results = res.body.data.laboratoryResults;

    assert.equal(results.ph, 6.8);

    assert.equal(results.nitrogen, 285);

    assert.equal(results.phosphorus, 18);

    assert.equal(results.potassium, 240);

    assert.equal(results.organicCarbon, 0.72);

    assert.equal(results.electricalConductivity, 0.35);
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// REPORT METADATA
// ============================================================

test("GET soil analysis report contains report metadata", async () => {
  const original = soilRepository.getSoilSampleById;

  soilRepository.getSoilSampleById = async () => createTestSample();

  try {
    const req = createMockRequest("1");
    const res = createMockResponse();

    await soilAnalysisController.getSoilAnalysisReportBySampleId(req, res);

    const metadata = res.body.data.reportMetadata;

    assert.ok(metadata);

    assert.equal(metadata.version, "1.0");

    assert.equal(typeof metadata.generatedAt, "string");

    assert.ok(!Number.isNaN(Date.parse(metadata.generatedAt)));
  } finally {
    soilRepository.getSoilSampleById = original;
  }
});

// ============================================================
// TEST COMPLETE
// ============================================================

console.log("");
