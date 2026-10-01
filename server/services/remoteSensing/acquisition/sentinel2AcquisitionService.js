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

function buildSpatialReferenceFromAsset(asset) {
    const code = asset?.["proj:code"];
    const bbox = asset?.["proj:bbox"];
    const transform = asset?.["proj:transform"];

    if (
        typeof code !== "string" ||
        !Array.isArray(bbox) ||
        bbox.length !== 4 ||
        !Array.isArray(transform) ||
        transform.length !== 6
    ) {
        throw new Error(
            "Sentinel-2 asset is missing required projection metadata."
        );
    }

    const epsgMatch = code.match(/^EPSG:(\d+)$/i);

    if (!epsgMatch) {
        throw new Error(
            `Unsupported Sentinel-2 projection code: ${code}`
        );
    }

    return {
        origin: [
            transform[2],
            transform[5],
            0
        ],

        resolution: [
            transform[0],
            transform[4],
            0
        ],

        boundingBox: bbox.slice(),

        geoKeys: {
            ProjectedCSTypeGeoKey:
                Number(epsgMatch[1]),
            GTModelTypeGeoKey: 1,
            GTRasterTypeGeoKey: 1
        }
    };
}

function validateMatchingSpatialReference(redAsset, nirAsset) {
    const redSpatialReference =
        buildSpatialReferenceFromAsset(redAsset);

    const nirSpatialReference =
        buildSpatialReferenceFromAsset(nirAsset);

    if (
        redSpatialReference.geoKeys.ProjectedCSTypeGeoKey !==
        nirSpatialReference.geoKeys.ProjectedCSTypeGeoKey
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different coordinate reference systems."
        );
    }

    if (
        JSON.stringify(redSpatialReference.boundingBox) !==
        JSON.stringify(nirSpatialReference.boundingBox)
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different spatial bounding boxes."
        );
    }

    if (
        JSON.stringify(redSpatialReference.resolution) !==
        JSON.stringify(nirSpatialReference.resolution)
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different spatial resolutions."
        );
    }

    return redSpatialReference;
}

function buildRadiometricMetadataFromAsset(asset) {
    const scale = asset?.["raster:scale"];
    const offset = asset?.["raster:offset"];
    const noData = asset?.nodata;
    const dataType = asset?.data_type;

    if (!Number.isFinite(scale)) {
        throw new Error(
            "Sentinel-2 asset is missing a valid raster scale."
        );
    }

    if (!Number.isFinite(offset)) {
        throw new Error(
            "Sentinel-2 asset is missing a valid raster offset."
        );
    }

    if (!Number.isFinite(noData)) {
        throw new Error(
            "Sentinel-2 asset is missing a valid NoData value."
        );
    }

    if (typeof dataType !== "string") {
        throw new Error(
            "Sentinel-2 asset is missing a valid data type."
        );
    }

    return {
        scale,
        offset,
        noData,
        sourceDataType: dataType.toUpperCase()
    };
}

function validateMatchingRadiometricMetadata(
    redAsset,
    nirAsset
) {
    const redRadiometry =
        buildRadiometricMetadataFromAsset(redAsset);

    const nirRadiometry =
        buildRadiometricMetadataFromAsset(nirAsset);

    if (
        redRadiometry.scale !==
        nirRadiometry.scale
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different radiometric scales."
        );
    }

    if (
        redRadiometry.offset !==
        nirRadiometry.offset
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different radiometric offsets."
        );
    }

    if (
        redRadiometry.noData !==
        nirRadiometry.noData
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different NoData values."
        );
    }

    if (
        redRadiometry.sourceDataType !==
        nirRadiometry.sourceDataType
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different source data types."
        );
    }

    return redRadiometry;
}

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

    const spatialReference =
        validateMatchingSpatialReference(
            redAsset,
            nirAsset
        );

    const radiometry =
        validateMatchingRadiometricMetadata(
            redAsset,
            nirAsset
        );

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

        spatialReference,

        radiometry,

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
    acquireNDVIBands,
    buildSpatialReferenceFromAsset,
    validateMatchingSpatialReference,
    buildRadiometricMetadataFromAsset,
    validateMatchingRadiometricMetadata
};
