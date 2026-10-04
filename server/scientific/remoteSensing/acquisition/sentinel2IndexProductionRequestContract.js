"use strict";

// ============================================================
// AgriNexus GIS
// Sentinel-2 Index Production Request Contract
// Version 1.0
//
// Defines WHAT Sentinel-2 index production is requested.
// Sentinel-2 acquisition/provider mechanics remain outside
// this scientific request contract.
// ============================================================

const {
    hasIndexDefinition
} = require(
    "../indices/indexRegistry"
);

const SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "sourceId",
    "temporalContext",
    "spatialContext",
    "acquisitionParameters",
    "outputDirectory",
    "indexCode",
    "targetResolution",
    "outputNoData",
    "parameters"
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

function validateRequiredFields(value) {
    const errors = [];

    for (const field of REQUIRED_FIELDS) {
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

    for (const field of [
        "startDate",
        "endDate"
    ]) {
        if (
            value[field] === undefined ||
            value[field] === null
        ) {
            errors.push(
                `temporalContext.${field} is required.`
            );
        }
    }

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
        const start = new Date(
            value.startDate
        );

        const end = new Date(
            value.endDate
        );

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

    for (const field of [
        "west",
        "south",
        "east",
        "north"
    ]) {
        if (
            value.bbox[field] === undefined ||
            value.bbox[field] === null
        ) {
            errors.push(
                `spatialContext.bbox.${field} is required.`
            );
            continue;
        }

        if (!isFiniteNumber(value.bbox[field])) {
            errors.push(
                `spatialContext.bbox.${field} must be a finite number.`
            );
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

function validateIndexCode(value) {
    if (!isNonEmptyString(value)) {
        return [
            "indexCode must be a non-empty string."
        ];
    }

    const normalized =
        value.trim().toUpperCase();

    if (!hasIndexDefinition(normalized)) {
        return [
            `Unknown remote sensing index: ${normalized}.`
        ];
    }

    return [];
}

function validateSentinel2IndexProductionRequest(
    value
) {
    const errors = [];

    if (!isPlainObject(value)) {
        return {
            valid: false,
            errors: [
                "Sentinel-2 index production request must be an object."
            ]
        };
    }

    errors.push(
        ...validateRequiredFields(value)
    );

    if (
        value.contractVersion !== undefined &&
        value.contractVersion !==
            SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be ${SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION}.`
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

    errors.push(
        ...validateIndexCode(
            value.indexCode
        )
    );

    if (
        value.targetResolution === undefined ||
        value.targetResolution === null
    ) {
        // Already reported by required-field validation.
    } else if (
        !isFiniteNumber(value.targetResolution) ||
        value.targetResolution <= 0
    ) {
        errors.push(
            "targetResolution must be a positive finite number."
        );
    }

    if (
        value.outputNoData !== undefined &&
        value.outputNoData !== null &&
        !isFiniteNumber(value.outputNoData)
    ) {
        errors.push(
            "outputNoData must be a finite number."
        );
    }

    if (
        value.parameters !== undefined &&
        !isPlainObject(value.parameters)
    ) {
        errors.push(
            "parameters must be a plain object."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSentinel2IndexProductionRequestContract(
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
                  request.outputDirectory,
        indexCode:
            request &&
            isNonEmptyString(request.indexCode)
                ? request.indexCode.trim().toUpperCase()
                : request &&
                  request.indexCode,
        targetResolution:
            request &&
            isFiniteNumber(request.targetResolution)
                ? Number(
                    request.targetResolution
                )
                : request &&
                  request.targetResolution,
        parameters:
            request &&
            request.parameters !== undefined
                ? {
                    ...request.parameters
                }
                : request &&
                  request.parameters
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
        validateSentinel2IndexProductionRequest(
            normalized
        );

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid Sentinel-2 index production request."
        );

        error.code =
            "INVALID_SENTINEL2_INDEX_PRODUCTION_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return Object.freeze({
        ...normalized
    });
}

module.exports = {
    SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    validateSentinel2IndexProductionRequest,
    createSentinel2IndexProductionRequestContract
};

