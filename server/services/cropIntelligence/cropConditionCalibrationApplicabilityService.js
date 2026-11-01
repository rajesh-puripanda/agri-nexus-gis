
"use strict";

const {
    validateCropConditionCalibration,
} = require("../../scientific/cropIntelligence/cropConditionCalibrationContract");

const {
    validateAgriculturalContext,
} = require("../../scientific/cropIntelligence/agriculturalContextContract");

const {
    validateTemporalIndexObservation,
} = require("../../scientific/remoteSensing/temporal/temporalIndexObservationContract");

const SERVICE_VERSION = "1.0";

const RESULT_STATUSES = Object.freeze([
    "applicable",
    "not_applicable",
    "insufficient_information",
    "calibration_not_validated",
    "invalid_calibration",
    "invalid_agricultural_context",
    "invalid_observation",
]);

function normalize(value) {
    return typeof value === "string"
        ? value.trim().toLowerCase()
        : null;
}

function isValidDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }

    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function addResult(results, dimension, status, reason) {
    results.push({ dimension, status, reason });
}

function compareDimension(
    results,
    dimension,
    calibrationValue,
    applicabilityValue,
    contextValue,
    required = true,
) {
    const declared = [
        calibrationValue,
        applicabilityValue,
    ].filter(value => value !== undefined && value !== null);

    if (declared.length === 0) {
        addResult(
            results,
            dimension,
            required ? "insufficient_information" : "not_required",
            required
                ? "Calibration does not declare this dimension."
                : "Calibration does not restrict this dimension.",
        );
        return;
    }

    const normalizedDeclared = declared.map(normalize);

    if (
        normalizedDeclared.some(value => !value) ||
        new Set(normalizedDeclared).size > 1
    ) {
        addResult(
            results,
            dimension,
            "conflict",
            "Calibration declarations are missing, invalid, or inconsistent.",
        );
        return;
    }

    const observed = normalize(contextValue);

    if (!observed) {
        addResult(
            results,
            dimension,
            "insufficient_information",
            "Observation context does not provide this dimension.",
        );
        return;
    }

    if (observed !== normalizedDeclared[0]) {
        addResult(
            results,
            dimension,
            "mismatch",
            "Observation context does not match calibration applicability.",
        );
        return;
    }

    addResult(
        results,
        dimension,
        "matched",
        "Observation context matches the calibration declaration.",
    );
}

