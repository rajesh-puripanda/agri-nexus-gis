"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    normalizeDecodedSamples
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2Jp2DecoderService"
);

test(
    "normalizeDecodedSamples preserves Sentinel-2 raster dimensions and sample metadata",
    () => {
        const decodedBuffer =
            new Uint8Array([
                0,
                0,
                100,
                0,
                200,
                0,
                255,
                0
            ]);

        const result =
            normalizeDecodedSamples({
                frameInfo: {
                    width: 2,
                    height: 2,
                    bitsPerSample: 15,
                    componentCount: 1,
                    isSigned: false
                },

                decodedBuffer
            });

        assert.equal(
            result.width,
            2
        );

        assert.equal(
            result.height,
            2
        );

        assert.equal(
            result.pixelCount,
            4
        );

        assert.equal(
            result.bitsPerSample,
            15
        );

        assert.equal(
            result.componentCount,
            1
        );

        assert.equal(
            result.dataType,
            "UINT16"
        );

        assert.deepEqual(
            Array.from(result.samples),
            [
                0,
                100,
                200,
                255
            ]
        );
    }
);

test(
    "normalizeDecodedSamples rejects multi-component JP2 data",
    () => {
        assert.throws(
            () =>
                normalizeDecodedSamples({
                    frameInfo: {
                        width: 2,
                        height: 2,
                        bitsPerSample: 15,
                        componentCount: 3,
                        isSigned: false
                    },

                    decodedBuffer:
                        new Uint8Array(24)
                }),
            /exactly one component/
        );
    }
);

test(
    "normalizeDecodedSamples rejects signed samples",
    () => {
        assert.throws(
            () =>
                normalizeDecodedSamples({
                    frameInfo: {
                        width: 2,
                        height: 2,
                        bitsPerSample: 15,
                        componentCount: 1,
                        isSigned: true
                    },

                    decodedBuffer:
                        new Uint8Array(8)
                }),
            /Signed Sentinel-2 JPEG2000 samples/
        );
    }
);

test(
    "normalizeDecodedSamples rejects incorrect sample-buffer size",
    () => {
        assert.throws(
            () =>
                normalizeDecodedSamples({
                    frameInfo: {
                        width: 2,
                        height: 2,
                        bitsPerSample: 15,
                        componentCount: 1,
                        isSigned: false
                    },

                    decodedBuffer:
                        new Uint8Array(7)
                }),
            /expected 16-bit sample storage/
        );
    }
);

test(
    "normalizeDecodedSamples rejects invalid dimensions",
    () => {
        assert.throws(
            () =>
                normalizeDecodedSamples({
                    frameInfo: {
                        width: 0,
                        height: 2,
                        bitsPerSample: 15,
                        componentCount: 1,
                        isSigned: false
                    },

                    decodedBuffer:
                        new Uint8Array(8)
                }),
            /width is invalid/
        );
    }
);

test(
    "normalizeDecodedSamples rejects missing decoded buffer",
    () => {
        assert.throws(
            () =>
                normalizeDecodedSamples({
                    frameInfo: {
                        width: 2,
                        height: 2,
                        bitsPerSample: 15,
                        componentCount: 1,
                        isSigned: false
                    }
                }),
            /did not return a decoded sample buffer/
        );
    }
);
