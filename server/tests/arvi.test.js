"use strict";

// ============================================================
// AgriNexus GIS
// server/tests/arvi.test.js
// ============================================================
//
// Phase 13.2  ARVI scientific definition tests.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const arviDefinition = require(
  "../scientific/remoteSensing/indices/arvi"
);

test("ARVI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(
      arviDefinition[field],
      undefined,
      `Missing required field: ${field}`
    );
  }
});

test("ARVI definition passes the common index contract", () => {
  const result = validateIndexDefinition(arviDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("ARVI has the correct scientific identity", () => {
  assert.equal(arviDefinition.code, "ARVI");
  assert.equal(
    arviDefinition.name,
    "Atmospherically Resistant Vegetation Index"
  );
});

test("ARVI requires NIR, Red, and Blue bands", () => {
  assert.deepEqual(
    arviDefinition.requiredBands,
    ["NIR", "Red", "Blue"]
  );
});

test("ARVI valid range is -1 to 1", () => {
  assert.equal(arviDefinition.validRange.min, -1);
  assert.equal(arviDefinition.validRange.max, 1);
});

test("ARVI formula is defined correctly", () => {
  assert.equal(
    arviDefinition.formula,
    "(NIR - (2 * Red - Blue)) / (NIR + (2 * Red - Blue))"
  );
});

test("ARVI atmospheric correction parameter is defined", () => {
  assert.equal(arviDefinition.parameters.gamma, 1.0);
});

test("ARVI provides classification rules", () => {
  assert.equal(
    arviDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.ok(
    Array.isArray(
      arviDefinition.classificationRules.classes
    )
  );

  assert.equal(
    arviDefinition.classificationRules.classes.length,
    5
  );
});

test("ARVI provides visualization rules", () => {
  assert.equal(
    arviDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    arviDefinition.visualizationRules.legendType,
    "sequential"
  );

  assert.equal(
    arviDefinition.visualizationRules.clampToValidRange,
    true
  );
});
