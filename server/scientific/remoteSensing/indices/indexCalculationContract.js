"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/indexCalculationContract.js
// ============================================================
//
// Phase 13.5  Remote Sensing Index Calculation Contract
// Phase 13.5.2  Registry-Aware Calculation Request Validation
//
// Defines the input/output contract for a future spectral-index
// calculation engine.
//
// This module performs validation only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const {
  getIndexDefinition,
} = require("./indexRegistry");

const INDEX_CALCULATION_CONTRACT_VERSION = "1.0";

const REQUIRED_REQUEST_FIELDS = Object.freeze([
  "indexCode",
  "inputs",
]);

const OPTIONAL_REQUEST_FIELDS = Object.freeze([
  "parameters",
  "spatialContext",
  "processingContext",
]);

const RESULT_FIELDS = Object.freeze([
  "analysisType",
  "analysisVersion",
  "timestamp",
  "inputContext",
  "spatialContext",
  "parameters",
  "results",
  "classification",
  "statistics",
  "metadata",
]);

function validateCalculationRequest(request) {
  const errors = [];

  if (!request || typeof request !== "object") {
    return {
      valid: false,
      errors: ["Calculation request must be an object."],
    };
  }

  for (const field of REQUIRED_REQUEST_FIELDS) {
    if (
      request[field] === undefined ||
      request[field] === null
    ) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (
    request.indexCode !== undefined &&
    (
      typeof request.indexCode !== "string" ||
      request.indexCode.trim().length === 0
    )
  ) {
    errors.push("indexCode must be a non-empty string.");
  }

  if (
    request.inputs !== undefined &&
    (
      typeof request.inputs !== "object" ||
      request.inputs === null ||
      Array.isArray(request.inputs)
    )
  ) {
    errors.push("inputs must be an object.");
  }

  if (
    request.parameters !== undefined &&
    (
      typeof request.parameters !== "object" ||
      request.parameters === null ||
      Array.isArray(request.parameters)
    )
  ) {
    errors.push("parameters must be an object when provided.");
  }

  if (
    request.spatialContext !== undefined &&
    (
      typeof request.spatialContext !== "object" ||
      request.spatialContext === null ||
      Array.isArray(request.spatialContext)
    )
  ) {
    errors.push(
      "spatialContext must be an object when provided."
    );
  }

  if (
    request.processingContext !== undefined &&
    (
      typeof request.processingContext !== "object" ||
      request.processingContext === null ||
      Array.isArray(request.processingContext)
    )
  ) {
    errors.push(
      "processingContext must be an object when provided."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateCalculationRequestAgainstRegistry(request) {
  const structuralValidation =
    validateCalculationRequest(request);

  if (!structuralValidation.valid) {
    return structuralValidation;
  }

  const errors = [];

  const indexCode = request.indexCode
    .trim()
    .toUpperCase();

  const definition = getIndexDefinition(indexCode);

  if (!definition) {
    errors.push(
      `Unknown remote sensing index: ${indexCode}`
    );

    return {
      valid: false,
      errors,
    };
  }

  if (!Array.isArray(definition.requiredBands)) {
    errors.push(
      `${indexCode}: registered requiredBands must be an array.`
    );

    return {
      valid: false,
      errors,
    };
  }

  const suppliedInputs = request.inputs;

  for (const requiredBand of definition.requiredBands) {
    if (
      suppliedInputs[requiredBand] === undefined ||
      suppliedInputs[requiredBand] === null
    ) {
      errors.push(
        `${indexCode}: missing required input band: ${requiredBand}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    indexCode,
    definition,
  };
}

function createCalculationResultContract({
  indexCode,
  timestamp,
  inputContext,
  spatialContext,
  parameters,
  results,
  classification,
  statistics,
  metadata,
}) {
  return {
    analysisType: "remote_sensing_index",
    analysisVersion: INDEX_CALCULATION_CONTRACT_VERSION,
    timestamp,
    inputContext,
    spatialContext,
    parameters,
    results,
    classification,
    statistics,
    metadata: {
      ...(metadata || {}),
      indexCode,
    },
  };
}

module.exports = {
  INDEX_CALCULATION_CONTRACT_VERSION,
  REQUIRED_REQUEST_FIELDS,
  OPTIONAL_REQUEST_FIELDS,
  RESULT_FIELDS,
  validateCalculationRequest,
  validateCalculationRequestAgainstRegistry,
  createCalculationResultContract,
};
