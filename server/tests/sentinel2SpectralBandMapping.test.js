"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_SPECTRAL_BAND_MAPPING_VERSION,
    SENTINEL2_SPECTRAL_BAND_MAPPING,
    resolveSentinel2SpectralBand,
    getSentinel2SpectralBandMapping,
} = require(
    "../scientific/remoteSensing/bands/" +
    "sentinel2SpectralBandMapping"
);

test(
    "Sentinel-2 spectral band mapping exposes canonical bands",
    () => {
        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING_VERSION,
            "1.0"
        );

        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING.Blue,
            "Blue"
        );

        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING.Red,
            "Red"
        );

        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING.NIR,
            "NIR"
        );

        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING.SWIR,
            "SWIR1"
        );

        assert.equal(
            SENTINEL2_SPECTRAL_BAND_MAPPING.SWIR1,
            "SWIR1"
        );
    }
);

test(
    "resolveSentinel2SpectralBand resolves BSI SWIR1",
    () => {
        const result =
            resolveSentinel2SpectralBand(
                "SWIR1"
            );

        assert.deepEqual(
            result,
            {
                canonicalBandName:
                    "SWIR1",

                sentinel2BandName:
                    "SWIR1",

                bandId:
                    "B11",

                assetKey:
                    "B11_20m",

                nativeResolution:
                    20,

                spectralRole:
                    "Short Wave Infrared 1",
            }
        );
    }
);

test(
    "resolveSentinel2SpectralBand preserves SWIR compatibility",
    () => {
        const result =
            resolveSentinel2SpectralBand(
                "SWIR"
            );

        assert.equal(
            result.canonicalBandName,
            "SWIR"
        );

        assert.equal(
            result.sentinel2BandName,
            "SWIR1"
        );

        assert.equal(
            result.bandId,
            "B11"
        );

        assert.equal(
            result.nativeResolution,
            20
        );
    }
);

test(
    "getSentinel2SpectralBandMapping returns a copy",
    () => {
        const mapping =
            getSentinel2SpectralBandMapping();

        assert.deepEqual(
            mapping,
            {
                Blue: "Blue",
                Green: "Green",
                Red: "Red",
                NIR: "NIR",
                SWIR: "SWIR1",
                SWIR1: "SWIR1",
                SWIR2: "SWIR2",
            }
        );

        assert.notEqual(
            mapping,
            SENTINEL2_SPECTRAL_BAND_MAPPING
        );
    }
);

test(
    "resolveSentinel2SpectralBand rejects unsupported bands",
    () => {
        assert.throws(
            () =>
                resolveSentinel2SpectralBand(
                    "SWIR3"
                ),
            {
                message:
                    "Unsupported Sentinel-2 canonical spectral band: SWIR3",
            }
        );
    }
);
