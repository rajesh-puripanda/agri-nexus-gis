"use strict";

// ============================================================
// AgriNexus GIS
// Satellite Acquisition Request Contract
// Version 1.0
//
// Defines WHAT satellite imagery is requested.
// Provider/API/authentication mechanics remain outside
// this scientific request contract.
// ============================================================

const ACQUISITION_REQUEST_CONTRACT_VERSION = "1.0";

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "sourceId",
    "temporalContext",
    "spatialContext",
    "acquisitionParameters",
    "outputDirectory"
]);

const REQUIRED_TEMPORAL_FIELDS = Object.freeze([
    "startDate",
    "endDate"
]);

const REQUIRED_BBOX_FIELDS = Object.freeze([
    "west",
    "south",
    "east",
    "north"
]);

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isFiniteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function validateRequiredFields(value, fields) {
    const errors = [];

    for (const field of fields) {
        if (
            value[field] === undefined ||
            value[field] === null
        ) {
            errors.push(
                `${field} is required.`
            );
        }
    }

    return errors;
}

function validateDateString(value, fieldName) {
    if (!isNonEmptyString(value)) {
        return `${fieldName} must be a non-empty string.`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return `${fieldName} must be a valid date.`;
    }

    return null;
}

function validateTemporalContext(value) {
    const errors = [];

    if (!isPlainObject(value)) {
        return [
            "temporalContext must be an object."
        ];
    }

    errors.push(
        ...validateRequiredFields(
            value,
            REQUIRED_TEMPORAL_FIELDS
        )
    );

    if (value.startDate !== undefined) {
        const error = validateDateString(
            value.startDate,
            "temporalContext.startDate"
        );

        if (error) {
            errors.push(error);
        }
    }

    if (value.endDate !== undefined) {
        const error = validateDateString(
            value.endDate,
            "temporalContext.endDate"
        );

        if (error) {
            errors.push(error);
        }
    }

    if (
        isNonEmptyString(value.startDate) &&
        isNonEmptyString(value.endDate)
    ) {
        const start = new Date(value.startDate);
        const end = new Date(value.endDate);

        if (start > end) {
            errors.push(
                "temporalContext.startDate must not be later than endDate."
            );
        }
    }

    return errors;
}

function validateSpatialContext(value) {
    const errors = [];

    if (!isPlainObject(value)) {
        return [
            "spatialContext must be an object."
        ];
    }

    if (!isPlainObject(value.bbox)) {
        return [
            "spatialContext.bbox must be an object."
        ];
    }

    errors.push(
        ...validateRequiredFields(
            value.bbox,
            REQUIRED_BBOX_FIELDS
        ).map(
            (error) =>
                `spatialContext.${error}`
        )
    );

    for (const field of REQUIRED_BBOX_FIELDS) {
        if (value.bbox[field] !== undefined) {
            if (!isFiniteNumber(value.bbox[field])) {
                errors.push(
                    `spatialContext.bbox.${field} must be a finite number.`
                );
            }
        }
    }

    if (
        isFiniteNumber(value.bbox.west) &&
        isFiniteNumber(value.bbox.east) &&
        value.bbox.west >= value.bbox.east
    ) {
        errors.push(
            "spatialContext.bbox.west must be less than east."
        );
    }

    if (
        isFiniteNumber(value.bbox.south) &&
        isFiniteNumber(value.bbox.north) &&
        value.bbox.south >= value.bbox.north
    ) {
        errors.push(
            "spatialContext.bbox.south must be less than north."
        );
    }

    if (
        isFiniteNumber(value.bbox.west) &&
        (
            value.bbox.west < -180 ||
            value.bbox.west > 180
        )
    ) {
        errors.push(
            "spatialContext.bbox.west must be between -180 and 180."
        );
    }

    if (
        isFiniteNumber(value.bbox.east) &&
        (
            value.bbox.east < -180 ||
            value.bbox.east > 180
        )
    ) {
        errors.push(
            "spatialContext.bbox.east must be between -180 and 180."
        );
    }

    if (
        isFiniteNumber(value.bbox.south) &&
        (
            value.bbox.south < -90 ||
            value.bbox.south > 90
        )
    ) {
        errors.push(
            "spatialContext.bbox.south must be between -90 and 90."
        );
    }

    if (
        isFiniteNumber(value.bbox.north) &&
        (
            value.bbox.north < -90 ||
            value.bbox.north > 90
        )
    ) {
        errors.push(
            "spatialContext.bbox.north must be between -90 and 90."
        );
    }

    return errors;
}

