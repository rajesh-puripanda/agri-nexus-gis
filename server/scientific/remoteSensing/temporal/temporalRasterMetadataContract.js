"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalRasterMetadataContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.2  Temporal Raster Metadata Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the structural metadata required to identify and
// establish spatial characteristics of a raster observation
// used in temporal remote-sensing analysis.
//
// This module performs structural validation only.
//
// It does NOT:
//   - resample rasters
//   - reproject rasters
//   - align rasters
//   - calculate indices
//   - compare dates
//   - calculate trends
//   - detect change
//   - perform interpolation
// ============================================================

const TEMPORAL_RASTER_METADATA_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "rasterId",
    "sourcePath",
    "width",
    "height",
    "pixelCount",
    "bandCount",
    "spatialReference",
    "acquisitionContext",
    "processingContext"
];

const OPTIONAL_FIELDS = [
    "noData",
    "bandMapping",
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isFiniteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function validateRequiredString(
    value,
    fieldName,
    errors
) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        errors.push(
            `${fieldName} must be a non-empty string.`
        );
    }
}

function validatePositiveInteger(
    value,
    fieldName,
    errors
) {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        errors.push(
            `${fieldName} must be a positive integer.`
        );
    }
}

function validateSpatialReference(
    spatialReference,
    errors
) {
    if (
        !isPlainObject(spatialReference)
    ) {
        errors.push(
            "spatialReference must be a plain object."
        );

        return;
    }

    validateRequiredString(
        spatialReference.crs,
        "spatialReference.crs",
        errors
    );

    if (
        !Array.isArray(
            spatialReference.origin
        ) ||
        spatialReference.origin.length !== 2 ||
        !spatialReference.origin.every(
            isFiniteNumber
        )
    ) {
        errors.push(
            "spatialReference.origin must contain two finite numeric values."
        );
    }

    if (
        !isPlainObject(
            spatialReference.resolution
        )
    ) {
        errors.push(
            "spatialReference.resolution must be a plain object."
        );
    } else {
        if (
            !isFiniteNumber(
                spatialReference.resolution.x
            ) ||
            spatialReference.resolution.x <= 0
        ) {
            errors.push(
                "spatialReference.resolution.x must be a positive finite number."
            );
        }

        if (
            !isFiniteNumber(
                spatialReference.resolution.y
            ) ||
            spatialReference.resolution.y <= 0
        ) {
            errors.push(
                "spatialReference.resolution.y must be a positive finite number."
            );
        }
    }

    if (
        !Array.isArray(
            spatialReference.boundingBox
        ) ||
        spatialReference.boundingBox.length !== 4 ||
        !spatialReference.boundingBox.every(
            isFiniteNumber
        )
    ) {
        errors.push(
            "spatialReference.boundingBox must contain four finite numeric values."
        );
    }
}

function validateOptionalNoData(
    noData,
    errors
) {
    if (
        noData !== undefined &&
        !isFiniteNumber(noData)
    ) {
        errors.push(
            "noData must be a finite number when provided."
        );
    }
}

function validateOptionalBandMapping(
    bandMapping,
    errors
) {
    if (
        bandMapping !== undefined &&
        !isPlainObject(bandMapping)
    ) {
        errors.push(
            "bandMapping must be a plain object when provided."
        );
    }
}

function validateContextObject(
    value,
    fieldName,
    errors
) {
    if (!isPlainObject(value)) {
        errors.push(
            `${fieldName} must be a plain object.`
        );
    }
}

function validateOptionalMetadata(
    metadata,
    errors
) {
    if (
        metadata !== undefined &&
        !isPlainObject(metadata)
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }
}

function validateTemporalRasterMetadata(
    metadataContract
) {
    const errors = [];

    if (
        !isPlainObject(metadataContract)
    ) {
        return {
            valid: false,
            errors: [
                "metadataContract must be a plain object."
            ]
        };
    }

    for (
        const field
        of REQUIRED_FIELDS
    ) {
        if (
            metadataContract[field] ===
                undefined ||
            metadataContract[field] ===
                null
        ) {
            errors.push(
                `${field} is required.`
            );
        }
    }

    if (
        metadataContract.contractVersion !==
        TEMPORAL_RASTER_METADATA_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be '${TEMPORAL_RASTER_METADATA_CONTRACT_VERSION}'.`
        );
    }

    validateRequiredString(
        metadataContract.rasterId,
        "rasterId",
        errors
    );

    validateRequiredString(
        metadataContract.sourcePath,
        "sourcePath",
        errors
    );

    validatePositiveInteger(
        metadataContract.width,
        "width",
        errors
    );

    validatePositiveInteger(
        metadataContract.height,
        "height",
        errors
    );

    validatePositiveInteger(
        metadataContract.pixelCount,
        "pixelCount",
        errors
    );

    if (
        Number.isInteger(
            metadataContract.width
        ) &&
        Number.isInteger(
            metadataContract.height
        ) &&
        Number.isInteger(
            metadataContract.pixelCount
        ) &&
        metadataContract.width > 0 &&
        metadataContract.height > 0 &&
        metadataContract.pixelCount !==
            metadataContract.width *
            metadataContract.height
    ) {
        errors.push(
            "pixelCount must equal width * height."
        );
    }

    validatePositiveInteger(
        metadataContract.bandCount,
        "bandCount",
        errors
    );

    validateSpatialReference(
        metadataContract.spatialReference,
        errors
    );

    validateOptionalNoData(
        metadataContract.noData,
        errors
    );

    validateOptionalBandMapping(
        metadataContract.bandMapping,
        errors
    );

    validateContextObject(
        metadataContract.acquisitionContext,
        "acquisitionContext",
        errors
    );

    validateContextObject(
        metadataContract.processingContext,
        "processingContext",
        errors
    );

    validateOptionalMetadata(
        metadataContract.metadata,
        errors
    );

    return {
        valid: errors.length === 0,
        errors
    };
}

function createTemporalRasterMetadataContract({
    rasterId,
    sourcePath,
    width,
    height,
    pixelCount,
    bandCount,
    spatialReference,
    noData,
    bandMapping,
    acquisitionContext,
    processingContext,
    metadata
}) {
    const result = {
        contractVersion:
            TEMPORAL_RASTER_METADATA_CONTRACT_VERSION,
        rasterId,
        sourcePath,
        width,
        height,
        pixelCount,
        bandCount,
        spatialReference,
        acquisitionContext,
        processingContext
    };

    if (noData !== undefined) {
        result.noData = noData;
    }

    if (bandMapping !== undefined) {
        result.bandMapping = bandMapping;
    }

    if (metadata !== undefined) {
        result.metadata = metadata;
    }

    const validation =
        validateTemporalRasterMetadata(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal raster metadata: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_RASTER_METADATA";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_RASTER_METADATA_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalRasterMetadata,
    createTemporalRasterMetadataContract
};
