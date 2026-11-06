"use strict";

const {
  validateAgriculturalContext,
} = require("../../scientific/cropIntelligence/agriculturalContextContract");

const {
  validateTemporalIndexObservation,
} = require("../../scientific/remoteSensing/temporal/temporalIndexObservationContract");

const calibrationRegistry = require("./cropConditionCalibrationRegistryService");

const {
  evaluateCropConditionCalibrationApplicability,
} = require("./cropConditionCalibrationApplicabilityService");

const SERVICE_VERSION = "1.0";

const RESULT_STATUSES = Object.freeze([
  "applicable",
  "not_applicable",
  "insufficient_information",
  "ambiguous",
  "no_validated_calibration",
  "invalid_agricultural_context",
  "invalid_observation",
]);

function createResult(status, candidates = []) {
  return {
    serviceVersion: SERVICE_VERSION,
    status,
    selectedCalibration: null,
    candidates,
    reasons: [],
  };
}

async function resolveCropConditionCalibration({
  agriculturalContext,
  observation,
} = {}) {
  const contextValidation =
    validateAgriculturalContext(agriculturalContext);

  if (!contextValidation.valid) {
    const result = createResult(
      "invalid_agricultural_context",
    );
    result.reasons = contextValidation.errors;
    return result;
  }

  const observationErrors =
    validateTemporalIndexObservation(observation);

  if (observationErrors.length > 0) {
    const result = createResult("invalid_observation");
    result.reasons = observationErrors;
    return result;
  }

  const filters = {
    cropCode: agriculturalContext.crop.cropCode,
    indexCode: observation.observation.indexCode,
    season: agriculturalContext.season,
    status: "validated",
  };

  const candidateRecords =
    await calibrationRegistry.listCalibrations(filters);

  if (!Array.isArray(candidateRecords)) {
    throw new TypeError(
      "Calibration registry returned an invalid candidate list.",
    );
  }

  if (candidateRecords.length === 0) {
    return createResult("no_validated_calibration");
  }

  const candidates = [];
  let selectedCalibration = null;

  for (const candidateRecord of candidateRecords) {
    const candidate = {
      calibrationId: candidateRecord.calibrationId,
      status: null,
      evaluation: null,
      reasons: [],
    };

    try {
      const storedRecord =
        await calibrationRegistry.getCalibration(
          candidateRecord.calibrationId,
        );

      if (!storedRecord) {
        candidate.status = "insufficient_information";
        candidate.reasons.push(
          "Calibration disappeared from the registry after candidate listing.",
        );
        candidates.push(candidate);
        continue;
      }

      if (
        storedRecord.status !== "validated" ||
        storedRecord.calibration?.status !== "validated"
      ) {
        candidate.status = "insufficient_information";
        candidate.reasons.push(
          "Calibration registry status changed or is inconsistent.",
        );
        candidates.push(candidate);
        continue;
      }

      candidate.evaluation =
        evaluateCropConditionCalibrationApplicability({
          calibration: storedRecord.calibration,
          agriculturalContext,
          observation,
        });

      candidate.status = candidate.evaluation.status;
      if (candidate.status === "applicable") {
        selectedCalibration = storedRecord.calibration;
      }
      candidate.reasons = candidate.evaluation.reasons || [];
      candidates.push(candidate);
    } catch (error) {
      if (
        error.code === "CORRUPT_CALIBRATION_RECORD" ||
        error.code === "CALIBRATION_STATUS_MISMATCH"
      ) {
        candidate.status = "insufficient_information";
        candidate.reasons.push(error.message);
        candidates.push(candidate);
        continue;
      }

      throw error;
    }
  }

  const applicable = candidates.filter(
    candidate => candidate.status === "applicable",
  );

  const unresolved = candidates.filter(
    candidate =>
      candidate.status !== "applicable" &&
      candidate.status !== "not_applicable",
  );

  const result = createResult(null, candidates);

  if (applicable.length > 1) {
    result.status = "ambiguous";
    result.reasons.push(
      "Multiple validated calibrations match the supplied context and observation.",
    );
    return result;
  }

  if (unresolved.length > 0) {
    result.status = "insufficient_information";
    result.reasons.push(
      "One or more candidate calibrations could not be conclusively evaluated.",
    );
    return result;
  }

  if (applicable.length === 1) {
    result.status = "applicable";
    result.selectedCalibration = selectedCalibration;
    return result;
  }

  result.status = "not_applicable";
  result.reasons.push(
    "No validated calibration matches the supplied context and observation.",
  );

  return result;
}

module.exports = {
  SERVICE_VERSION,
  RESULT_STATUSES,
  resolveCropConditionCalibration,
};
