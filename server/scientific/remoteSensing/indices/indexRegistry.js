"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/indexRegistry.js
// ============================================================
//
// Phase 13.4  Remote Sensing Index Registry / Catalog
//
// Single authoritative registry for scientific spectral-index
// definitions.
//
// This registry exposes definitions only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const {
  validateIndexDefinition,
} = require("./indexDefinition");

const ndviDefinition = require("./ndvi");
const eviDefinition = require("./evi");
const saviDefinition = require("./savi");
const gndviDefinition = require("./gndvi");
const arviDefinition = require("./arvi");
const ndwiDefinition = require("./ndwi");
const ndmiDefinition = require("./ndmi");

const INDEX_REGISTRY_VERSION = "1.0";

const INDEX_DEFINITIONS = Object.freeze([
  ndviDefinition,
  eviDefinition,
  saviDefinition,
  gndviDefinition,
  arviDefinition,
  ndwiDefinition,
  ndmiDefinition,
]);

const INDEX_BY_CODE = Object.freeze(
  Object.fromEntries(
    INDEX_DEFINITIONS.map((definition) => [
      definition.code,
      definition,
    ])
  )
);

function getAllIndexDefinitions() {
  return INDEX_DEFINITIONS;
}

function getIndexDefinition(code) {
  if (typeof code !== "string") {
    return undefined;
  }

  return INDEX_BY_CODE[code.trim().toUpperCase()];
}

function hasIndexDefinition(code) {
  return getIndexDefinition(code) !== undefined;
}

function validateIndexRegistry() {
  const errors = [];
  const codes = new Set();

  for (const definition of INDEX_DEFINITIONS) {
    const result = validateIndexDefinition(definition);

    if (!result.valid) {
      errors.push(
        ...result.errors.map(
          (error) => `${definition.code || "UNKNOWN"}: ${error}`
        )
      );
    }

    if (codes.has(definition.code)) {
      errors.push(
        `Duplicate index code: ${definition.code}`
      );
    }

    codes.add(definition.code);
  }

  return {
    valid: errors.length === 0,
    errors,
    count: INDEX_DEFINITIONS.length,
  };
}

module.exports = {
  INDEX_REGISTRY_VERSION,
  INDEX_DEFINITIONS,
  getAllIndexDefinitions,
  getIndexDefinition,
  hasIndexDefinition,
  validateIndexRegistry,
};
