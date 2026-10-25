"use strict";

const fs = require("fs/promises");
const path = require("path");
const geotiff = require("geotiff");

const {
    createModelPixelScale,
    createModelTiepoint,
    createGeoKeyMetadata,
    normalizeOutputPath
} = require("../raster/rasterOutputService");

const NO_DATA_VALUE = -9999;
const PRODUCT_CODE = "BARE_SOIL_FREQUENCY";
const OUTPUT_BASENAME = "BARE_SOIL_FREQUENCY";

function validateRequest(request) {
    if (!request || typeof request !== "object") {
        throw new Error("request must be an object");
    }

    const { raster, productMetadata } = request;

    if (!raster || typeof raster !== "object") {
        throw new Error("raster is required");
    }

    const { width, height, pixelCount, data, noData, spatialReference } = raster;

    if (
        !Number.isSafeInteger(width) || width <= 0 ||
        !Number.isSafeInteger(height) || height <= 0 ||
        pixelCount !== width * height
    ) {
        throw new Error("Raster dimensions and pixelCount are inconsistent");
    }

    if (!(data instanceof Float32Array) || data.length !== pixelCount) {
        throw new Error("Frequency data must be a Float32Array matching pixelCount");
    }

    if (noData !== NO_DATA_VALUE) {
        throw new Error(`Raster NoData must be ${NO_DATA_VALUE}`);
    }

    for (let i = 0; i < data.length; i += 1) {
        const value = data[i];

        if (value === NO_DATA_VALUE) continue;

        if (!Number.isFinite(value) || value < 0 || value > 100) {
            throw new Error(`Invalid bare-soil frequency value at pixel ${i}`);
        }
    }

    if (
        !spatialReference ||
        !Array.isArray(spatialReference.origin) ||
        !Array.isArray(spatialReference.resolution) ||
        !spatialReference.origin.slice(0, 2).every(Number.isFinite) ||
        !spatialReference.resolution.slice(0, 2).every(Number.isFinite) ||
        spatialReference.resolution[0] === 0 ||
        spatialReference.resolution[1] === 0
    ) {
        throw new Error("Valid spatialReference origin and resolution are required");
    }

    if (!spatialReference.geoKeys || typeof spatialReference.geoKeys !== "object") {
        throw new Error("SpatialReference geoKeys are required");
    }

    if (
        !productMetadata ||
        productMetadata.productCode !== PRODUCT_CODE ||
        productMetadata.units !== "percent" ||
        productMetadata.calibrationStatus !== "provisional_uncalibrated" ||
        !Number.isInteger(productMetadata.observationCount) ||
        productMetadata.observationCount < 2 ||
        !Array.isArray(productMetadata.observationDates) ||
        productMetadata.observationDates.length !== productMetadata.observationCount
    ) {
        throw new Error("Valid BARE_SOIL_FREQUENCY product metadata is required");
    }
}

function createMetadata(request) {
    const { raster, productMetadata } = request;

    const citation = {
        application: "AgriNexus GIS",
        analysisType: "temporal_bare_soil_frequency",
        productCode: PRODUCT_CODE,
        units: "percent",
        method: productMetadata.method,
        calibrationStatus: productMetadata.calibrationStatus,
        thresholds: productMetadata.thresholds,
        observationDates: productMetadata.observationDates,
        observationCount: productMetadata.observationCount,
        noDataValue: NO_DATA_VALUE
    };

    return {
        width: raster.width,
        height: raster.height,
        SamplesPerPixel: [1],
        BitsPerSample: [32],
        SampleFormat: [3],
        PlanarConfiguration: 1,
        PhotometricInterpretation: 1,
        ModelPixelScale: createModelPixelScale(raster.spatialReference.resolution),
        ModelTiepoint: createModelTiepoint(raster.spatialReference.origin),
        ...createGeoKeyMetadata(raster.spatialReference.geoKeys),
        GDAL_NODATA: String(NO_DATA_VALUE),
        GTCitationGeoKey: `AgriNexus GIS | ${JSON.stringify(citation)}`
    };
}

async function writeBareSoilFrequencyRaster({ request, outputPath }) {
    validateRequest(request);

    const normalizedPath = normalizeOutputPath(outputPath);
    const basename = path.basename(normalizedPath, path.extname(normalizedPath));

    if (basename !== OUTPUT_BASENAME) {
        throw new Error(
            "Output filename must be BARE_SOIL_FREQUENCY.tif or .tiff"
        );
    }

    const arrayBuffer = geotiff.writeArrayBuffer(
        request.raster.data,
        createMetadata(request)
    );

    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
    await fs.writeFile(normalizedPath, Buffer.from(arrayBuffer));

    const stat = await fs.stat(normalizedPath);

    return {
        outputPath: normalizedPath,
        outputType: "temporal_product",
        productCode: PRODUCT_CODE,
        dataType: "Float32",
        noData: NO_DATA_VALUE,
        width: request.raster.width,
        height: request.raster.height,
        pixelCount: request.raster.pixelCount,
        byteLength: stat.size,
        format: "GeoTIFF",
        metadata: {
            units: "percent",
            observationCount: request.productMetadata.observationCount,
            calibrationStatus: request.productMetadata.calibrationStatus
        }
    };
}

module.exports = {
    NO_DATA_VALUE,
    PRODUCT_CODE,
    validateRequest,
    createMetadata,
    writeBareSoilFrequencyRaster
};
