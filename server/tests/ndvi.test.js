"use strict";

// ============================================================
// AgriNexus GIS
// server/tests/ndvi.test.js
// ============================================================
//
// Phase 13.2  NDVI scientific definition tests.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const ndviDefinition = require(
  "../scientific/remoteSensing/indices/ndvi"
);

test("NDVI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(
      ndviDefinition[field],
      undefined,
      `Missing required field: ${field}`
    );
  }
});

test("NDVI definition passes the common index contract", () => {
  const result = validateIndexDefinition(ndviDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("NDVI has the correct scientific identity", () => {
  assert.equal(ndviDefinition.code, "NDVI");
  assert.equal(
    ndviDefinition.name,
    "Normalized Difference Vegetation Index"
  );
});

test("NDVI uses NIR and Red bands", () => {
  assert.deepEqual(
    ndviDefinition.requiredBands,
    ["NIR", "Red"]
  );
});

test("NDVI valid range is -1 to 1", () => {
  assert.equal(ndviDefinition.validRange.min, -1);
  assert.equal(ndviDefinition.validRange.max, 1);
});

test("NDVI formula is defined correctly", () => {
  assert.equal(
    ndviDefinition.formula,
    "(NIR - Red) / (NIR + Red)"
  );
});

test("NDVI provides classification rules", () => {
  assert.equal(
    ndviDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.ok(
    Array.isArray(
      ndviDefinition.classificationRules.classes
    )
  );

  assert.equal(
    ndviDefinition.classificationRules.classes.length,
    5
  );
});

test("NDVI provides visualization rules", () => {
  assert.equal(
    ndviDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    ndviDefinition.visualizationRules.legendType,
    "sequential"
  );

  assert.equal(
    ndviDefinition.visualizationRules.clampToValidRange,
    true
  );
});
