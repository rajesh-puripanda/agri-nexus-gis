"use strict";

/*
============================================================
 SENTINEL-2 BAND PREPARATION / ASSET RESOLUTION
 AgriNexus GIS

 Responsibility:
 - Consume the authoritative Sentinel-2 L2A band catalog.
 - Resolve requested bands from a STAC catalogue item.
 - Preserve native source resolution.
 - Do NOT perform resampling, reprojection, radiometric
   conversion, index calculation, or classification.

 Scientific band definitions are maintained by:
   server/scientific/remoteSensing/bands/
   sentinel2BandCatalog.js

 This service contains acquisition/asset-resolution behavior,
 not Sentinel-2 band definitions.
============================================================
*/

const {
    SENTINEL2_BAND_CATALOG,
    getAllSentinel2Bands,
    hasSentinel2Band,
    getSentinel2BandDefinition
} = require(
    "../../../scientific/remoteSensing/bands/" +
    "sentinel2BandCatalog"
);

// Legacy-compatible asset-key mapping.
// The authoritative band definitions remain in the catalog.
const SENTINEL2_BANDS = Object.freeze(
    Object.fromEntries(
        getAllSentinel2Bands().map(
            (bandName) => [
                bandName,
                SENTINEL2_BAND_CATALOG[
                    bandName
                ].assetKey
            ]
        )
    )
);

const SENTINEL2_NDVI_BANDS = Object.freeze({
    Red: SENTINEL2_BANDS.Red,
    NIR: SENTINEL2_BANDS.NIR
});

function validateCatalogueItem(item) {
    if (!item || !item.assets) {
        throw new TypeError(
            "Sentinel-2 catalogue item must contain assets."
        );
    }
}

function getSentinel2BandAssets(
    item,
    bandNames = getAllSentinel2Bands()
) {
    validateCatalogueItem(item);

    if (
        !Array.isArray(bandNames) ||
        bandNames.length === 0
    ) {
        throw new TypeError(
            "Sentinel-2 bandNames must be a non-empty array."
        );
    }

    const assets = {};

    for (const bandName of bandNames) {
        if (
            typeof bandName !== "string" ||
            !hasSentinel2Band(bandName)
        ) {
            throw new Error(
                `Unsupported Sentinel-2 band: ${bandName}`
            );
        }

        const definition =
            getSentinel2BandDefinition(
                bandName
            );

        const assetKey =
            definition.assetKey;

        const asset =
            item.assets[assetKey];

        if (!asset) {
            throw new Error(
                `Required Sentinel-2 band asset is missing: ` +
                `${bandName} (${assetKey}).`
            );
        }

        assets[bandName] = asset;
    }

    return assets;
}

function getNDVIBandAssets(item) {
    validateCatalogueItem(item);

    const red =
        item.assets[SENTINEL2_NDVI_BANDS.Red];

    const nir =
        item.assets[SENTINEL2_NDVI_BANDS.NIR];

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
    SENTINEL2_BANDS,
    SENTINEL2_NDVI_BANDS,
    getSentinel2BandAssets,
    getNDVIBandAssets
};
