"use strict";

/**
 * Crop Condition Calibration Contract
 *
 * Phase 6.4.4
 *
 * Responsibility:
 *   - Define the structure of a validated agricultural calibration
 *     specification for crop-condition interpretation.
 *
 * This contract does NOT:
 *   - calculate spectral indices
 *   - classify raster pixels
 *   - calculate temporal change
 *   - invent NDVI/NDMI/NDWI thresholds
 *   - calculate crop-health scores
 *   - calculate moisture-stress scores
 *   - determine irrigation requirements
 *   - calculate crop suitability
 *   - estimate yield
 *
 * Calibration must be backed by an identified dataset, reference
 * observations, documented methodology, and validation evidence.
 */

const CROP_CONDITION_CALIBRATION_CONTRACT_VERSION = "1.0";
const CALIBRATION_TYPE = "CROP_CONDITION_CALIBRATION";

const REQUIRED_FIELDS = [
  "contractVersion",
  "calibrationType",
  "calibrationId",
  "crop",
  "growthStage",
  "season",
  "indexContext",
  "studyArea",
  "calibrationDataset",
  "referenceContext",
  "calibrationMethod",
  "validationContext",
  "applicability",
  "status",
];

const OPTIONAL_FIELDS = ["metadata"];

const VALID_CALIBRATION_STATUSES = [
  "proposed",
  "validated",
  "retired",
];

const VALID_REFERENCE_TYPES = [
  "field_observation",
  "ground_truth",
  "laboratory_measurement",
  "agronomic_measurement",
  "validated_reference_dataset",
];

