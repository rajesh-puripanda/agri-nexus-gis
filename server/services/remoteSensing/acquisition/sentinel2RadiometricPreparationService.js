"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 Radiometric Preparation Service
//
// Responsibility:
//   Convert Sentinel-2 DN samples into physical values using
//   the radiometric scale/offset declared by the source asset.
//
// Scientific boundary:
//   physicalValue = DN * scale + offset
//
// No:
//   - NDVI calculation
//   - classification
//   - reprojection
//   - resampling
//   - spatial transformation
//   - sensor-specific index calculation
// ============================================================

const {
    createSentinel2PreparedRaster
} = require(
    "../../../scientific/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterContract"
);

function assertPositiveInteger(
    value,
    fieldName
) {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        throw new TypeError(
            `${fieldName} must be a positive integer.`
        );
    }
}

function assertFiniteNumber(
    value,
    fieldName
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new TypeError(
            `${fieldName} must be a finite number.`
        );
    }
}

function assertBandSamples(
    samples,
    expectedPixelCount,
    bandName
) {
    if (
        !Array.isArray(samples) &&
        !ArrayBuffer.isView(samples)
    ) {
        throw new TypeError(
            `${bandName} samples must be an array or typed array.`
        );
    }

    if (
        samples.length !==
        expectedPixelCount
    ) {
        throw new RangeError(
            `${bandName} samples must contain exactly ` +
            `${expectedPixelCount} pixels.`
        );
    }
}

function prepareBandSamples({
    samples,
    scale,
    offset,
    noData = 0,
    outputNoData = -9999,
    bandName = "band"
}) {
    if (
        !Array.isArray(samples) &&
        !ArrayBuffer.isView(samples)
    ) {
        throw new TypeError(
            `${bandName} samples must be an array or typed array.`
        );
    }

    assertFiniteNumber(
        scale,
        "scale"
    );

    assertFiniteNumber(
        offset,
        "offset"
    );

    assertFiniteNumber(
        noData,
        "noData"
    );

    assertFiniteNumber(
        outputNoData,
        "outputNoData"
    );

    const output =
        new Float32Array(
            samples.length
        );

    for (
        let index = 0;
        index < samples.length;
        index += 1
    ) {
        const dn = samples[index];

        if (dn === noData) {
            output[index] =
                outputNoData;

            continue;
        }

        const physicalValue =
            dn * scale + offset;

        output[index] =
            physicalValue;
    }

    return output;
}

function prepareSentinel2Raster({
    sceneId,
    acquisitionDate,
    sourceProvider =
        "Copernicus Data Space",

    width,
    height,

    redSamples,
    nirSamples,

    scale,
    offset,

    sourceNoData = 0,
    outputNoData = -9999,

    spatialReference = {},
    metadata = {}
} = {}) {
    if (
        typeof sceneId !== "string" ||
        !sceneId.trim()
    ) {
        throw new TypeError(
            "sceneId must be a non-empty string."
        );
    }

    if (
        typeof acquisitionDate !== "string" ||
        !acquisitionDate.trim()
    ) {
        throw new TypeError(
            "acquisitionDate must be a non-empty string."
        );
    }

    if (
        typeof sourceProvider !== "string" ||
        !sourceProvider.trim()
    ) {
        throw new TypeError(
            "sourceProvider must be a non-empty string."
        );
    }

    assertPositiveInteger(
        width,
        "width"
    );

    assertPositiveInteger(
        height,
        "height"
    );

    assertFiniteNumber(
        scale,
        "scale"
    );

    assertFiniteNumber(
        offset,
        "offset"
    );

    const pixelCount =
        width * height;

    assertBandSamples(
        redSamples,
        pixelCount,
        "Red"
    );

    assertBandSamples(
        nirSamples,
        pixelCount,
        "NIR"
    );

    const red =
        prepareBandSamples({
            samples: redSamples,
            scale,
            offset,
            noData: sourceNoData,
            outputNoData,
            bandName: "Red"
        });

    const nir =
        prepareBandSamples({
            samples: nirSamples,
            scale,
            offset,
            noData: sourceNoData,
            outputNoData,
            bandName: "NIR"
        });

    return createSentinel2PreparedRaster({
        contractVersion: "1.0",

        source: {
            id: "sentinel2",
            provider:
                sourceProvider
        },

        sceneId:
            sceneId.trim(),

        acquisitionDate:
            acquisitionDate.trim(),

        raster: {
            width,
            height,
            pixelCount,

            bands: {
                Red: {
                    data: red,
                    dataType: "Float32"
                },

                NIR: {
                    data: nir,
                    dataType: "Float32"
                }
            },

            spatialReference,

            noData: outputNoData,

            metadata: {
                ...metadata,

                sourceType:
                    "Sentinel-2 L2A",

                preparation:
                    "radiometric",

                radiometricTransformation:
                    "physicalValue = DN * scale + offset"
            }
        },

        radiometry: {
            sourceDataType:
                "UINT16",

            scale,

            offset,

            noData:
                sourceNoData,

            formula:
                "physicalValue = DN * scale + offset"
        }
    });
}

module.exports = {
    prepareBandSamples,
    prepareSentinel2Raster
};
