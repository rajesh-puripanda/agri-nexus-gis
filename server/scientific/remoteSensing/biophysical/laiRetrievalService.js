"use strict";

const LAI_MODEL_VERSION = "1.0";

function assertModel(model) {
    if (!model || typeof model !== "object") {
        throw new TypeError("An explicit LAI model configuration is required.");
    }

    for (const field of ["id", "name", "source", "vegetationScope"]) {
        if (typeof model[field] !== "string" || !model[field].trim()) {
            throw new TypeError(`Model ${field} is required.`);
        }
    }

    if (!["provisional_uncalibrated", "calibrated"].includes(
        model.calibrationStatus
    )) {
        throw new Error("Invalid model calibrationStatus.");
    }

    const p = model.parameters;

    if (!p || typeof p !== "object") {
        throw new TypeError("Model parameters are required.");
    }

    const { ndviBackground, ndviAsymptote, extinctionCoefficient } = p;

    if (
        !Number.isFinite(ndviBackground) ||
        !Number.isFinite(ndviAsymptote) ||
        ndviBackground < -1 ||
        ndviAsymptote > 1 ||
        ndviBackground >= ndviAsymptote
    ) {
        throw new RangeError("Invalid NDVI background/asymptote parameters.");
    }

    if (
        !Number.isFinite(extinctionCoefficient) ||
        extinctionCoefficient <= 0
    ) {
        throw new RangeError("extinctionCoefficient must be positive.");
    }
}

function retrieveLaiFromNdvi({ ndviRaster, model } = {}) {
    assertModel(model);

    if (!ndviRaster || typeof ndviRaster !== "object") {
        throw new TypeError("NDVI raster is required.");
    }

    const { width, height, data } = ndviRaster;
    const pixelCount = width * height;

    if (
        !Number.isSafeInteger(pixelCount) ||
        width <= 0 ||
        height <= 0 ||
        !Number.isInteger(width) ||
        !Number.isInteger(height)
    ) {
        throw new RangeError("Invalid NDVI raster dimensions.");
    }

    if (
        !data ||
        typeof data.length !== "number" ||
        data.length !== pixelCount
    ) {
        throw new Error("NDVI data length must match raster dimensions.");
    }

    const noData = ndviRaster.noData ?? -9999;

    if (!Number.isFinite(noData)) {
        throw new TypeError("NDVI NoData must be finite.");
    }

    const {
        ndviBackground,
        ndviAsymptote,
        extinctionCoefficient
    } = model.parameters;

    const laiData = new Float32Array(pixelCount);
    laiData.fill(noData);

    let validPixelCount = 0;
    let excludedPixelCount = 0;

    for (let i = 0; i < pixelCount; i++) {
        const ndvi = data[i];

        if (
            !Number.isFinite(ndvi) ||
            ndvi === noData ||
            ndvi < -1 ||
            ndvi > 1 ||
            ndvi < ndviBackground ||
            ndvi >= ndviAsymptote
        ) {
            excludedPixelCount++;
            continue;
        }

        const ratio =
            (ndviAsymptote - ndvi) /
            (ndviAsymptote - ndviBackground);

        const lai = -Math.log(ratio) / extinctionCoefficient;

        if (!Number.isFinite(lai) || lai < 0) {
            excludedPixelCount++;
            continue;
        }

        laiData[i] = lai;
        validPixelCount++;
    }

    return {
        productCode: "LAI",
        modelVersion: LAI_MODEL_VERSION,
        width,
        height,
        pixelCount,
        data: laiData,
        noData,
        spatialReference: ndviRaster.spatialReference,
        metadata: {
            modelId: model.id,
            modelName: model.name,
            equation:
                "-ln((NDVIasymptote - NDVI) / " +
                "(NDVIasymptote - NDVIbackground)) / extinctionCoefficient",
            parameters: { ...model.parameters },
            source: model.source,
            vegetationScope: model.vegetationScope,
            calibrationStatus: model.calibrationStatus,
            inputProduct: "NDVI",
            validPixelCount,
            excludedPixelCount
        }
    };
}

module.exports = {
    LAI_MODEL_VERSION,
    retrieveLaiFromNdvi
};
