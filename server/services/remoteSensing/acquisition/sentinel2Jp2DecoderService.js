"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 JPEG2000 Decoder Service
//
// Responsibility:
//   Decode Sentinel-2 JP2 raster assets using the OpenJPEG
//   WebAssembly decoder.
//
// This service does NOT:
//   - apply radiometric scale/offset
//   - calculate spectral indices
//   - classify pixels
//   - reproject
//   - resample
//   - write GeoTIFF
//
// The returned decoded samples remain source DN values.
// Radiometric preparation is handled separately.
// ============================================================

const fs = require("fs");

const {
    decode
} = require("@abasb75/jpeg2000-decoder");

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

function normalizeDecodedSamples(
    decoded
) {
    if (
        !decoded ||
        typeof decoded !== "object"
    ) {
        throw new Error(
            "JPEG2000 decoder returned an invalid result."
        );
    }

    if (
        !decoded.frameInfo ||
        typeof decoded.frameInfo !== "object"
    ) {
        throw new Error(
            "JPEG2000 decoder result is missing frameInfo."
        );
    }

    const {
        width,
        height,
        bitsPerSample,
        componentCount,
        isSigned
    } = decoded.frameInfo;

    if (
        !Number.isInteger(width) ||
        width <= 0
    ) {
        throw new Error(
            "Decoded JPEG2000 width is invalid."
        );
    }

    if (
        !Number.isInteger(height) ||
        height <= 0
    ) {
        throw new Error(
            "Decoded JPEG2000 height is invalid."
        );
    }

    if (
        componentCount !== 1
    ) {
        throw new Error(
            "Sentinel-2 band assets must contain exactly one component."
        );
    }

    if (isSigned) {
        throw new Error(
            "Signed Sentinel-2 JPEG2000 samples are not supported."
        );
    }

    if (
        !Number.isInteger(bitsPerSample) ||
        bitsPerSample <= 0
    ) {
        throw new Error(
            "Decoded JPEG2000 bit depth is invalid."
        );
    }

    if (
        !decoded.decodedBuffer ||
        !ArrayBuffer.isView(
            decoded.decodedBuffer
        )
    ) {
        throw new Error(
            "JPEG2000 decoder did not return a decoded sample buffer."
        );
    }

    const pixelCount =
        width * height;

    const expectedByteLength =
        pixelCount * 2;

    if (
        decoded.decodedBuffer.byteLength !==
        expectedByteLength
    ) {
        throw new Error(
            "Decoded Sentinel-2 sample buffer does not " +
            "contain the expected 16-bit sample storage."
        );
    }

    const bytes =
        decoded.decodedBuffer;

    const samples =
        new Uint16Array(
            bytes.buffer,
            bytes.byteOffset,
            pixelCount
        );

    return {
        width,
        height,
        pixelCount,
        bitsPerSample,
        componentCount,
        dataType: "UINT16",
        samples
    };
}

async function decodeSentinel2Jp2(
    filePath
) {
    assertNonEmptyString(
        filePath,
        "filePath"
    );

    const input =
        await fs.promises.readFile(
            filePath
        );

    if (input.length === 0) {
        throw new Error(
            "Sentinel-2 JPEG2000 file is empty."
        );
    }

    const decoded =
        await decode(input);

    return normalizeDecodedSamples(
        decoded
    );
}

module.exports = {
    decodeSentinel2Jp2,
    normalizeDecodedSamples
};
