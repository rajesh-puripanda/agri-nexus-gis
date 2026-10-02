"use strict";

/*
============================================================
 AGRINEXUS GIS  SENTINEL-2 PREPARED RASTER BAND ORDER
 Prepared-raster representation boundary
============================================================
*/

const {
    getAllSentinel2Bands,
    getSentinel2BandDefinition
} = require(
    "./sentinel2BandCatalog"
);

const SENTINEL2_PREPARED_RASTER_BAND_ORDER_VERSION = "1.0";

function getSentinel2PreparedRasterBandOrder(
    nativeResolution
) {
    if (
        !Number.isInteger(nativeResolution) ||
        nativeResolution <= 0
    ) {
        throw new TypeError(
            "nativeResolution must be a positive integer."
        );
    }

    return getAllSentinel2Bands()
        .filter(
            (bandName) =>
                getSentinel2BandDefinition(
                    bandName
                ).nativeResolution ===
                nativeResolution
        );
}

function getSentinel2PreparedRasterSourceBand(
    bandName,
    nativeResolution
) {
    const bandOrder =
        getSentinel2PreparedRasterBandOrder(
            nativeResolution
        );

    const index =
        bandOrder.indexOf(bandName);

    if (index === -1) {
        throw new Error(
            `Sentinel-2 band "${bandName}" is not present in the ${nativeResolution}m prepared raster.`
        );
    }

    return index + 1;
}

module.exports = {
    SENTINEL2_PREPARED_RASTER_BAND_ORDER_VERSION,
    getSentinel2PreparedRasterBandOrder,
    getSentinel2PreparedRasterSourceBand
};
