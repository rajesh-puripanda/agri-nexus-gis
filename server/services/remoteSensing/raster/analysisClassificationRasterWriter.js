"use strict";

const fs = require("fs/promises");
const path = require("path");
const geotiff = require("geotiff");

const {
    createModelPixelScale,
    createModelTiepoint,
    createGeoKeyMetadata,
    normalizeOutputPath
} = require("./rasterOutputService");

const CLASSIFICATION_METHOD = "provisional_ndvi_bsi_evidence_rules";
const CLASS_CODES = new Set([0, 1, 2, 3]);

function validateRequest(request) {
    if (!request || typeof request !== "object") {
        throw new Error("request must be an object");
    }

    const { raster, classification, outputMetadata = {} } = request;

    if (!raster || typeof raster !== "object") {
        throw new Error("raster must be an object");
    }

    const { width, height, pixelCount, data, spatialReference, noData } = raster;

    if (
        !Number.isSafeInteger(width) || width <= 0 ||
        !Number.isSafeInteger(height) || height <= 0 ||
        !Number.isSafeInteger(pixelCount) ||
        pixelCount !== width * height
    ) {
        throw new Error("Raster dimensions and pixelCount are inconsistent");
    }

    if (!(data instanceof Uint8Array) || data.length !== pixelCount) {
        throw new Error("Classification data must be a Uint8Array matching pixelCount");
    }

    if (noData !== 0) {
        throw new Error("Analysis classification NoData must be 0");
    }

    for (let i = 0; i < data.length; i += 1) {
        if (!CLASS_CODES.has(data[i])) {
            throw new Error(`Unsupported classification code ${data[i]} at pixel ${i}`);
        }
    }

    if (
        !spatialReference ||
        !Array.isArray(spatialReference.origin) ||
        spatialReference.origin.length < 2 ||
        !Array.isArray(spatialReference.resolution) ||
        spatialReference.resolution.length < 2
    ) {
        throw new Error("Raster spatialReference must contain origin and resolution");
    }

    if (
        !spatialReference.origin.slice(0, 2).every(Number.isFinite) ||
        !spatialReference.resolution.slice(0, 2).every(Number.isFinite) ||
        spatialReference.resolution[0] === 0 ||
        spatialReference.resolution[1] === 0
    ) {
        throw new Error("Raster origin and resolution must be finite with non-zero resolution");
    }

    if (!classification || typeof classification !== "object") {
        throw new Error("classification metadata is required");
    }

    if (classification.method !== CLASSIFICATION_METHOD) {
        throw new Error(`classification.method must be ${CLASSIFICATION_METHOD}`);
    }

    if (classification.calibrationStatus !== "provisional_uncalibrated") {
        throw new Error("Classification must be marked provisional_uncalibrated");
    }

    if (
        typeof outputMetadata !== "object" ||
        outputMetadata === null
    ) {
        throw new Error("outputMetadata must be an object");
    }
}

function createAnalysisClassificationMetadata(request) {
    const { raster, classification, outputMetadata = {} } = request;
    const spatialReference = raster.spatialReference;

    const citation = {
        application: "AgriNexus GIS",
        analysisType: "remote_sensing_soil_vegetation_separation",
        outputType: "analysis_classification",
        method: classification.method,
        calibrationStatus: classification.calibrationStatus,
        noDataValue: 0,
        classes: [
            {
                code: 1,
                label: "vegetation_dominant_evidence",
                rule: "NDVI >= 0.5 AND BSI < 0.2"
            },
            {
                code: 2,
                label: "bare_soil_dominant_evidence",
                rule: "NDVI < 0.2 AND BSI >= 0.2"
            },
            {
                code: 3,
                label: "mixed_or_other_evidence",
                rule: "All other valid NDVI/BSI pairs"
            }
        ],
        timestamp: outputMetadata.timestamp || null,
        sourceType: raster.metadata?.sourceType || null
    };

    return {
        width: raster.width,
        height: raster.height,
        SamplesPerPixel: [1],
        BitsPerSample: [8],
        SampleFormat: [1],
        PlanarConfiguration: 1,
        PhotometricInterpretation: 1,
        ModelPixelScale: createModelPixelScale(spatialReference.resolution),
        ModelTiepoint: createModelTiepoint(spatialReference.origin),
        ...createGeoKeyMetadata(spatialReference.geoKeys),
        GDAL_NODATA: "0",
        GTCitationGeoKey: `AgriNexus GIS | ${JSON.stringify(citation)}`
    };
}

async function writeAnalysisClassificationRaster({ request, outputPath }) {
    validateRequest(request);

    const normalizedPath = normalizeOutputPath(outputPath);
    const basename = path.basename(normalizedPath, path.extname(normalizedPath));

    if (basename !== "soil_vegetation_classification") {
        throw new Error(
            "Output filename must be soil_vegetation_classification.tif or .tiff"
        );
    }

    const metadata = createAnalysisClassificationMetadata(request);
    const arrayBuffer = geotiff.writeArrayBuffer(request.raster.data, metadata);

    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
    await fs.writeFile(normalizedPath, Buffer.from(arrayBuffer));

    const stat = await fs.stat(normalizedPath);

    return {
        outputPath: normalizedPath,
        outputType: "analysis_classification",
        analysisType: "remote_sensing_soil_vegetation_separation",
        dataType: "Uint8",
        noData: 0,
        width: request.raster.width,
        height: request.raster.height,
        pixelCount: request.raster.pixelCount,
        byteLength: stat.size,
        format: "GeoTIFF",
        metadata: {
            method: request.classification.method,
            calibrationStatus: request.classification.calibrationStatus
        }
    };
}

module.exports = {
    CLASSIFICATION_METHOD,
    validateRequest,
    createAnalysisClassificationMetadata,
    writeAnalysisClassificationRaster
};
