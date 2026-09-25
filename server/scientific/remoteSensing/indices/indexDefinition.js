"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/indexDefinition.js
// ============================================================
//
// Phase 13.1  Remote Sensing Domain Architecture
//
// Common scientific contract for spectral-index definitions.
// Metadata validation only; no index calculation.
//
// ============================================================

const INDEX_DEFINITION_VERSION = "1.0";

const REQUIRED_INDEX_FIELDS = Object.freeze([
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

function validateIndexDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    return {
      valid: false,
      errors: ["Index definition must be an object."],
    };
  }

  const errors = [];

  for (const field of REQUIRED_INDEX_FIELDS) {
    if (
      definition[field] === undefined ||
      definition[field] === null
    ) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (
    definition.code !== undefined &&
    (typeof definition.code !== "string" ||
      definition.code.trim().length === 0)
  ) {
    errors.push("code must be a non-empty string.");
  }

  if (
    definition.requiredBands !== undefined &&
    !Array.isArray(definition.requiredBands)
  ) {
    errors.push("requiredBands must be an array.");
  }

  if (
    definition.sensorCompatibility !== undefined &&
    !Array.isArray(definition.sensorCompatibility)
  ) {
    errors.push("sensorCompatibility must be an array.");
  }

  if (
    definition.validRange !== undefined &&
    (
      typeof definition.validRange !== "object" ||
      definition.validRange === null ||
      Array.isArray(definition.validRange)
    )
  ) {
    errors.push("validRange must be an object.");
  } else if (definition.validRange) {
    const { min, max } = definition.validRange;

    if (!Number.isFinite(min)) {
      errors.push("validRange.min must be a finite number.");
    }

    if (!Number.isFinite(max)) {
      errors.push("validRange.max must be a finite number.");
    }

    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min >= max
    ) {
      errors.push("validRange.min must be less than validRange.max.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  INDEX_DEFINITION_VERSION,
  REQUIRED_INDEX_FIELDS,
  validateIndexDefinition,
};
