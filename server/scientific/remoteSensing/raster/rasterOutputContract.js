"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/rasterOutputContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.4.1
// Raster Output Contract
//
// Defines the structural contract for exporting processed
// remote-sensing raster results.
//
// This contract does not calculate indices, classify pixels,
// reproject rasters, resample rasters, or write GeoTIFF files.
//
// Scientific calculations and classifications remain
// authoritative in their existing services.
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_OUTPUT_CONTRACT_VERSION = "1.0";

const OUTPUT_TYPES = [
    "continuous_index",
    "classification"
];

const DATA_TYPES = [
    "Float32",
    "Uint8"
];

const RESULT_REQUIRED_FIELDS = [
    "outputType",
    "indexCode",
    "raster",
    "outputMetadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeIndexCode(indexCode) {
    if (
        typeof indexCode !== "string" ||
        !indexCode.trim()
    ) {
        throw new Error(
            "indexCode must be a non-empty string"
        );
    }

    return indexCode.trim().toUpperCase();
}

function validateRequiredFields(object, fields, context) {
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

function validatePositiveInteger(value, name) {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        return [
            `${name} must be a positive integer`
        ];
    }

    return [];
}

function validatePixelData(data, pixelCount, name) {
    const errors = [];

    if (
        !Array.isArray(data) &&
        !ArrayBuffer.isView(data)
    ) {
        return [
            `${name} must be an array or typed array`
        ];
    }

    if (data.length !== pixelCount) {
        errors.push(
            `${name} contains ${data.length} pixels; expected ${pixelCount}`
        );
    }

    return errors;
}

function validateSpatialReference(spatialReference) {
    const errors = [];

    if (!isPlainObject(spatialReference)) {
        return [
            "raster.spatialReference must be an object"
        ];
    }

    const requiredFields = [
        "origin",
        "resolution",
        "boundingBox",
        "geoKeys"
    ];

    for (const field of requiredFields) {
        if (
            !Object.prototype.hasOwnProperty.call(
                spatialReference,
                field
            )
        ) {
            errors.push(
                `raster.spatialReference is missing required field: ${field}`
            );
        }
    }

    for (const field of [
        "origin",
        "resolution",
        "boundingBox"
    ]) {
        if (
            Object.prototype.hasOwnProperty.call(
                spatialReference,
                field
            )
        ) {
            const value = spatialReference[field];

            if (
                !Array.isArray(value) &&
                !ArrayBuffer.isView(value)
            ) {
                errors.push(
                    `raster.spatialReference.${field} must be an array or typed array`
                );
                continue;
            }

            if (value.length === 0) {
                errors.push(
                    `raster.spatialReference.${field} must not be empty`
                );
            }

            if (
                Array.from(value).some(
                    coordinate =>
                        typeof coordinate !== "number" ||
                        !Number.isFinite(coordinate)
                )
            ) {
                errors.push(
                    `raster.spatialReference.${field} must contain only finite numbers`
                );
            }
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            spatialReference,
            "geoKeys"
        ) &&
        !isPlainObject(spatialReference.geoKeys)
    ) {
        errors.push(
            "raster.spatialReference.geoKeys must be an object"
        );
    }

    return errors;
}

function validateNoData(noData) {
    if (noData === undefined || noData === null) {
        return [];
    }

    if (
        typeof noData !== "number" ||
        !Number.isFinite(noData)
    ) {
        return [
            "raster.noData must be a finite number when provided"
        ];
    }

    return [];
}

