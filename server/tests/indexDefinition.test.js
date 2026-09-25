"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  INDEX_DEFINITION_VERSION,
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
} = require("../scientific/remoteSensing/indices/indexDefinition");

const validDefinition = {
  code: "NDVI",
  name: "Normalized Difference Vegetation Index",
  description: "Vegetation index.",
  formula: "(NIR - Red) / (NIR + Red)",
  requiredBands: ["NIR", "Red"],
  sensorCompatibility: ["generic"],
  validRange: {
    min: -1,
    max: 1,
  },
  interpretation: "Vegetation condition.",
  classificationRules: {},
  visualizationRules: {},
};

test("index definition contract exposes version", () => {
  assert.equal(INDEX_DEFINITION_VERSION, "1.0");
});

test("index definition contract exposes required fields", () => {
  assert.deepEqual(REQUIRED_INDEX_FIELDS, [
    "code",
    "name",
    "description",
    "formula",
    "requiredBands",
    "sensorCompatibility",
    "validRange",
    "interpretation",
    "classificationRules",
    "visualizationRules",
  ]);
});

test("invalid definition is rejected", () => {
  const result = validateIndexDefinition(null);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("incomplete definition is rejected", () => {
  const result = validateIndexDefinition({
    code: "NDVI",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Missing required field: name"));
});

test("valid structural definition is accepted", () => {
  const result = validateIndexDefinition(validDefinition);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("invalid requiredBands type is rejected", () => {
  const result = validateIndexDefinition({
    ...validDefinition,
    requiredBands: "NIR,Red",
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("requiredBands must be an array.")
  );
});

test("non-numeric validRange.min is rejected", () => {
  const result = validateIndexDefinition({
    ...validDefinition,
    validRange: { min: "low", max: 1 },
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "validRange.min must be a finite number."
    )
  );
});

test("non-numeric validRange.max is rejected", () => {
  const result = validateIndexDefinition({
    ...validDefinition,
    validRange: { min: -1, max: "high" },
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "validRange.max must be a finite number."
    )
  );
});

test("reversed validRange is rejected", () => {
  const result = validateIndexDefinition({
    ...validDefinition,
    validRange: { min: 1, max: -1 },
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "validRange.min must be less than validRange.max."
    )
  );
});
