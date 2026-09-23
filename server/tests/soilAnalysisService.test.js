// ============================================================
// server/tests/soilAnalysisService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 4.1 — Soil Analysis Engine Tests
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyPH,
  classifyNitrogen,
  classifyPhosphorus,
  classifyPotassium,
  classifyOrganicCarbon,
  classifyEC,
  assessOverallFertility,
  analyzeSample,
} = require("../services/soilAnalysisService");

// ============================================================
// pH TESTS
// ============================================================

test("pH: values below 6.5 are Acidic", () => {
  assert.equal(classifyPH(6.49), "Acidic");
});

test("pH: 6.5 is Neutral", () => {
  assert.equal(classifyPH(6.5), "Neutral");
});

test("pH: 7.5 is Neutral", () => {
  assert.equal(classifyPH(7.5), "Neutral");
});

test("pH: values above 7.5 are Alkaline", () => {
  assert.equal(classifyPH(7.51), "Alkaline");
});

// ============================================================
// NITROGEN TESTS
// ============================================================

test("Nitrogen: 279 is Low", () => {
  assert.equal(classifyNitrogen(279), "Low");
});

test("Nitrogen: 280 is Medium", () => {
  assert.equal(classifyNitrogen(280), "Medium");
});

test("Nitrogen: 560 is Medium", () => {
  assert.equal(classifyNitrogen(560), "Medium");
});

test("Nitrogen: 561 is High", () => {
  assert.equal(classifyNitrogen(561), "High");
});

// ============================================================
// PHOSPHORUS TESTS
// ============================================================

test("Phosphorus: 9 is Low", () => {
  assert.equal(classifyPhosphorus(9), "Low");
});

test("Phosphorus: 10 is Medium", () => {
  assert.equal(classifyPhosphorus(10), "Medium");
});

test("Phosphorus: 25 is Medium", () => {
  assert.equal(classifyPhosphorus(25), "Medium");
});

test("Phosphorus: values above 25 through 50 are High", () => {
  assert.equal(classifyPhosphorus(25.01), "High");
  assert.equal(classifyPhosphorus(50), "High");
});

test("Phosphorus: values above 50 are Very High", () => {
  assert.equal(classifyPhosphorus(50.01), "Very High");
});

// ============================================================
// POTASSIUM TESTS
// ============================================================

test("Potassium: 119 is Low", () => {
  assert.equal(classifyPotassium(119), "Low");
});

test("Potassium: 120 is Medium", () => {
  assert.equal(classifyPotassium(120), "Medium");
});

test("Potassium: 280 is Medium", () => {
  assert.equal(classifyPotassium(280), "Medium");
});

test("Potassium: values above 280 through 600 are High", () => {
  assert.equal(classifyPotassium(280.01), "High");
  assert.equal(classifyPotassium(600), "High");
});

test("Potassium: values above 600 are Very High", () => {
  assert.equal(classifyPotassium(600.01), "Very High");
});

// ============================================================
// ORGANIC CARBON TESTS
// ============================================================

test("Organic Carbon: 0.49 is Low", () => {
  assert.equal(classifyOrganicCarbon(0.49), "Low");
});

test("Organic Carbon: 0.50 is Medium", () => {
  assert.equal(classifyOrganicCarbon(0.5), "Medium");
});

test("Organic Carbon: 0.75 is Medium", () => {
  assert.equal(classifyOrganicCarbon(0.75), "Medium");
});

test("Organic Carbon: above 0.75 is High", () => {
  assert.equal(classifyOrganicCarbon(0.76), "High");
});

// ============================================================
// EC TESTS
// ============================================================

test("EC: values below 0.40 are Non-saline", () => {
  assert.equal(classifyEC(0.39), "Non-saline");
});

test("EC: 0.40 is Very slightly saline", () => {
  assert.equal(classifyEC(0.4), "Very slightly saline");
});

test("EC: values above 0.40 through below 0.80 are Very slightly saline", () => {
  assert.equal(classifyEC(0.41), "Very slightly saline");
  assert.equal(classifyEC(0.79), "Very slightly saline");
});

