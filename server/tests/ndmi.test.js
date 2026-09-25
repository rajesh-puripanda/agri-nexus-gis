"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const ndmiDefinition =
  require("../scientific/remoteSensing/indices/ndmi");

test("NDMI definition contains all required index fields", () => {
  for (const field of REQUIRED_INDEX_FIELDS) {
    assert.notEqual(ndmiDefinition[field], undefined);
  }
});

test("NDMI definition passes the common index contract", () => {
  const result = validateIndexDefinition(ndmiDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("NDMI has the correct scientific identity", () => {
  assert.equal(ndmiDefinition.code, "NDMI");
  assert.equal(
    ndmiDefinition.name,
    "Normalized Difference Moisture Index"
  );
});

test("NDMI requires NIR and SWIR bands", () => {
  assert.deepEqual(
    ndmiDefinition.requiredBands,
    ["NIR", "SWIR"]
  );
});

test("NDMI valid range is -1 to 1", () => {
  assert.equal(ndmiDefinition.validRange.min, -1);
  assert.equal(ndmiDefinition.validRange.max, 1);
});

test("NDMI uses the NIR-SWIR moisture formula", () => {
  assert.equal(
    ndmiDefinition.formula,
    "(NIR - SWIR) / (NIR + SWIR)"
  );
});

test("NDMI provides moisture classification rules", () => {
  assert.equal(
    ndmiDefinition.classificationRules.method,
    "baseline_qualitative"
  );

  assert.equal(
    ndmiDefinition.classificationRules.classes.length,
    5
  );
});

test("NDMI provides visualization rules", () => {
  assert.equal(
    ndmiDefinition.visualizationRules.recommendedDisplay,
    "continuous"
  );

  assert.equal(
    ndmiDefinition.visualizationRules.clampToValidRange,
    true
  );
});
