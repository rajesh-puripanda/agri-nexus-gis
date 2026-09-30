"use strict";

const {
    search: defaultSearch
} = require("./copernicusDataSpaceAdapter");

const {
    getAccessToken: defaultGetAccessToken
} = require("./copernicusAuthService");

const {
    downloadAsset: defaultDownloadAsset
} = require("./copernicusAssetDownloadService");

async function acquireNDVIBands({
    request,
    outputDirectory,
    fetchImpl = globalThis.fetch,

    searchImpl = defaultSearch,
    getAccessTokenImpl = defaultGetAccessToken,
    downloadAssetImpl = defaultDownloadAsset
}) {
    const catalogue =
        await searchImpl(
            request,
            { fetchImpl }
        );

    const item =
        catalogue.features?.[0];

    if (!item) {
        throw new Error(
            "No Sentinel-2 catalogue item matched the acquisition request."
        );
    }

    const redAsset =
        item.assets?.B04_10m;

    const nirAsset =
        item.assets?.B08_10m;

    if (!redAsset || !nirAsset) {
        throw new Error(
            "Required Sentinel-2 NDVI assets are missing."
        );
    }

    const accessToken =
        await getAccessTokenImpl({
            fetchImpl
        });

    const safeId =
        item.id.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );

    const redPath =
        `${outputDirectory}/${safeId}_B04_10m.jp2`;

    const nirPath =
        `${outputDirectory}/${safeId}_B08_10m.jp2`;

    await downloadAssetImpl({
        asset: redAsset,
        outputPath: redPath,
        accessToken,
        fetchImpl
    });

    await downloadAssetImpl({
        asset: nirAsset,
        outputPath: nirPath,
        accessToken,
        fetchImpl
    });

    return {
        sceneId: item.id,

        acquisitionDate:
            item.properties?.datetime,

        red: {
            assetKey: "B04_10m",
            path: redPath
        },

        nir: {
            assetKey: "B08_10m",
            path: nirPath
        }
    };
}

module.exports = {
    acquireNDVIBands
};