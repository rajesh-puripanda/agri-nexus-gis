// ============================================================
// server/tests/reports/soilAnalysisReportService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 6.3 â€” Complete Soil Analysis Report Service Tests
//
// Tests the complete report orchestration:
//
//   soilAnalysisService
//   soilRecommendationService
//   cropSuitabilityService
//   soilManagementService
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ============================================================
// SERVICE
// ============================================================

const soilAnalysisReportService =
  require("../../services/reports/soilAnalysisReportService");

// ============================================================
// TEST SAMPLE
// ============================================================
//
// Deliberately uses realistic values and the same field names
// used by the soil repository/database layer.
//

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

    nitrogen: 250,

    phosphorus: 25,

    potassium: 180,

    organic_carbon: 0.65,

    electrical_conductivity: 0.8,

    soil_texture: "Loamy",

    ...overrides,
  };
}

// ============================================================
// TEST HEADER
// ============================================================

console.log("");
console.log("========================================");
console.log(" SOIL ANALYSIS REPORT SERVICE TESTS");
console.log("========================================");
console.log("");

// ============================================================
// SERVICE LOADING
// ============================================================

test("Soil analysis report service can be loaded", () => {
  assert.equal(
    typeof soilAnalysisReportService.buildSoilAnalysisReport,
    "function",
  );
});

// ============================================================
// COMPLETE REPORT
// ============================================================

test("Complete soil analysis report is generated for valid sample", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report);
  assert.equal(typeof report, "object");

  assert.ok(report.sample);
  assert.ok(report.laboratoryResults);
  assert.ok(report.analysis);
  assert.ok(report.interpretation);
  assert.ok(report.cropSuitability);
  assert.ok(report.managementPlan);
  assert.ok(report.reportMetadata);
});

// ============================================================
// SAMPLE INFORMATION
// ============================================================

test("Report contains correct sample information", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.equal(report.sample.id, sample.id);
  assert.equal(report.sample.sample_code, sample.sample_code);
  assert.equal(report.sample.sample_date, sample.sample_date);
  assert.equal(report.sample.soil_texture, sample.soil_texture);
});

// ============================================================
// LOCATION
// ============================================================

test("Report contains sample location", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.sample.location);

  assert.equal(report.sample.location.latitude, Number(sample.latitude));

  assert.equal(report.sample.location.longitude, Number(sample.longitude));
});

// ============================================================
// SAMPLING DEPTH
// ============================================================

test("Report contains sampling depth", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.sample.depth);

  assert.equal(report.sample.depth.from_cm, Number(sample.depth_from_cm));

  assert.equal(report.sample.depth.to_cm, Number(sample.depth_to_cm));
});

// ============================================================
// LABORATORY RESULTS
// ============================================================

test("Report contains laboratory results", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  const laboratoryResults = report.laboratoryResults;

  assert.equal(laboratoryResults.ph, Number(sample.ph));
  assert.equal(laboratoryResults.nitrogen, Number(sample.nitrogen));
  assert.equal(laboratoryResults.phosphorus, Number(sample.phosphorus));
  assert.equal(laboratoryResults.potassium, Number(sample.potassium));
  assert.equal(laboratoryResults.organicCarbon, Number(sample.organic_carbon));
  assert.equal(
    laboratoryResults.electricalConductivity,
    Number(sample.electrical_conductivity),
  );
});

// ============================================================
// ANALYSIS
// ============================================================

test("Report contains laboratory analysis classification", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.analysis);
  assert.equal(typeof report.analysis, "object");

  assert.ok(report.analysis.values);
});

// ============================================================
// INTERPRETATION
// ============================================================

test("Report contains soil interpretation", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.interpretation);
  assert.equal(typeof report.interpretation, "object");

  assert.ok(
    Object.prototype.hasOwnProperty.call(
      report.interpretation,
      "overallFertility",
    ),
  );
});

// ============================================================
// CROP SUITABILITY
// ============================================================

test("Report contains crop suitability results", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.cropSuitability);
  assert.equal(typeof report.cropSuitability, "object");

  assert.ok(Array.isArray(report.cropSuitability.crops));
});

// ============================================================
// CROP SUITABILITY SCORING
// ============================================================

test("Crop suitability contains scoring information", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.cropSuitability.scoring);

  assert.equal(typeof report.cropSuitability.scoring, "object");

  assert.ok(report.cropSuitability.scoring.weights);
});

// ============================================================
// MANAGEMENT PLAN
// ============================================================

