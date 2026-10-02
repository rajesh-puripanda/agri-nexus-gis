"use strict";

/*
============================================================
 AGRINEXUS GIS  SENTINEL-2 SPECTRAL BAND MAPPING
 Scientific sensor boundary
============================================================
*/

const {
    getSentinel2BandDefinition,
} = require(
    "../../../scientific/remoteSensing/bands/sentinel2BandCatalog"
);

const SENTINEL2_SPECTRAL_BAND_MAPPING_VERSION = "1.0";

const SENTINEL2_SPECTRAL_BAND_MAPPING = Object.freeze({
    Blue: "Blue",
    Green: "Green",
    Red: "Red",
    NIR: "NIR",
    SWIR: "SWIR1",
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
