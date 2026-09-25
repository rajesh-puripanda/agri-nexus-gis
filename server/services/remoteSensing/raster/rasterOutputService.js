"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterOutputService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.4.2
// Raster Output / GeoTIFF Writer Service
//
// Responsibilities:
//   - Validate raster output contract
//   - Convert canonical raster spatial metadata to GeoTIFF tags
//   - Write continuous Float32 index rasters
//   - Write Uint8 classification rasters
//   - Preserve NoData
//   - Preserve CRS / GeoKeys
//   - Preserve analytical metadata through GTCitationGeoKey
//   - Perform no scientific recalculation
//   - Perform no resampling or reprojection
//
// ============================================================

const fs = require("fs/promises");
const path = require("path");
const geotiff = require("geotiff");

const {
    validateRasterOutputRequest
} = require("../../../scientific/remoteSensing/raster/rasterOutputContract");

const SUPPORTED_OUTPUT_TYPES = [
    "continuous_index",
    "classification"
];

const DATA_TYPE_TO_SAMPLE_FORMAT = {
    Float32: 3,
    Uint8: 1
};

function assertNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
}

function normalizeOutputPath(outputPath) {
    assertNonEmptyString(outputPath, "outputPath");

    const extension = path.extname(outputPath).toLowerCase();

    if (extension !== ".tif" && extension !== ".tiff") {
        throw new Error("outputPath must use .tif or .tiff extension");
    }

    return path.resolve(outputPath);
}

function getOutputBand(raster, indexCode) {
    const band = raster.bands[indexCode];

    if (!band) {
        throw new Error(`Raster output band ${indexCode} is missing`);
    }

    return band;
}

function createModelPixelScale(resolution) {
    const [x, y] = resolution;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("Raster resolution must contain finite values");
    }

    return [
        Math.abs(x),
        Math.abs(y),
        0
    ];
}

function createModelTiepoint(origin) {
    const [x, y, z = 0] = origin;

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
    ) {
        throw new Error("Raster origin must contain finite values");
    }

    return [
        0,
        0,
        0,
        x,
        y,
        z
    ];
}

function createGeoKeyMetadata(geoKeys) {
    if (!geoKeys || typeof geoKeys !== "object") {
        throw new Error("Raster geoKeys must be an object");
    }

    const metadata = {};

    for (const [key, value] of Object.entries(geoKeys)) {
        if (!key.endsWith("GeoKey")) {
            continue;
        }

        if (
            typeof value !== "number" &&
            typeof value !== "string"
        ) {
            throw new Error(
                `GeoKey ${key} must contain a number or string value`
            );
        }

        metadata[key] = value;
    }

    if (
        !Object.prototype.hasOwnProperty.call(metadata, "GeographicTypeGeoKey") &&
        !Object.prototype.hasOwnProperty.call(metadata, "ProjectedCSTypeGeoKey")
    ) {
        throw new Error(
            "Raster geoKeys must contain GeographicTypeGeoKey or ProjectedCSTypeGeoKey"
        );
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "GTModelTypeGeoKey")) {
        metadata.GTModelTypeGeoKey =
            Object.prototype.hasOwnProperty.call(
                metadata,
                "ProjectedCSTypeGeoKey"
            )
                ? 1
                : 2;
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "GTRasterTypeGeoKey")) {
        metadata.GTRasterTypeGeoKey = 1;
    }

    return metadata;
}

function createAnalyticalCitation({
    outputType,
    indexCode,
    outputMetadata,
    raster
}) {
    const analyticalMetadata = {
        application: "AgriNexus GIS",
        outputType,
        indexCode,
        indexName: outputMetadata.indexName || null,
        processingType: outputMetadata.processingType || null,
        analysisVersion: outputMetadata.analysisVersion || null,
        sourceRasterContractVersion:
            outputMetadata.sourceRasterContractVersion || null,
        classificationMethod:
            outputMetadata.classificationMethod || null,
        timestamp: outputMetadata.timestamp || null,
        sourceType:
            raster.metadata?.sourceType || null
    };

    return `AgriNexus GIS | ${JSON.stringify(analyticalMetadata)}`;
}

function createWriterMetadata(request) {
    const {
        outputType,
        indexCode,
        raster,
        outputMetadata = {}
    } = request;

    const band = getOutputBand(raster, indexCode);

    const writerMetadata = {
        width: raster.width,
        height: raster.height,

        SamplesPerPixel: [1],
        BitsPerSample: [band.dataType === "Float32" ? 32 : 8],
        SampleFormat: [
            DATA_TYPE_TO_SAMPLE_FORMAT[band.dataType]
        ],

        PlanarConfiguration: 1,
        PhotometricInterpretation: 1,

        ModelPixelScale:
            createModelPixelScale(raster.spatialReference.resolution),

        ModelTiepoint:
            createModelTiepoint(raster.spatialReference.origin),

        ...createGeoKeyMetadata(
            raster.spatialReference.geoKeys
        ),

        GTCitationGeoKey:
            createAnalyticalCitation({
                outputType,
                indexCode,
                outputMetadata,
                raster
            })
    };

    if (raster.noData !== undefined && raster.noData !== null) {
        writerMetadata.GDAL_NODATA = String(raster.noData);
    }

    return writerMetadata;
}

function validateOutputPathMatchesIndex(outputPath, indexCode, outputType) {
    const base = path.basename(outputPath, path.extname(outputPath));

    const expectedSuffix =
        outputType === "continuous_index"
            ? "_index"
            : "_classification";

    const expected =
        `${indexCode}${expectedSuffix}`.toLowerCase();

    if (base.toLowerCase() !== expected) {
        throw new Error(
            `Output filename must be ${indexCode}${expectedSuffix}.tif or .tiff`
        );
    }
}

async function writeRasterOutput({
    request,
    outputPath
}) {
    const validation =
        validateRasterOutputRequest(request);

    if (!validation.valid) {
        throw new Error(
            `Invalid raster output request: ${validation.errors.join("; ")}`
        );
    }

    if (!SUPPORTED_OUTPUT_TYPES.includes(request.outputType)) {
        throw new Error(
            `Unsupported raster output type: ${request.outputType}`
        );
    }

    const normalizedPath =
        normalizeOutputPath(outputPath);

    validateOutputPathMatchesIndex(
        normalizedPath,
        request.indexCode,
        request.outputType
    );

    const band =
        getOutputBand(
            request.raster,
            request.indexCode
        );

    const writerMetadata =
        createWriterMetadata(request);

    const arrayBuffer =
        geotiff.writeArrayBuffer(
            band.data,
            writerMetadata
        );

    await fs.mkdir(
        path.dirname(normalizedPath),
        { recursive: true }
    );

    await fs.writeFile(
        normalizedPath,
        Buffer.from(arrayBuffer)
    );

    const stat =
        await fs.stat(normalizedPath);

    return {
        outputPath: normalizedPath,
        outputType: request.outputType,
        indexCode: request.indexCode,
        dataType: band.dataType,
        width: request.raster.width,
        height: request.raster.height,
        pixelCount: request.raster.pixelCount,
        byteLength: stat.size,
        format: "GeoTIFF",
        metadata: {
            writer: "geotiff"
        }
    };
}

module.exports = {
    SUPPORTED_OUTPUT_TYPES,
    DATA_TYPE_TO_SAMPLE_FORMAT,
    createModelPixelScale,
    createModelTiepoint,
    createGeoKeyMetadata,
    createAnalyticalCitation,
    createWriterMetadata,
    normalizeOutputPath,
    writeRasterOutput
};


