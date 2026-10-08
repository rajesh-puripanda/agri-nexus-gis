"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/bands/
// sentinel2SpectralBandMapping.js
// ============================================================
//
// Sentinel-2 Canonical Spectral Band Mapping
//
// Maps canonical scientific band names used by index definitions
// to Sentinel-2 catalog band names.
//
// Scientific authority:
//   sentinel2BandCatalog.js
//
// This module contains mapping only.
// It does not define band resolutions, asset keys, formulas,
// resampling, or raster processing.
// ============================================================

const {
    getSentinel2BandDefinition,
} = require(
    "./sentinel2BandCatalog"
);

const SENTINEL2_SPECTRAL_BAND_MAPPING_VERSION =
    "1.0";

const SENTINEL2_SPECTRAL_BAND_MAPPING =
    Object.freeze({
        Blue: "Blue",
        Green: "Green",
        Red: "Red",
        NIR: "NIR",

        // Backward-compatible generic SWIR alias.
        SWIR: "SWIR1",

        // Explicit canonical SWIR1 band required by
        // soil-focused indices such as BSI.
        SWIR1: "SWIR1",
        SWIR2: "SWIR2",
    });

function resolveSentinel2SpectralBand(
    canonicalBandName
) {
    const sentinel2BandName =
        SENTINEL2_SPECTRAL_BAND_MAPPING[
            canonicalBandName
        ];

    if (!sentinel2BandName) {
        throw new Error(
            `Unsupported Sentinel-2 canonical spectral band: ${canonicalBandName}`
        );
    }

    const definition =
        getSentinel2BandDefinition(
            sentinel2BandName
        );

    return {
        canonicalBandName,
        sentinel2BandName,
        ...definition,
    };
}

function getSentinel2SpectralBandMapping() {
    return {
        ...SENTINEL2_SPECTRAL_BAND_MAPPING,
    };
}

module.exports = {
    SENTINEL2_SPECTRAL_BAND_MAPPING_VERSION,
    SENTINEL2_SPECTRAL_BAND_MAPPING,
    resolveSentinel2SpectralBand,
    getSentinel2SpectralBandMapping,
};
