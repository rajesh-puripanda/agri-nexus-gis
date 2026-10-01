"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 Prepared Raster Writer Service
//
// Responsibility:
//   Write a validated Sentinel-2 prepared raster as a
//   two-band Float32 GeoTIFF.
//
// Band order:
//   1. Red
//   2. NIR
//
// This service does NOT:
//   - calculate spectral indices
//   - apply radiometric transformations
//   - reproject
//   - resample
//   - classify
//
// Radiometric preparation must already be complete before
// this writer is called.
// ============================================================

const fs = require("fs");
const path = require("path");
const GeoTIFF = require("geotiff");

const {
    createSentinel2PreparedRaster
} = require(
    "../../../scientific/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterContract"
);

const {
    createModelPixelScale,
    createModelTiepoint,
    createGeoKeyMetadata
} = require(
    "../raster/rasterOutputService"
);

function assertNonEmptyString(
    value,
    fieldName
) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${fieldName} must be a non-empty string.`
        );
    }
}

function flattenBandData(
    red,
    nir,
    pixelCount
) {
    const values =
        new Float32Array(
            pixelCount * 2
        );

    for (
        let index = 0;
        index < pixelCount;
        index += 1
    ) {
        values[index * 2] =
            red[index];

        values[index * 2 + 1] =
            nir[index];
    }

    return values;
}

function buildGeoTiffMetadata(
    preparedRaster
) {
    const {
        width,
        height,
        bands,
        spatialReference,
        noData
    } = preparedRaster.raster;

    const red =
        bands.Red.data;

    const nir =
        bands.NIR.data;

    const metadata = {
        width,
        height,

        SamplesPerPixel: [2],

        BitsPerSample: [
            32,
            32
        ],

        SampleFormat: [
            3,
            3
        ],

        PlanarConfiguration: 1,

        PhotometricInterpretation: 1,

        GDAL_NODATA:
            String(noData),

        ImageDescription:
            JSON.stringify({
                source:
                    "Sentinel-2 L2A",

                sensor:
                    "Sentinel-2",

                sceneId:
                    preparedRaster.sceneId,

                acquisitionDate:
                    preparedRaster.acquisitionDate,

                bandOrder: [
                    "Red",
                    "NIR"
                ],

                radiometry:
                    preparedRaster.radiometry
            })
    };

    if (
        spatialReference &&
        typeof spatialReference === "object"
    ) {
        if (
            Array.isArray(spatialReference.resolution) &&
            Array.isArray(spatialReference.origin) &&
            spatialReference.geoKeys &&
            typeof spatialReference.geoKeys === "object"
        ) {
            metadata.ModelPixelScale =
                createModelPixelScale(
                    spatialReference.resolution
                );

            metadata.ModelTiepoint =
                createModelTiepoint(
                    spatialReference.origin
                );

            Object.assign(
                metadata,
                createGeoKeyMetadata(
                    spatialReference.geoKeys
                )
            );
        } else {
            if (
                Array.isArray(
                    spatialReference.modelPixelScale
                )
            ) {
                metadata.ModelPixelScale =
                    spatialReference.modelPixelScale;
            }

            if (
                Array.isArray(
                    spatialReference.modelTiepoint
                )
            ) {
                metadata.ModelTiepoint =
                    spatialReference.modelTiepoint;
            }

            if (
                Array.isArray(
                    spatialReference.geoKeyDirectory
                )
            ) {
                metadata.GeoKeyDirectory =
                    spatialReference.geoKeyDirectory;
            }

            if (
                Array.isArray(
                    spatialReference.geoDoubleParams
                )
            ) {
                metadata.GeoDoubleParams =
                    spatialReference.geoDoubleParams;
            }

            if (
                Array.isArray(
                    spatialReference.geoAsciiParams
                )
            ) {
                metadata.GeoAsciiParams =
                    spatialReference.geoAsciiParams;
            }
        }
    }

    metadata.SamplesPerPixel =
        [2];

    metadata.BitsPerSample =
        [32, 32];

    metadata.SampleFormat =
        [3, 3];

    metadata.PlanarConfiguration =
        1;

    return metadata;
}

async function writeSentinel2PreparedRaster({
    preparedRaster,
    outputPath
} = {}) {
    assertNonEmptyString(
        outputPath,
        "outputPath"
    );

    const validatedRaster =
        createSentinel2PreparedRaster(
            preparedRaster
        );

    const {
        width,
        height,
        pixelCount,
        bands
    } = validatedRaster.raster;

    const red =
        bands.Red.data;

    const nir =
        bands.NIR.data;

    const values =
        flattenBandData(
            red,
            nir,
            pixelCount
        );

    const metadata =
        buildGeoTiffMetadata(
            validatedRaster
        );

    const buffer =
        await GeoTIFF.writeArrayBuffer(
            values,
            metadata
        );

    await fs.promises.mkdir(
        path.dirname(outputPath),
        {
            recursive: true
        }
    );

    await fs.promises.writeFile(
        outputPath,
        Buffer.from(buffer)
    );

    return {
        outputPath,
        width,
        height,
        pixelCount,
        bandCount: 2,
        bands: [
            "Red",
            "NIR"
        ],
        dataType: "Float32",
        byteLength: buffer.byteLength
    };
}

module.exports = {
    flattenBandData,
    buildGeoTiffMetadata,
    writeSentinel2PreparedRaster
};
