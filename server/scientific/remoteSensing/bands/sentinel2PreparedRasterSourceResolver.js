"use strict";

const {
    resolveSentinel2SpectralBand
} = require(
    "./sentinel2SpectralBandMapping"
);

const {
    getSentinel2PreparedRasterSourceBand
} = require(
    "./sentinel2PreparedRasterBandOrder"
);

const SENTINEL2_PREPARED_RASTER_SOURCE_RESOLVER_VERSION =
    "1.0";

function resolveSentinel2PreparedRasterSource(
    canonicalBandName
) {
    const spectral =
        resolveSentinel2SpectralBand(
            canonicalBandName
        );

    const sourceBand =
        getSentinel2PreparedRasterSourceBand(
            spectral.sentinel2BandName,
            spectral.nativeResolution
        );

    return {
        canonicalBandName:
            spectral.canonicalBandName,

        sentinel2BandName:
            spectral.sentinel2BandName,

        bandId:
            spectral.bandId,

        assetKey:
            spectral.assetKey,

        nativeResolution:
            spectral.nativeResolution,

        sourceBand
    };
}

module.exports = {
    SENTINEL2_PREPARED_RASTER_SOURCE_RESOLVER_VERSION,
    resolveSentinel2PreparedRasterSource
};