test("EC: 0.80 is Moderately saline", () => {
  assert.equal(classifyEC(0.8), "Moderately saline");
});

test("EC: values above 0.80 through below 1.60 are Moderately saline", () => {
  assert.equal(classifyEC(0.81), "Moderately saline");
  assert.equal(classifyEC(1.59), "Moderately saline");
});

test("EC: 1.60 is Strongly saline", () => {
  assert.equal(classifyEC(1.6), "Strongly saline");
});

test("EC: values above 1.60 are Strongly saline", () => {
  assert.equal(classifyEC(1.61), "Strongly saline");
});

// ============================================================
// OVERALL FERTILITY TESTS
// ============================================================

test("Overall fertility: any Low major parameter gives Low", () => {
  assert.equal(
    assessOverallFertility({
      nitrogen: "Low",
      phosphorus: "Medium",
      potassium: "High",
      organicCarbon: "High",
    }),
    "Low",
  );
});

test("Overall fertility: three or more High/Very High parameters gives High", () => {
  assert.equal(
    assessOverallFertility({
      nitrogen: "High",
      phosphorus: "Very High",
      potassium: "High",
      organicCarbon: "Medium",
    }),
    "High",
  );
});

test("Overall fertility: otherwise gives Moderate / Good", () => {
  assert.equal(
    assessOverallFertility({
      nitrogen: "Medium",
      phosphorus: "Medium",
      potassium: "Medium",
      organicCarbon: "Medium",
    }),
    "Moderate / Good",
  );
});

// ============================================================
// COMPLETE SAMPLE ANALYSIS
// ============================================================

test("S-001 expected analysis classifications", () => {
  const sample = {
    sample_code: "S-001",
    ph: 6.8,
    nitrogen: 285,
    phosphorus: 18,
    potassium: 240,
    organic_carbon: 0.72,
    electrical_conductivity: 0.35,
  };

  const result = analyzeSample(sample);

  assert.equal(result.values.pH.classification, "Neutral");
  assert.equal(result.values.nitrogen.classification, "Medium");
  assert.equal(result.values.phosphorus.classification, "Medium");
  assert.equal(result.values.potassium.classification, "Medium");
  assert.equal(result.values.organicCarbon.classification, "Medium");
  assert.equal(
    result.values.electricalConductivity.classification,
    "Non-saline",
  );

  assert.equal(result.overallFertility, "Moderate / Good");
});

// ============================================================
// INVALID INPUT TESTS
// ============================================================

test("Missing pH is accepted and classified as unavailable", () => {
  const result = analyzeSample({
    id: 1,
    sample_code: "S-001",
    latitude: 17.71234,
    longitude: 83.30125,
    depth_from_cm: 0,
    depth_to_cm: 15,
    sample_date: "2026-09-01",

    ph: null,
    nitrogen: 285,
    phosphorus: 18,
    potassium: 240,
    organic_carbon: 0.72,
    electrical_conductivity: 0.35,
    soil_texture: "Loamy",
  });

  assert.ok(result);
  assert.ok(result.values);
  assert.ok(result.values.pH);

  assert.equal(result.values.pH.value, null);
  assert.equal(result.values.pH.classification, null);

  // Other laboratory values should still be analysed normally.
  assert.equal(result.values.nitrogen.classification, "Medium");
  assert.equal(result.values.phosphorus.classification, "Medium");
  assert.equal(result.values.potassium.classification, "Medium");
  assert.equal(result.values.organicCarbon.classification, "Medium");
  assert.equal(
    result.values.electricalConductivity.classification,
    "Non-saline",
  );
});

test("Non-numeric nitrogen is rejected", () => {
  assert.throws(
    () => classifyNitrogen("abc"),
    /nitrogen must be a finite number/,
  );
});

test("Null phosphorus is rejected", () => {
  assert.throws(() => classifyPhosphorus(null), /phosphorus is required/);
});

test("Undefined potassium is rejected", () => {
  assert.throws(() => classifyPotassium(undefined), /potassium is required/);
});