test("Report contains soil management plan", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  const managementPlan = report.managementPlan;

  assert.ok(managementPlan);
  assert.equal(typeof managementPlan, "object");

  assert.ok(
    Object.prototype.hasOwnProperty.call(managementPlan, "overallFertility"),
  );

  assert.ok(Array.isArray(managementPlan.nutrientManagement));

  assert.ok(Array.isArray(managementPlan.organicMatterManagement));

  assert.ok(Array.isArray(managementPlan.soilReactionManagement));

  assert.ok(Array.isArray(managementPlan.salinityManagement));

  assert.ok(Array.isArray(managementPlan.overallManagement));

  assert.ok(Array.isArray(managementPlan.generalManagement));
});

// ============================================================
// REPORT METADATA
// ============================================================

test("Report contains report metadata", () => {
  const sample = createTestSample();

  const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.ok(report.reportMetadata);

  assert.equal(typeof report.reportMetadata.generatedAt, "string");

  assert.equal(report.reportMetadata.version, "1.0");

  assert.ok(!Number.isNaN(Date.parse(report.reportMetadata.generatedAt)));
});

// ============================================================
// MISSING SAMPLE
// ============================================================

test("Missing soil sample is rejected", () => {
  assert.throws(
    () => {
      soilAnalysisReportService.buildSoilAnalysisReport();
    },
    {
      message: "Soil sample is required",
    },
  );
});

// ============================================================
// NULL SAMPLE
// ============================================================

test("Null soil sample is rejected", () => {
  assert.throws(
    () => {
      soilAnalysisReportService.buildSoilAnalysisReport(null);
    },
    {
      message: "Soil sample is required",
    },
  );
});

// ============================================================
// EMPTY SAMPLE
// ============================================================

test("Empty soil sample object is rejected", () => {
  assert.throws(
    () => {
      soilAnalysisReportService.buildSoilAnalysisReport({});
    },
    {
      message: /required|analysis|sample/i,
    },
  );
});

// ============================================================
// NULL LABORATORY VALUES
// ============================================================

test("Incomplete laboratory values are accepted by the report service", () => {
  const incompleteSample = {
    id: 999,
    sample_code: "TEST-INCOMPLETE",
    latitude: 17.71234,
    longitude: 83.30125,
    depth_from_cm: 0,
    depth_to_cm: 15,
    sample_date: "2026-09-01",

    // Missing laboratory values are intentionally allowed.
    ph: null,
    nitrogen: 220,
    phosphorus: 18,
    potassium: 250,
    organic_carbon: 0.58,
    electrical_conductivity: null,
    soil_texture: null,
  };

  const report =
    soilAnalysisReportService.buildSoilAnalysisReport(incompleteSample);

  // A complete report should still be generated.
  assert.ok(report);
  assert.ok(report.analysis);
  assert.ok(report.interpretation);
  assert.ok(report.cropSuitability);
  assert.ok(report.managementPlan);

  // Missing laboratory values remain explicitly unavailable.
  assert.equal(report.laboratoryResults.ph, null);
  assert.equal(report.laboratoryResults.electricalConductivity, null);

  // The analysis should preserve the missing values.
  assert.equal(report.analysis.values.pH.classification, null);

  assert.equal(
    report.analysis.values.electricalConductivity.classification,
    null,
  );

  // Interpretation should explicitly indicate unavailable data.
  assert.match(
    report.interpretation.soilReaction.interpretation,
    /pH.*not.*provided/i,
  );

  assert.match(
    report.interpretation.salinity.interpretation,
    /EC.*not.*provided/i,
  );

  // Crop suitability should still be calculated.
  assert.ok(report.cropSuitability.scoring);
  assert.ok(report.cropSuitability.scoring.dataCompleteness);
  assert.ok(report.cropSuitability.scoring.assessmentConfidence);
});

// ============================================================
// DETERMINISTIC BUSINESS RESULTS
// ============================================================

test("Repeated report generation produces the same business results", () => {
  const sample = createTestSample();

  const report1 = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  const report2 = soilAnalysisReportService.buildSoilAnalysisReport(sample);

  assert.deepEqual(report1.sample, report2.sample);

  assert.deepEqual(report1.laboratoryResults, report2.laboratoryResults);

  assert.deepEqual(report1.analysis, report2.analysis);

  assert.deepEqual(report1.interpretation, report2.interpretation);

  assert.deepEqual(report1.cropSuitability, report2.cropSuitability);

  assert.deepEqual(report1.managementPlan, report2.managementPlan);
});
