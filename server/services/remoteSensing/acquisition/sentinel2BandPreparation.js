"use strict";

const SENTINEL2_NDVI_BANDS = Object.freeze({
    Red: "B04_10m",
    NIR: "B08_10m"
});

function getNDVIBandAssets(item) {
    if (!item || !item.assets) {
        throw new TypeError(
            "Sentinel-2 catalogue item must contain assets."
        );
    }

    const red = item.assets[SENTINEL2_NDVI_BANDS.Red];
    const nir = item.assets[SENTINEL2_NDVI_BANDS.NIR];

    if (!red || !nir) {
        throw new Error(
            "Required Sentinel-2 NDVI band assets are missing."
        );
    }

    return {
        Red: red,
        NIR: nir
    };
}

module.exports = {
    SENTINEL2_NDVI_BANDS,
    getNDVIBandAssets
};