function validateRaster(
    raster,
    indexCode,
    outputType
) {
    const errors = [];

    if (!isPlainObject(raster)) {
        return ["raster must be an object"];
    }

    errors.push(
        ...validatePositiveInteger(
            raster.width,
            "raster.width"
        )
    );

    errors.push(
        ...validatePositiveInteger(
            raster.height,
            "raster.height"
        )
    );

    errors.push(
        ...validatePositiveInteger(
            raster.pixelCount,
            "raster.pixelCount"
        )
    );

    if (
        Number.isInteger(raster.width) &&
        raster.width > 0 &&
        Number.isInteger(raster.height) &&
        raster.height > 0 &&
        Number.isInteger(raster.pixelCount) &&
        raster.pixelCount !==
            raster.width * raster.height
    ) {
        errors.push(
            `raster.pixelCount ${raster.pixelCount} does not match width  height ${raster.width * raster.height}`
        );
    }

    if (!isPlainObject(raster.bands)) {
        errors.push(
            "raster.bands must be an object"
        );
    } else {
        const band = raster.bands[indexCode];

        if (!band) {
            errors.push(
                `raster is missing output band: ${indexCode}`
            );
        } else if (!isPlainObject(band)) {
            errors.push(
                `raster output band ${indexCode} must be an object`
            );
        } else {
            if (band.data === undefined) {
                errors.push(
                    `raster output band ${indexCode} is missing data`
                );
            } else if (
                Number.isInteger(raster.pixelCount)
            ) {
                errors.push(
                    ...validatePixelData(
                        band.data,
                        raster.pixelCount,
                        `raster output band ${indexCode}.data`
                    )
                );
            }

            if (
                typeof band.dataType !== "string" ||
                !DATA_TYPES.includes(band.dataType)
            ) {
                errors.push(
                    `raster output band ${indexCode}.dataType must be one of: ${DATA_TYPES.join(", ")}`
                );
            }

            const expectedDataType =
                outputType === "continuous_index"
                    ? "Float32"
                    : "Uint8";

            if (
                typeof band.dataType === "string" &&
                band.dataType !== expectedDataType
            ) {
                errors.push(
                    `raster output band ${indexCode}.dataType must be ${expectedDataType} for outputType ${outputType}`
                );
            }
        }
    }

    errors.push(
        ...validateNoData(raster.noData)
    );

    errors.push(
        ...validateSpatialReference(
            raster.spatialReference
        )
    );

    if (
        raster.metadata !== undefined &&
        !isPlainObject(raster.metadata)
    ) {
        errors.push(
            "raster.metadata must be an object when provided"
        );
    }

    return errors;
}

function validateClassificationOutput(
    classification
) {
    const errors = [];

    if (!isPlainObject(classification)) {
        return [
            "classification must be an object for classification output"
        ];
    }

    if (
        typeof classification.method !== "string" ||
        !classification.method.trim()
    ) {
        errors.push(
            "classification.method must be a non-empty string"
        );
    }

    if (!Array.isArray(
        classification.classDefinitions
    )) {
        errors.push(
            "classification.classDefinitions must be an array"
        );
    } else if (
        classification.classDefinitions.length === 0
    ) {
        errors.push(
            "classification.classDefinitions must not be empty"
        );
    }

    return errors;
}

function validateOutputMetadata(outputMetadata) {
    if (!isPlainObject(outputMetadata)) {
        return [
            "outputMetadata must be an object"
        ];
    }

    return [];
}

function validateRasterOutputRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: ["request must be an object"],
            outputType: null,
            indexCode: null,
            definition: null
        };
    }

    errors.push(
        ...validateRequiredFields(
            request,
            RESULT_REQUIRED_FIELDS,
            "request"
        )
    );

    let outputType = null;
    let indexCode = null;
    let definition = null;

    if (
        typeof request.outputType !== "string" ||
        !request.outputType.trim()
    ) {
        errors.push(
            "outputType must be a non-empty string"
        );
    } else {
        outputType =
            request.outputType.trim().toLowerCase();

        if (!OUTPUT_TYPES.includes(outputType)) {
            errors.push(
                `Unsupported raster output type: ${outputType}`
            );
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            request,
            "indexCode"
        )
    ) {
        try {
            indexCode =
                normalizeIndexCode(request.indexCode);
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (indexCode) {
        definition =
            getIndexDefinition(indexCode);

        if (!definition) {
            errors.push(
                `Unknown remote sensing index: ${indexCode}`
            );
        }
    }

    if (
        request.raster !== undefined &&
        outputType &&
        indexCode
    ) {
        errors.push(
            ...validateRaster(
                request.raster,
                indexCode,
                outputType
            )
        );
    }

    if (
        outputType === "classification"
    ) {
        errors.push(
            ...validateClassificationOutput(
                request.classification
            )
        );
    } else if (
        request.classification !== undefined &&
        !isPlainObject(request.classification)
    ) {
        errors.push(
            "classification must be an object when provided"
        );
    }

    if (
        request.outputMetadata !== undefined
    ) {
        errors.push(
            ...validateOutputMetadata(
                request.outputMetadata
            )
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        outputType,
        indexCode,
        definition
    };
}

function validateRasterOutputResult(result) {
    const validation =
        validateRasterOutputRequest(result);

    return validation;
}

module.exports = {
    RASTER_OUTPUT_CONTRACT_VERSION,
    OUTPUT_TYPES,
    DATA_TYPES,
    validateRasterOutputRequest,
    validateRasterOutputResult
};
