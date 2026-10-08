"use strict";

// ============================================================
// server/scientific/remoteSensing/soilVegetation/
//     soilVegetationSeparationContract.js
// ============================================================
//
// AgriNexus GIS
//
// Soil / Vegetation Separation Contract
//
// Scientific principle:
//   NDVI = vegetation evidence
//   BSI  = bare-soil evidence
//
// This contract defines the evidence-comparison boundary.
// It does NOT:
//   - calculate NDVI or BSI
//   - define NDVI/BSI thresholds
//   - create crop-specific thresholds
//   - determine crop health
//   - determine soil fertility
//   - determine soil moisture
//   - create a new spectral index
//   - perform raster alignment/resampling
//
// Spatial compatibility must be established before pixelwise
// comparison.
//
// ============================================================

const SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION = "1.0";

const ANALYSIS_TYPE =
    "remote_sensing_soil_vegetation_separation";

const ANALYSIS_METHOD =
    "evidence_comparison";

const INTERPRETATION_MODE =
    "context_dependent";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function assertNonEmptyString(value, fieldName) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new Error(
            `${fieldName} must be a non-empty string.`
        );
    }
}

function assertRaster(raster, fieldName) {
    if (!isPlainObject(raster)) {
        throw new Error(
            `${fieldName} must be an object.`
        );
    }

    if (
        !Number.isInteger(raster.width) ||
        raster.width <= 0
    ) {
        throw new Error(
            `${fieldName}.width must be a positive integer.`
        );
    }

    if (
        !Number.isInteger(raster.height) ||
        raster.height <= 0
    ) {
        throw new Error(
            `${fieldName}.height must be a positive integer.`
        );
    }

    const expectedPixelCount =
        raster.width * raster.height;

    if (raster.pixelCount !== expectedPixelCount) {
        throw new Error(
            `${fieldName}.pixelCount must equal width * height.`
        );
    }

    if (
        !raster.bands ||
        !isPlainObject(raster.bands)
    ) {
        throw new Error(
            `${fieldName}.bands must be an object.`
        );
    }

    if (!isPlainObject(raster.spatialReference)) {
        throw new Error(
            `${fieldName}.spatialReference must be an object.`
        );
    }
}

function assertIndexRaster(
    raster,
    indexCode,
    fieldName
) {
    assertRaster(raster, fieldName);

    const band = raster.bands[indexCode];

    if (!band || typeof band !== "object") {
        throw new Error(
            `${fieldName} must contain band "${indexCode}".`
        );
    }

    if (
        !band.data ||
        typeof band.data.length !== "number"
    ) {
        throw new Error(
            `${fieldName} band "${indexCode}" must contain data.`
        );
    }

    if (
        band.data.length !== raster.pixelCount
    ) {
        throw new Error(
            `${fieldName} band "${indexCode}" data length must ` +
            `equal pixelCount.`
        );
    }
}

function assertSameArray(
    first,
    second,
    fieldName
) {
    if (
        !Array.isArray(first) ||
        !Array.isArray(second) ||
        first.length !== second.length
    ) {
        throw new Error(
            `${fieldName} must contain compatible arrays.`
        );
    }

    for (let index = 0; index < first.length; index += 1) {
        if (first[index] !== second[index]) {
            throw new Error(
                `${fieldName} mismatch at position ${index}.`
            );
        }
    }
}

function assertCompatibleSpatialReference(
    ndviRaster,
    bsiRaster
) {
    const ndviSpatial =
        ndviRaster.spatialReference;

    const bsiSpatial =
        bsiRaster.spatialReference;

    assertSameArray(
        ndviSpatial.origin,
        bsiSpatial.origin,
        "spatialReference.origin"
    );

    assertSameArray(
        ndviSpatial.resolution,
        bsiSpatial.resolution,
        "spatialReference.resolution"
    );

    assertSameArray(
        ndviSpatial.boundingBox,
        bsiSpatial.boundingBox,
        "spatialReference.boundingBox"
    );

    if (
        JSON.stringify(ndviSpatial.geoKeys) !==
        JSON.stringify(bsiSpatial.geoKeys)
    ) {
        throw new Error(
            "spatialReference.geoKeys mismatch between NDVI and BSI."
        );
    }
}

function validateSoilVegetationSeparationRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Request must be an object."
            ]
        };
    }

    if (
        request.contractVersion !==
        SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION
    ) {
        errors.push(
            "Unsupported soil/vegetation separation contract version."
        );
    }

    if (
        request.analysisType !==
        ANALYSIS_TYPE
    ) {
        errors.push(
            `analysisType must be "${ANALYSIS_TYPE}".`
        );
    }

    if (
        request.method !==
        ANALYSIS_METHOD
    ) {
        errors.push(
            `method must be "${ANALYSIS_METHOD}".`
        );
    }

    if (
        request.interpretationMode !==
        INTERPRETATION_MODE
    ) {
        errors.push(
            `interpretationMode must be "${INTERPRETATION_MODE}".`
        );
    }

    if (!isPlainObject(request.inputs)) {
        errors.push(
            "inputs must be an object."
        );
    }

    if (!isPlainObject(request.inputs?.ndvi)) {
        errors.push(
            "inputs.ndvi must be an object."
        );
    }

    if (!isPlainObject(request.inputs?.bsi)) {
        errors.push(
            "inputs.bsi must be an object."
        );
    }

    if (!isPlainObject(request.spatialContext)) {
        errors.push(
            "spatialContext must be an object."
        );
    }

    if (!isPlainObject(request.parameters)) {
        errors.push(
            "parameters must be an object."
        );
    }

    if (errors.length > 0) {
        return {
            valid: false,
            errors
        };
    }

    try {
        assertIndexRaster(
            request.inputs.ndvi.raster,
            "NDVI",
            "inputs.ndvi.raster"
        );

        assertIndexRaster(
            request.inputs.bsi.raster,
            "BSI",
            "inputs.bsi.raster"
        );

        if (
            request.inputs.ndvi.raster.width !==
            request.inputs.bsi.raster.width
        ) {
            throw new Error(
                "NDVI and BSI raster widths must match."
            );
        }

        if (
            request.inputs.ndvi.raster.height !==
            request.inputs.bsi.raster.height
        ) {
            throw new Error(
                "NDVI and BSI raster heights must match."
            );
        }

        if (
            request.inputs.ndvi.raster.pixelCount !==
            request.inputs.bsi.raster.pixelCount
        ) {
            throw new Error(
                "NDVI and BSI raster pixel counts must match."
            );
        }

        assertCompatibleSpatialReference(
            request.inputs.ndvi.raster,
            request.inputs.bsi.raster
        );
    } catch (error) {
        errors.push(error.message);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSoilVegetationSeparationResultContract({
    timestamp,
    inputs,
    spatialContext,
    parameters,
    results,
    statistics,
    metadata = {}
}) {
    if (
        typeof timestamp !== "string" ||
        timestamp.length === 0
    ) {
        throw new Error(
            "timestamp must be a non-empty string."
        );
    }

    if (!isPlainObject(inputs)) {
        throw new Error(
            "inputs must be an object."
        );
    }

    if (!isPlainObject(spatialContext)) {
        throw new Error(
            "spatialContext must be an object."
        );
    }

    if (!isPlainObject(parameters)) {
        throw new Error(
            "parameters must be an object."
        );
    }

    if (!isPlainObject(results)) {
        throw new Error(
            "results must be an object."
        );
    }

    if (!isPlainObject(statistics)) {
        throw new Error(
            "statistics must be an object."
        );
    }

    return {
        contractVersion:
            SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION,

        analysisType:
            ANALYSIS_TYPE,

        analysisVersion:
            SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION,

        timestamp,

        inputContext: {
            ndviIndexCode: "NDVI",
            bsiIndexCode: "BSI",
            inputs
        },

        spatialContext,

        parameters: {
            method: ANALYSIS_METHOD,
            interpretationMode: INTERPRETATION_MODE,
            ...parameters
        },

        results,

        statistics,

        metadata: {
            ...metadata,
            scientificNote:
                "NDVI and BSI are independent evidence layers. " +
                "Combined interpretation is context-dependent " +
                "and requires calibration for agricultural use."
        }
    };
}

module.exports = {
    SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION,
    ANALYSIS_TYPE,
    ANALYSIS_METHOD,
    INTERPRETATION_MODE,
    validateSoilVegetationSeparationRequest,
    createSoilVegetationSeparationResultContract
};
