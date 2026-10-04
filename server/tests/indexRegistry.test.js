"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INDEX_REGISTRY_VERSION,
  INDEX_DEFINITIONS,
  getAllIndexDefinitions,
  getIndexDefinition,
  hasIndexDefinition,
  validateIndexRegistry,
} = require("../scientific/remoteSensing/indices/indexRegistry");

test("index registry exposes a version", () => {
  assert.equal(INDEX_REGISTRY_VERSION, "1.0");
});

test("index registry contains the eight registered definitions", () => {
  assert.equal(INDEX_DEFINITIONS.length, 8);
});

test("index registry contains unique index codes", () => {
  const codes = INDEX_DEFINITIONS.map(
    (definition) => definition.code
  );

  assert.equal(
    new Set(codes).size,
    codes.length
  );

  assert.deepEqual(codes, [
    "NDVI",
    "EVI",
    "SAVI",
    "GNDVI",
    "ARVI",
    "NDWI",
    "NDMI",
    "BSI",
  ]);
});

test("getAllIndexDefinitions returns the registry definitions", () => {
  const definitions = getAllIndexDefinitions();

  assert.equal(definitions.length, 8);
  assert.equal(definitions[0].code, "NDVI");
  assert.equal(definitions[6].code, "NDMI");
  assert.equal(definitions[7].code, "BSI");
});

test("getIndexDefinition resolves an index by code", () => {
  assert.equal(
    getIndexDefinition("NDVI").code,
    "NDVI"
  );

  assert.equal(
    getIndexDefinition("ndmi").code,
    "NDMI"
  );

  assert.equal(
    getIndexDefinition("  savi  ").code,
    "SAVI"
  );

  assert.equal(
    getIndexDefinition("bsi").code,
    "BSI"
  );
});

test("getIndexDefinition returns undefined for an unknown code", () => {
  assert.equal(
    getIndexDefinition("UNKNOWN"),
    undefined
  );
});

test("hasIndexDefinition identifies registered indexes", () => {
  assert.equal(hasIndexDefinition("NDVI"), true);
  assert.equal(hasIndexDefinition("ndwi"), true);
  assert.equal(hasIndexDefinition("bsi"), true);
  assert.equal(hasIndexDefinition("UNKNOWN"), false);
});

test("index registry passes scientific definition validation", () => {
  const result = validateIndexRegistry();

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.count, 8);
});

test("index registry definitions remain immutable", () => {
  assert.equal(
    Object.isFrozen(INDEX_DEFINITIONS),
    true
  );
});
