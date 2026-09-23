"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const soil = require("../../scientific/classification/soilClassification");

// ============================================================
// Classification boundaries
// ============================================================

test("pH boundaries", () => {
  assert.equal(soil.classifyPH(6.4), "Acidic");
  assert.equal(soil.classifyPH(6.5), "Neutral");
  assert.equal(soil.classifyPH(7.5), "Neutral");
  assert.equal(soil.classifyPH(7.6), "Alkaline");
});

test("Nitrogen boundaries", () => {
  assert.equal(soil.classifyNitrogen(279), "Low");
  assert.equal(soil.classifyNitrogen(280), "Medium");
  assert.equal(soil.classifyNitrogen(560), "Medium");
  assert.equal(soil.classifyNitrogen(561), "High");
});

test("Phosphorus boundaries", () => {
  assert.equal(soil.classifyPhosphorus(9), "Low");
  assert.equal(soil.classifyPhosphorus(10), "Medium");
  assert.equal(soil.classifyPhosphorus(25), "Medium");
  assert.equal(soil.classifyPhosphorus(26), "High");
  assert.equal(soil.classifyPhosphorus(50), "High");
  assert.equal(soil.classifyPhosphorus(51), "Very High");
});

test("Potassium boundaries", () => {
  assert.equal(soil.classifyPotassium(119), "Low");
  assert.equal(soil.classifyPotassium(120), "Medium");
  assert.equal(soil.classifyPotassium(280), "Medium");
  assert.equal(soil.classifyPotassium(281), "High");
  assert.equal(soil.classifyPotassium(600), "High");
  assert.equal(soil.classifyPotassium(601), "Very High");
});

test("Organic Carbon boundaries", () => {
  assert.equal(soil.classifyOrganicCarbon(0.49), "Low");
  assert.equal(soil.classifyOrganicCarbon(0.5), "Medium");
  assert.equal(soil.classifyOrganicCarbon(0.75), "Medium");
  assert.equal(soil.classifyOrganicCarbon(0.76), "High");
});

test("EC boundaries", () => {
  assert.equal(soil.classifyEC(0.39), "Non-saline");
  assert.equal(soil.classifyEC(0.4), "Very slightly saline");
  assert.equal(soil.classifyEC(0.8), "Moderately saline");
  assert.equal(soil.classifyEC(1.6), "Strongly saline");
});

// ============================================================
// Missing and invalid values
// ============================================================

test("missing values are unavailable", () => {
  const result = soil.classifyAllParameters({
    pH: null,
    nitrogen: undefined,
    phosphorus: "",
    potassium: 120,
    organicCarbon: 0.5,
    electricalConductivity: 0.4,
  });

  assert.equal(result.pH, null);
  assert.equal(result.nitrogen, null);
  assert.equal(result.phosphorus, null);
  assert.equal(result.potassium, "Medium");
  assert.equal(result.organicCarbon, "Medium");
  assert.equal(result.electricalConductivity, "Very slightly saline");
});

test("invalid laboratory values are rejected", () => {
  assert.throws(() => soil.classifyNitrogen("abc"), TypeError);
  assert.throws(() => soil.classifyPhosphorus(null), TypeError);
  assert.throws(() => soil.classifyPotassium(undefined), TypeError);
  assert.throws(() => soil.classifyPH(15), RangeError);
});

// ============================================================
// Overall fertility
// ============================================================

test("overall fertility is Unavailable when no values exist", () => {
  assert.equal(
    soil.assessOverallFertility({
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      organicCarbon: null,
    }),
    "Unavailable"
  );
});

test("overall fertility is Low when any major parameter is Low", () => {
  assert.equal(
    soil.assessOverallFertility({
      nitrogen: "Low",
      phosphorus: "High",
      potassium: "High",
      organicCarbon: "High",
    }),
    "Low"
  );
});

test("overall fertility is High for three or more High/Very High values", () => {
  assert.equal(
    soil.assessOverallFertility({
      nitrogen: "High",
      phosphorus: "Very High",
      potassium: "High",
      organicCarbon: "Medium",
    }),
    "High"
  );
});

test("overall fertility otherwise returns Moderate / Good", () => {
  assert.equal(
    soil.assessOverallFertility({
      nitrogen: "Medium",
      phosphorus: "High",
      potassium: "Medium",
      organicCarbon: "High",
    }),
    "Moderate / Good"
  );
});