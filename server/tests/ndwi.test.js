"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const ndwiDefinition =
  require("../scientific/remoteSensing/indices/ndwi");

test("NDWI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(ndwiDefinition[field], undefined);
  }
});

test("NDWI definition passes the common index contract", () => {
  const result = validateIndexDefinition(ndwiDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("NDWI has the correct scientific identity", () => {
  assert.equal(ndwiDefinition.code, "NDWI");
  assert.equal(
    ndwiDefinition.name,
    "Normalized Difference Water Index"
  );
});

test("NDWI requires Green and NIR bands", () => {
  assert.deepEqual(
    ndwiDefinition.requiredBands,
    ["Green", "NIR"]
  );
});

test("NDWI valid range is -1 to 1", () => {
  assert.equal(ndwiDefinition.validRange.min, -1);
  assert.equal(ndwiDefinition.validRange.max, 1);
});

test("NDWI uses the McFeeters water-index formula", () => {
  assert.equal(
    ndwiDefinition.formula,
    "(Green - NIR) / (Green + NIR)"
  );
});

test("NDWI provides water-signal classification rules", () => {
  assert.equal(
    ndwiDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.equal(
    ndwiDefinition.classificationRules.classes.length,
    5
  );
});

test("NDWI provides visualization rules", () => {
  assert.equal(
    ndwiDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    ndwiDefinition.visualizationRules.clampToValidRange,
    true
  );
});