function validateAcquisitionParameters(value) {
    const errors = [];

    if (!isPlainObject(value)) {
        return [
            "acquisitionParameters must be an object."
        ];
    }

    if (value.maxCloudCover !== undefined) {
        if (
            !isFiniteNumber(value.maxCloudCover) ||
            value.maxCloudCover < 0 ||
            value.maxCloudCover > 100
        ) {
            errors.push(
                "acquisitionParameters.maxCloudCover must be a number between 0 and 100."
            );
        }
    }

    if (value.bands !== undefined) {
        if (!Array.isArray(value.bands)) {
            errors.push(
                "acquisitionParameters.bands must be an array."
            );
        } else {
            for (const band of value.bands) {
                if (!isNonEmptyString(band)) {
                    errors.push(
                        "acquisitionParameters.bands must contain only non-empty strings."
                    );
                    break;
                }
            }
        }
    }

    return errors;
}

function validateSatelliteAcquisitionRequest(value) {
    const errors = [];

    if (!isPlainObject(value)) {
        return {
            valid: false,
            errors: [
                "Satellite acquisition request must be an object."
            ]
        };
    }

    errors.push(
        ...validateRequiredFields(
            value,
            REQUIRED_FIELDS
        )
    );

    if (
        value.contractVersion !== undefined &&
        value.contractVersion !==
            ACQUISITION_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be ${ACQUISITION_REQUEST_CONTRACT_VERSION}.`
        );
    }

    if (
        value.sourceId !== undefined &&
        !isNonEmptyString(value.sourceId)
    ) {
        errors.push(
            "sourceId must be a non-empty string."
        );
    }

    errors.push(
        ...validateTemporalContext(
            value.temporalContext
        )
    );

    errors.push(
        ...validateSpatialContext(
            value.spatialContext
        )
    );

    errors.push(
        ...validateAcquisitionParameters(
            value.acquisitionParameters
        )
    );

    if (
        value.outputDirectory !== undefined &&
        !isNonEmptyString(value.outputDirectory)
    ) {
        errors.push(
            "outputDirectory must be a non-empty string."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSatelliteAcquisitionRequestContract(
    request
) {
    const normalized = {
        ...request,
        contractVersion:
            request &&
            request.contractVersion !== undefined
                ? String(
                    request.contractVersion
                ).trim()
                : request &&
                  request.contractVersion,
        sourceId:
            request &&
            isNonEmptyString(request.sourceId)
                ? request.sourceId.trim()
                : request &&
                  request.sourceId,
        outputDirectory:
            request &&
            isNonEmptyString(request.outputDirectory)
                ? request.outputDirectory.trim()
                : request &&
                  request.outputDirectory
    };

    if (isPlainObject(normalized.temporalContext)) {
        normalized.temporalContext = {
            ...normalized.temporalContext,
            startDate:
                isNonEmptyString(
                    normalized.temporalContext.startDate
                )
                    ? normalized.temporalContext.startDate.trim()
                    : normalized.temporalContext.startDate,
            endDate:
                isNonEmptyString(
                    normalized.temporalContext.endDate
                )
                    ? normalized.temporalContext.endDate.trim()
                    : normalized.temporalContext.endDate
        };
    }

    const validation =
        validateSatelliteAcquisitionRequest(
            normalized
        );

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid satellite acquisition request."
        );

        error.code =
            "INVALID_SATELLITE_ACQUISITION_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return Object.freeze({
        ...normalized
    });
}

module.exports = {
    ACQUISITION_REQUEST_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    REQUIRED_TEMPORAL_FIELDS,
    REQUIRED_BBOX_FIELDS,
    validateSatelliteAcquisitionRequest,
    createSatelliteAcquisitionRequestContract
};
