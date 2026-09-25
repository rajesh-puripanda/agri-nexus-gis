"use strict";

// ============================================================
// AgriNexus GIS
// server/tests/savi.test.js
// ============================================================
//
// Phase 13.2  SAVI scientific definition tests.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const saviDefinition = require(
  "../scientific/remoteSensing/indices/savi"
);

test("SAVI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(
      saviDefinition[field],
      undefined,
      `Missing required field: ${field}`
    );
  }
});

test("SAVI definition passes the common index contract", () => {
  const result = validateIndexDefinition(saviDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("SAVI has the correct scientific identity", () => {
  assert.equal(saviDefinition.code, "SAVI");
  assert.equal(
    saviDefinition.name,
    "Soil-Adjusted Vegetation Index"
  );
});

test("SAVI requires NIR and Red bands", () => {
  assert.deepEqual(
    saviDefinition.requiredBands,
    ["NIR", "Red"]
  );
});

test("SAVI valid range is -1 to 1", () => {
  assert.equal(saviDefinition.validRange.min, -1);
  assert.equal(saviDefinition.validRange.max, 1);
});

test("SAVI formula is defined correctly", () => {
  assert.equal(
    saviDefinition.formula,
    "((NIR - Red) / (NIR + Red + L)) * (1 + L)"
  );
});

test("SAVI standard soil-adjustment parameter is defined", () => {
  assert.equal(saviDefinition.parameters.L, 0.5);
});

test("SAVI provides classification rules", () => {
  assert.equal(
    saviDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.ok(
    Array.isArray(
      saviDefinition.classificationRules.classes
    )
  );

  assert.equal(
    saviDefinition.classificationRules.classes.length,
    5
  );
});

test("SAVI provides visualization rules", () => {
  assert.equal(
    saviDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    saviDefinition.visualizationRules.legendType,
    "sequential"
  );

  assert.equal(
    saviDefinition.visualizationRules.clampToValidRange,
    true
  );
});