const VALID_CALIBRATION_METHODS = [
  "threshold",
  "statistical",
  "empirical",
  "model_based",
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

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateCropConditionCalibration(calibration) {
  const errors = [];

  if (!isPlainObject(calibration)) {
    return {
      valid: false,
      errors: ["Calibration must be a plain object."],
    };
  }

  if (
    calibration.contractVersion !==
    CROP_CONDITION_CALIBRATION_CONTRACT_VERSION
  ) {
    errors.push(
      `contractVersion must be "${CROP_CONDITION_CALIBRATION_CONTRACT_VERSION}".`,
    );
  }

  if (calibration.calibrationType !== CALIBRATION_TYPE) {
    errors.push(
      `calibrationType must be "${CALIBRATION_TYPE}".`,
    );
  }

  if (!isNonEmptyString(calibration.calibrationId)) {
    errors.push(
      "calibrationId must be a non-empty string.",
    );
  }

  if (!isPlainObject(calibration.crop)) {
    errors.push("crop must be a plain object.");
  } else {
    if (!isNonEmptyString(calibration.crop.cropCode)) {
      errors.push(
        "crop.cropCode must be a non-empty string.",
      );
    }

    if (!isNonEmptyString(calibration.crop.cropName)) {
      errors.push(
        "crop.cropName must be a non-empty string.",
      );
    }
  }

  if (!isNonEmptyString(calibration.growthStage)) {
    errors.push(
      "growthStage must be a non-empty string.",
    );
  }

  if (!isNonEmptyString(calibration.season)) {
    errors.push(
      "season must be a non-empty string.",
    );
  }

  if (!isPlainObject(calibration.indexContext)) {
    errors.push("indexContext must be a plain object.");
  } else {
    if (!isNonEmptyString(calibration.indexContext.indexCode)) {
      errors.push(
        "indexContext.indexCode must be a non-empty string.",
      );
    }

    if (!isNonEmptyString(calibration.indexContext.indexName)) {
      errors.push(
        "indexContext.indexName must be a non-empty string.",
      );
    }

    if (
      calibration.indexContext.sensor !== undefined &&
      !isNonEmptyString(calibration.indexContext.sensor)
    ) {
      errors.push(
        "indexContext.sensor must be a non-empty string when provided.",
      );
    }
  }

  if (!isPlainObject(calibration.studyArea)) {
    errors.push("studyArea must be a plain object.");
  }

  if (!isPlainObject(calibration.calibrationDataset)) {
    errors.push("calibrationDataset must be a plain object.");
  } else {
    if (
      !isNonEmptyString(
        calibration.calibrationDataset.datasetId,
      )
    ) {
      errors.push(
        "calibrationDataset.datasetId must be a non-empty string.",
      );
    }

    if (
      !isNonEmptyString(
        calibration.calibrationDataset.datasetName,
      )
    ) {
      errors.push(
        "calibrationDataset.datasetName must be a non-empty string.",
      );
    }

    if (
      calibration.calibrationDataset.observationCount !==
      undefined &&
      !isNonNegativeInteger(
        calibration.calibrationDataset.observationCount,
      )
    ) {
      errors.push(
        "calibrationDataset.observationCount must be a non-negative integer when provided.",
      );
    }
  }

  if (!isPlainObject(calibration.referenceContext)) {
    errors.push("referenceContext must be a plain object.");
  } else {
    if (
      !VALID_REFERENCE_TYPES.includes(
        calibration.referenceContext.referenceType,
      )
    ) {
      errors.push(
        `referenceContext.referenceType must be one of: ${VALID_REFERENCE_TYPES.join(
          ", ",
        )}.`,
      );
    }

    if (
      !isNonEmptyString(
        calibration.referenceContext.referenceVariable,
      )
    ) {
      errors.push(
        "referenceContext.referenceVariable must be a non-empty string.",
      );
    }
  }

  if (!isPlainObject(calibration.calibrationMethod)) {
    errors.push("calibrationMethod must be a plain object.");
  } else if (
    !VALID_CALIBRATION_METHODS.includes(
      calibration.calibrationMethod.method,
    )
  ) {
    errors.push(
      `calibrationMethod.method must be one of: ${VALID_CALIBRATION_METHODS.join(
        ", ",
      )}.`,
    );
  }

  if (!isPlainObject(calibration.validationContext)) {
    errors.push("validationContext must be a plain object.");
  } else {
    if (
      calibration.validationContext.validationDatasetId !==
        undefined &&
      !isNonEmptyString(
        calibration.validationContext.validationDatasetId,
      )
    ) {
      errors.push(
        "validationContext.validationDatasetId must be a non-empty string when provided.",
      );
    }

    if (
      calibration.validationContext.validationObservationCount !==
        undefined &&
      !isNonNegativeInteger(
        calibration.validationContext.validationObservationCount,
      )
    ) {
      errors.push(
        "validationContext.validationObservationCount must be a non-negative integer when provided.",
      );
    }
  }

  if (!isPlainObject(calibration.applicability)) {
    errors.push("applicability must be a plain object.");
  }

  if (!VALID_CALIBRATION_STATUSES.includes(calibration.status)) {
    errors.push(
      `status must be one of: ${VALID_CALIBRATION_STATUSES.join(
        ", ",
      )}.`,
    );
  }

  if (
    calibration.metadata !== undefined &&
    !isPlainObject(calibration.metadata)
  ) {
    errors.push(
      "metadata must be a plain object when provided.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function createCropConditionCalibration(input = {}) {
  const calibration = {
    ...input,
    contractVersion:
      CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,
    calibrationType: CALIBRATION_TYPE,
  };

  const validation =
    validateCropConditionCalibration(calibration);

  if (!validation.valid) {
    const error = new TypeError(
      "Invalid crop condition calibration.",
    );

    error.code =
      "INVALID_CROP_CONDITION_CALIBRATION";

    error.validationErrors = validation.errors;

    throw error;
  }

  return calibration;
}

module.exports = {
  CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,
  CALIBRATION_TYPE,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  VALID_CALIBRATION_STATUSES,
  VALID_REFERENCE_TYPES,
  VALID_CALIBRATION_METHODS,
  validateCropConditionCalibration,
  createCropConditionCalibration,
};
