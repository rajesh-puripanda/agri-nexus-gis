"use strict";

// ============================================================
// AgriNexus GIS
// server/tests/gndvi.test.js
// ============================================================
//
// Phase 13.2  GNDVI scientific definition tests.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const gndviDefinition = require(
  "../scientific/remoteSensing/indices/gndvi"
);

test("GNDVI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(
      gndviDefinition[field],
      undefined,
      `Missing required field: ${field}`
    );
  }
});

test("GNDVI definition passes the common index contract", () => {
  const result = validateIndexDefinition(gndviDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("GNDVI has the correct scientific identity", () => {
  assert.equal(gndviDefinition.code, "GNDVI");
  assert.equal(
    gndviDefinition.name,
    "Green Normalized Difference Vegetation Index"
  );
});

test("GNDVI requires NIR and Green bands", () => {
  assert.deepEqual(
    gndviDefinition.requiredBands,
    ["NIR", "Green"]
  );
});

test("GNDVI valid range is -1 to 1", () => {
  assert.equal(gndviDefinition.validRange.min, -1);
  assert.equal(gndviDefinition.validRange.max, 1);
});

test("GNDVI formula is defined correctly", () => {
  assert.equal(
    gndviDefinition.formula,
    "(NIR - Green) / (NIR + Green)"
  );
});

test("GNDVI provides classification rules", () => {
  assert.equal(
    gndviDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.ok(
    Array.isArray(
      gndviDefinition.classificationRules.classes
    )
  );

  assert.equal(
    gndviDefinition.classificationRules.classes.length,
    5
  );
});

test("GNDVI provides visualization rules", () => {
  assert.equal(
    gndviDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    gndviDefinition.visualizationRules.legendType,
    "sequential"
  );

  assert.equal(
    gndviDefinition.visualizationRules.clampToValidRange,
    true
  );
});
