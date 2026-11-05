"use strict";

const {
  createCropConditionCalibration,
  validateCropConditionCalibration,
} = require("../../scientific/cropIntelligence/cropConditionCalibrationContract");

const calibrationRepository = require("../../repositories/cropConditionCalibrationRepository");

const SERVICE_VERSION = "1.0";

async function registerCalibration(input, actorId = null) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Calibration input must be an object.");
  }

  const calibration = createCropConditionCalibration({
    ...input,
    status: "proposed",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  if (!validation.valid) {
    const error = new TypeError(
      "Calibration contract validation failed.",
    );

    error.code = "INVALID_CROP_CONDITION_CALIBRATION";
    error.validationErrors = validation.errors;

    throw error;
  }

  return calibrationRepository.registerCalibration(
    calibration,
    actorId,
  );
}

async function getCalibration(calibrationId) {
  if (
    typeof calibrationId !== "string" ||
    !calibrationId.trim()
  ) {
    throw new TypeError("calibrationId is required.");
  }

  const record = await calibrationRepository.getCalibration(
    calibrationId.trim(),
  );

  if (!record) {
    return null;
  }

  const validation = validateCropConditionCalibration(
    record.calibration,
  );

  if (!validation.valid) {
    const error = new Error(
      "Stored calibration failed contract validation.",
    );

    error.code = "CORRUPT_CALIBRATION_RECORD";
    error.validationErrors = validation.errors;

    throw error;
  }

  if (record.calibration.status !== record.status) {
    const error = new Error(
      "Stored calibration status is inconsistent with registry status.",
    );

    error.code = "CALIBRATION_STATUS_MISMATCH";
    throw error;
  }

  return record;
}

async function listCalibrations(filters = {}) {
  if (
    !filters ||
    typeof filters !== "object" ||
    Array.isArray(filters)
  ) {
    throw new TypeError("Calibration filters must be an object.");
  }

  const allowedStatuses = [
    "proposed",
    "validated",
    "retired",
  ];

  if (
    filters.status !== undefined &&
    !allowedStatuses.includes(filters.status)
  ) {
    throw new TypeError("Invalid calibration status filter.");
  }

  return calibrationRepository.listCalibrations(filters);
}

async function getCalibrationHistory(calibrationId) {
  const record = await getCalibration(calibrationId);

  if (!record) {
    return null;
  }

  return calibrationRepository.getCalibrationHistory(
    record.calibrationId,
  );
}

async function recordValidationDecision(input = {}) {
  const {
    calibrationId,
    decision,
    actorId = null,
    reason,
    evidence,
  } = input;

  if (
    typeof calibrationId !== "string" ||
    !calibrationId.trim()
  ) {
    throw new TypeError("calibrationId is required.");
  }

  if (!["validated", "validation_rejected"].includes(decision)) {
    throw new TypeError("Invalid calibration validation decision.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    throw new TypeError("A decision reason is required.");
  }

  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    Object.keys(evidence).length === 0
  ) {
    throw new TypeError(
      "Non-empty supporting decision evidence is required.",
    );
  }

  return calibrationRepository.recordValidationDecision({
    calibrationId: calibrationId.trim(),
    decision,
    actorId,
    reason: reason.trim(),
    evidence,
  });
}

async function retireCalibration(input = {}) {
  const {
    calibrationId,
    actorId = null,
    reason,
  } = input;

  if (
    typeof calibrationId !== "string" ||
    !calibrationId.trim()
  ) {
    throw new TypeError("calibrationId is required.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    throw new TypeError("A retirement reason is required.");
  }

  return calibrationRepository.retireCalibration({
    calibrationId: calibrationId.trim(),
    actorId,
    reason: reason.trim(),
  });
}

module.exports = {
  SERVICE_VERSION,
  registerCalibration,
  getCalibration,
  listCalibrations,
  getCalibrationHistory,
  recordValidationDecision,
  retireCalibration,
};