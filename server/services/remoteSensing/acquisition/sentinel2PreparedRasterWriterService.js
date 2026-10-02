"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 Prepared Raster Writer Service
//
// Responsibility:
//   Write a validated Sentinel-2 prepared raster as a
//   multi-band Float32 GeoTIFF.
//
// Band order:
//   Determined by the insertion order of preparedRaster.raster.bands.
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
    bands,
    bandOrder,
    pixelCount
) {
    if (
        !bands ||
        typeof bands !== "object" ||
        Array.isArray(bands)
    ) {
        throw new TypeError(
            "bands must be an object."
        );
    }

    if (
        !Array.isArray(bandOrder) ||
        bandOrder.length === 0
    ) {
        throw new TypeError(
            "bandOrder must be a non-empty array."
        );
    }

    const values =
        new Float32Array(
            pixelCount *
            bandOrder.length
        );

    for (
        let index = 0;
        index < pixelCount;
        index += 1
    ) {
        for (
            let bandIndex = 0;
            bandIndex < bandOrder.length;
            bandIndex += 1
        ) {
            const bandName =
                bandOrder[bandIndex];

            const band =
                bands[bandName];

            if (
                !band ||
                !band.data
            ) {
                throw new TypeError(
                    `Prepared raster band is missing: ${bandName}`
                );
            }

            values[
                index *
                    bandOrder.length +
                bandIndex
            ] =
                band.data[index];
        }
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

    const bandOrder =
        Object.keys(bands);

    if (bandOrder.length === 0) {
        throw new TypeError(
            "preparedRaster.raster.bands must contain at least one band."
        );
    }

    const bandCount =
        bandOrder.length;

    const metadata = {
        width,
        height,

        SamplesPerPixel: [
            bandCount
        ],

        BitsPerSample:
            Array(
                bandCount
            ).fill(32),

        SampleFormat:
            Array(
                bandCount
            ).fill(3),

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

                bandOrder,

                radiometry:
                    preparedRaster.radiometry
            })
    };

    if (
        spatialReference &&
        typeof spatialReference === "object"
    ) {
        if (
            Array.isArray(
                spatialReference.resolution
            ) &&
            Array.isArray(
                spatialReference.origin
            ) &&
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

    const bandOrder =
        Object.keys(bands);

    if (bandOrder.length === 0) {
        throw new TypeError(
            "preparedRaster.raster.bands must contain at least one band."
        );
    }

    const values =
        flattenBandData(
            bands,
            bandOrder,
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
        bandCount:
            bandOrder.length,
        bands:
            bandOrder,
        dataType: "Float32",
        byteLength:
            buffer.byteLength
    };
}

module.exports = {
    flattenBandData,
    buildGeoTiffMetadata,
    writeSentinel2PreparedRaster
};
