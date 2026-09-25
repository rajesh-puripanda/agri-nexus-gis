"use strict";

// ============================================================
// AgriNexus GIS
// server/tests/evi.test.js
// ============================================================
//
// Phase 13.2  EVI scientific definition tests.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const eviDefinition = require(
  "../scientific/remoteSensing/indices/evi"
);

test("EVI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(
      eviDefinition[field],
      undefined,
      `Missing required field: ${field}`
    );
  }
});

test("EVI definition passes the common index contract", () => {
  const result = validateIndexDefinition(eviDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("EVI has the correct scientific identity", () => {
  assert.equal(eviDefinition.code, "EVI");
  assert.equal(
    eviDefinition.name,
    "Enhanced Vegetation Index"
  );
});

test("EVI requires NIR, Red, and Blue bands", () => {
  assert.deepEqual(
    eviDefinition.requiredBands,
    ["NIR", "Red", "Blue"]
  );
});

test("EVI valid range is -1 to 1", () => {
  assert.equal(eviDefinition.validRange.min, -1);
  assert.equal(eviDefinition.validRange.max, 1);
});

test("EVI formula is defined correctly", () => {
  assert.equal(
    eviDefinition.formula,
    "G * (NIR - Red) / (NIR + C1 * Red - C2 * Blue + L)"
  );
});

test("EVI standard coefficients are defined", () => {
  assert.equal(eviDefinition.parameters.G, 2.5);
  assert.equal(eviDefinition.parameters.C1, 6.0);
  assert.equal(eviDefinition.parameters.C2, 7.5);
  assert.equal(eviDefinition.parameters.L, 1.0);
});

test("EVI provides classification rules", () => {
  assert.equal(
    eviDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.ok(
    Array.isArray(
      eviDefinition.classificationRules.classes
    )
  );

  assert.equal(
    eviDefinition.classificationRules.classes.length,
    5
  );
});

test("EVI provides visualization rules", () => {
  assert.equal(
    eviDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    eviDefinition.visualizationRules.legendType,
    "sequential"
  );

  assert.equal(
    eviDefinition.visualizationRules.clampToValidRange,
    true
  );
});
