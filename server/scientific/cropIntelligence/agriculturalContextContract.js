"use strict";

/**
 * Agricultural Context Contract
 *
 * Phase 6.4.3
 *
 * Responsibility:
 *   - Define the agricultural context required for calibrated
 *     interpretation of remote-sensing crop-condition evidence.
 *
 * This contract does NOT:
 *   - calculate spectral indices
 *   - classify raster pixels
 *   - calculate temporal change
 *   - define NDVI/NDMI/NDWI thresholds
 *   - calculate crop-health scores
 *   - calculate moisture-stress scores
 *   - determine irrigation requirements
 *   - calculate crop suitability
 *   - estimate yield
 *
 * Existing Remote Sensing and Crop Suitability contracts remain
 * authoritative for their respective responsibilities.
 */

const AGRICULTURAL_CONTEXT_CONTRACT_VERSION = "1.0";
const CONTEXT_TYPE = "AGRICULTURAL_CONTEXT";

const REQUIRED_FIELDS = [
  "contractVersion",
  "contextType",
  "crop",
  "growthStage",
  "season",
  "observationPeriod",
  "studyArea",
  "sensorContext",
  "calibrationContext",
];

const OPTIONAL_FIELDS = ["metadata"];

const VALID_CALIBRATION_STATUSES = [
  "not_available",
  "available",
  "validated",
];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateAgriculturalContext(context) {
  const errors = [];

  if (!isPlainObject(context)) {
    return {
      valid: false,
      errors: ["Agricultural context must be a plain object."],
    };
  }

  if (context.contractVersion !== AGRICULTURAL_CONTEXT_CONTRACT_VERSION) {
    errors.push(
      `contractVersion must be "${AGRICULTURAL_CONTEXT_CONTRACT_VERSION}".`,
    );
  }

  if (context.contextType !== CONTEXT_TYPE) {
    errors.push(`contextType must be "${CONTEXT_TYPE}".`);
  }

  if (!isPlainObject(context.crop)) {
    errors.push("crop must be a plain object.");
  } else {
    if (!isNonEmptyString(context.crop.cropCode)) {
      errors.push("crop.cropCode must be a non-empty string.");
    }

    if (!isNonEmptyString(context.crop.cropName)) {
      errors.push("crop.cropName must be a non-empty string.");
    }
  }

  if (!isNonEmptyString(context.growthStage)) {
    errors.push("growthStage must be a non-empty string.");
  }

  if (!isNonEmptyString(context.season)) {
    errors.push("season must be a non-empty string.");
  }

  if (!isPlainObject(context.observationPeriod)) {
    errors.push("observationPeriod must be a plain object.");
  } else {
    if (!isNonEmptyString(context.observationPeriod.startDate)) {
      errors.push(
        "observationPeriod.startDate must be a non-empty string.",
      );
    }

    if (!isNonEmptyString(context.observationPeriod.endDate)) {
      errors.push(
        "observationPeriod.endDate must be a non-empty string.",
      );
    }
  }

  if (!isPlainObject(context.studyArea)) {
    errors.push("studyArea must be a plain object.");
  }

  if (!isPlainObject(context.sensorContext)) {
    errors.push("sensorContext must be a plain object.");
  }

  if (!isPlainObject(context.calibrationContext)) {
    errors.push("calibrationContext must be a plain object.");
  } else if (
    !VALID_CALIBRATION_STATUSES.includes(
      context.calibrationContext.status,
    )
  ) {
    errors.push(
      `calibrationContext.status must be one of: ${VALID_CALIBRATION_STATUSES.join(
        ", ",
      )}.`,
    );
  }

  if (
    context.metadata !== undefined &&
    !isPlainObject(context.metadata)
  ) {
    errors.push("metadata must be a plain object when provided.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function createAgriculturalContext(input = {}) {
  const context = {
    ...input,
    contractVersion: AGRICULTURAL_CONTEXT_CONTRACT_VERSION,
    contextType: CONTEXT_TYPE,
  };

  const validation = validateAgriculturalContext(context);

  if (!validation.valid) {
    const error = new TypeError(
      "Invalid agricultural context.",
    );

    error.code = "INVALID_AGRICULTURAL_CONTEXT";
    error.validationErrors = validation.errors;

    throw error;
  }

  return context;
}

module.exports = {
  AGRICULTURAL_CONTEXT_CONTRACT_VERSION,
  CONTEXT_TYPE,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  VALID_CALIBRATION_STATUSES,
  validateAgriculturalContext,
  createAgriculturalContext,
};
