"use strict";

// ============================================================
// server/scientific/remoteSensing/acquisition/
// sentinel2PreparedRasterContract.js
// ============================================================
//
// AgriNexus GIS
//
// Sentinel-2 Prepared Raster Contract
//
// Defines the structural contract for Sentinel-2 spectral-band
// data prepared for consumption by the existing raster pipeline.
//
// This contract does NOT:
//   - decode JPEG2000
//   - calculate spectral indices
//   - classify pixels
//   - reproject rasters
//   - resample rasters
//   - perform scientific calculations
//
// Radiometric preparation is performed by the Sentinel-2
// acquisition/preparation service before this contract is created.
//
// ============================================================

const SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION = "1.0";

// Legacy compatibility export.
// The prepared raster contract now accepts arbitrary supported
// Sentinel-2 spectral bands rather than requiring only Red/NIR.
const PREPARED_BANDS = Object.freeze([
    "Red",
    "NIR"
]);

const DATA_TYPE = "Float32";

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "source",
    "sceneId",
    "acquisitionDate",
    "raster",
    "radiometry"
]);

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function assertFiniteNumber(value, fieldName) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new TypeError(
            `${fieldName} must be a finite number.`
        );
    }
}

function validateRequiredFields(
    object,
    fields,
    context
) {
    const errors = [];

    for (const field of fields) {
        if (
            !Object.prototype.hasOwnProperty.call(
                object,
                field
            )
        ) {
            errors.push(
                `${context} is missing required field: ${field}`
            );
        }
    }

    return errors;
}

function validateRaster(raster) {
    const errors = [];

    if (!isPlainObject(raster)) {
        return [
            "raster must be an object."
        ];
    }

    if (
        !Number.isInteger(raster.width) ||
        raster.width <= 0
    ) {
        errors.push(
            "raster.width must be a positive integer."
        );
    }

    if (
        !Number.isInteger(raster.height) ||
        raster.height <= 0
    ) {
        errors.push(
            "raster.height must be a positive integer."
        );
    }

    if (
        Number.isInteger(raster.width) &&
        Number.isInteger(raster.height)
    ) {
        const expectedPixelCount =
            raster.width *
            raster.height;

        if (
            raster.pixelCount !==
            expectedPixelCount
        ) {
            errors.push(
                "raster.pixelCount must equal " +
                "raster.width  raster.height."
            );
        }
    }

    if (
        !Number.isInteger(raster.pixelCount) ||
        raster.pixelCount <= 0
    ) {
        errors.push(
            "raster.pixelCount must be a positive integer."
        );
    }

    if (!isPlainObject(raster.bands)) {
        errors.push(
            "raster.bands must be an object."
        );
    } else {
        const bandNames =
            Object.keys(raster.bands);

        if (bandNames.length === 0) {
            errors.push(
                "raster.bands must contain at least one spectral band."
            );
        }

        for (const bandName of bandNames) {
            const band =
                raster.bands[bandName];

            if (!isPlainObject(band)) {
                errors.push(
                    `raster.bands.${bandName} must be an object.`
                );
                continue;
            }

            if (
                !(
                    Array.isArray(band.data) ||
                    ArrayBuffer.isView(band.data)
                )
            ) {
                errors.push(
                    `raster.bands.${bandName}.data must be an array or typed array.`
                );
            } else if (
                Number.isInteger(
                    raster.pixelCount
                ) &&
                band.data.length !==
                    raster.pixelCount
            ) {
                errors.push(
                    `raster.bands.${bandName}.data must contain exactly ${raster.pixelCount} pixels.`
                );
            }

            if (
                band.dataType !== DATA_TYPE
            ) {
                errors.push(
                    `raster.bands.${bandName}.dataType must be ${DATA_TYPE}.`
                );
            }
        }
    }

    if (
        !isPlainObject(
            raster.spatialReference
        )
    ) {
        errors.push(
            "raster.spatialReference must be an object."
        );
    }

    if (
        raster.noData !== undefined &&
        raster.noData !== null
    ) {
        assertFiniteNumber(
            raster.noData,
            "raster.noData"
        );
    }

    return errors;
}

function validateRadiometry(radiometry) {
    const errors = [];

    if (!isPlainObject(radiometry)) {
        return [
            "radiometry must be an object."
        ];
    }

    if (
        typeof radiometry.sourceDataType !==
        "string" ||
        !radiometry.sourceDataType.trim()
    ) {
        errors.push(
            "radiometry.sourceDataType must be a non-empty string."
        );
    }

    if (
        typeof radiometry.scale !== "number" ||
        !Number.isFinite(radiometry.scale)
    ) {
        errors.push(
            "radiometry.scale must be a finite number."
        );
    }

    if (
        typeof radiometry.offset !== "number" ||
        !Number.isFinite(radiometry.offset)
    ) {
        errors.push(
            "radiometry.offset must be a finite number."
        );
    }

    if (
        typeof radiometry.noData !== "number" ||
        !Number.isFinite(radiometry.noData)
    ) {
        errors.push(
            "radiometry.noData must be a finite number."
        );
    }

    if (
        radiometry.formula !==
        "physicalValue = DN * scale + offset"
    ) {
        errors.push(
            "radiometry.formula must document the declared DN-to-physical-value transformation."
        );
    }

    return errors;
}

function validateSentinel2PreparedRaster(
    raster
) {
    const errors = [];

    if (!isPlainObject(raster)) {
        return {
            valid: false,
            errors: [
                "prepared raster must be an object."
            ]
        };
    }

    errors.push(
        ...validateRequiredFields(
            raster,
            REQUIRED_FIELDS,
            "prepared raster"
        )
    );

    if (
        raster.contractVersion !==
        SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be ${SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION}.`
        );
    }

    if (!isPlainObject(raster.source)) {
        errors.push(
            "source must be an object."
        );
    } else {
        if (
            raster.source.id !==
            "sentinel2"
        ) {
            errors.push(
                'source.id must be "sentinel2".'
            );
        }

        if (
            typeof raster.source.provider !==
                "string" ||
            !raster.source.provider.trim()
        ) {
            errors.push(
                "source.provider must be a non-empty string."
            );
        }
    }

    if (
        typeof raster.sceneId !==
            "string" ||
        !raster.sceneId.trim()
    ) {
        errors.push(
            "sceneId must be a non-empty string."
        );
    }

    if (
        typeof raster.acquisitionDate !==
            "string" ||
        !raster.acquisitionDate.trim()
    ) {
        errors.push(
            "acquisitionDate must be a non-empty string."
        );
    }

    errors.push(
        ...validateRaster(
            raster.raster
        )
    );

    errors.push(
        ...validateRadiometry(
            raster.radiometry
        )
    );

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSentinel2PreparedRaster(
    input
) {
    const validation =
        validateSentinel2PreparedRaster(
            input
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid Sentinel-2 prepared raster: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_SENTINEL2_PREPARED_RASTER";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return {
        ...input,
        contractVersion:
            SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION
    };
}

module.exports = {
    SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION,
    PREPARED_BANDS,
    DATA_TYPE,
    validateSentinel2PreparedRaster,
    createSentinel2PreparedRaster
};