function evaluateCropConditionCalibrationApplicability({
    calibration,
    agriculturalContext,
    observation,
} = {}) {
    const result = {
        serviceVersion: SERVICE_VERSION,
        status: null,
        calibrationId: calibration?.calibrationId || null,
        dimensionResults: [],
        reasons: [],
    };

    // 1. Validate calibration.
    if (!calibration || typeof calibration !== "object") {
        result.status = "invalid_calibration";
        result.reasons.push("Calibration must be an object.");
        return result;
    }

    const calibrationValidation =
        validateCropConditionCalibration(calibration);

    if (!calibrationValidation.valid) {
        result.status = "invalid_calibration";
        result.reasons = calibrationValidation.errors;
        return result;
    }

    // 2. Validate agricultural context.
    const contextValidation =
        agriculturalContext
            ? validateAgriculturalContext(agriculturalContext)
            : { valid: false };

    if (!contextValidation.valid) {
        result.status = "invalid_agricultural_context";
        result.reasons.push(
            "Agricultural context is missing or invalid.",
        );
        return result;
    }

    // 3. Only validated calibrations may be evaluated.
    if (calibration.status !== "validated") {
        result.status = "calibration_not_validated";
        result.reasons.push(
            `Calibration status is '${calibration.status}', not 'validated'.`,
        );
        return result;
    }

    // 4. Validate authoritative observation.
    const observationErrors =
        validateTemporalIndexObservation(observation);

    if (observationErrors.length > 0) {
        result.status = "invalid_observation";
        result.reasons = observationErrors;
        return result;
    }

    const results = result.dimensionResults;
    const applicability = calibration.applicability || {};
    const observationData = observation.observation;

    // 5. Identify unsupported applicability declarations.
    const supportedApplicabilityFields = new Set([
        "crop",
        "growthStage",
        "season",
        "sensor",
        "indexCode",
        "studyArea",
        "studyAreaId",
        "startDate",
        "endDate",
    ]);

    for (const key of Object.keys(applicability)) {
        if (!supportedApplicabilityFields.has(key)) {
            addResult(
                results,
                key,
                "insufficient_information",
                "Applicability field is not supported by this evaluator.",
            );
        }
    }

    // 6. Compare index.
    compareDimension(
        results,
        "index",
        calibration.indexContext.indexCode,
        applicability.indexCode,
        observationData.indexCode,
    );

    // 7. Compare sensor.
    compareDimension(
        results,
        "sensor",
        calibration.indexContext.sensor,
        applicability.sensor,
        observationData.sensor,
        false,
    );

    // 8. Compare crop.
    compareDimension(
        results,
        "crop",
        calibration.crop.cropCode,
        applicability.crop,
        agriculturalContext.crop.cropCode,
    );

    // 9. Compare growth stage.
    compareDimension(
        results,
        "growthStage",
        calibration.growthStage,
        applicability.growthStage,
        agriculturalContext.growthStage,
    );

    // 10. Compare season.
    compareDimension(
        results,
        "season",
        calibration.season,
        applicability.season,
        agriculturalContext.season,
    );

    // 11. Compare stable study-area identity.
    // Descriptive names alone do not establish geographic applicability.
    const calibrationAreaId =
        calibration.studyArea.studyAreaId ||
        applicability.studyAreaId;

    const contextAreaId =
        agriculturalContext.studyArea.studyAreaId;

    compareDimension(
        results,
        "studyAreaId",
        calibrationAreaId,
        applicability.studyAreaId,
        contextAreaId,
    );

    // 12. Evaluate observation date against calibration applicability.
    const observationDate = observationData.observationDate;
    const start = applicability.startDate;
    const end = applicability.endDate;

    if (start !== undefined || end !== undefined) {
        if (
            !isValidDate(observationDate) ||
            (start !== undefined && !isValidDate(start)) ||
            (end !== undefined && !isValidDate(end))
        ) {
            addResult(
                results,
                "observationPeriod",
                "insufficient_information",
                "Observation date or calibration date bounds are invalid or missing.",
            );
        } else if (start && end && start > end) {
            addResult(
                results,
                "observationPeriod",
                "conflict",
                "Calibration applicability start date is later than its end date.",
            );
        } else if (
            (start && observationDate < start) ||
            (end && observationDate > end)
        ) {
            addResult(
                results,
                "observationPeriod",
                "mismatch",
                "Observation date falls outside the calibration applicability period.",
            );
        } else {
            addResult(
                results,
                "observationPeriod",
                "matched",
                "Observation date falls within the calibration applicability period.",
            );
        }
    }

    // 13. Determine overall applicability.
    const hasMismatch = results.some(
        item => item.status === "mismatch",
    );

    const hasUnresolved = results.some(
        item => [
            "insufficient_information",
            "conflict",
        ].includes(item.status),
    );

    if (hasMismatch) {
        result.status = "not_applicable";
    } else if (hasUnresolved) {
        result.status = "insufficient_information";
    } else {
        result.status = "applicable";
    }

    // 14. Preserve explanations for unresolved dimensions.
    result.reasons = results
        .filter(item => [
            "mismatch",
            "insufficient_information",
            "conflict",
        ].includes(item.status))
        .map(item => `${item.dimension}: ${item.reason}`);

    return result;
}

module.exports = {
    SERVICE_VERSION,
    RESULT_STATUSES,
    evaluateCropConditionCalibrationApplicability,
};
