"use strict";

const fs = require("fs");
const path = require("path");

const {
    search: defaultSearch
} = require("./copernicusDataSpaceAdapter");

const {
    getAccessToken: defaultGetAccessToken
} = require("./copernicusAuthService");

const {
    downloadAsset: defaultDownloadAsset
} = require("./copernicusAssetDownloadService");

const {
    SENTINEL2_BANDS,
    getSentinel2BandAssets
} = require("./sentinel2BandPreparation");

const {
    resolveLocalAcquisition,
    writeAcquisitionMetadata
} = require("./sentinel2AcquisitionMetadataService");

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

    const epsgMatch =
        code.match(/^EPSG:(\d+)$/i);

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

function buildRadiometricMetadataFromAsset(asset) {
    const scale =
        asset?.["raster:scale"];

    const offset =
        asset?.["raster:offset"];

    const noData =
        asset?.nodata;

    const dataType =
        asset?.data_type;

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
        sourceDataType:
            dataType.toUpperCase()
    };
}

function validateMatchingSpatialReference(
    redAsset,
    nirAsset
) {
    const redSpatialReference =
        buildSpatialReferenceFromAsset(
            redAsset
        );

    const nirSpatialReference =
        buildSpatialReferenceFromAsset(
            nirAsset
        );

    if (
        redSpatialReference.geoKeys.ProjectedCSTypeGeoKey !==
        nirSpatialReference.geoKeys.ProjectedCSTypeGeoKey
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different coordinate reference systems."
        );
    }

    if (
        JSON.stringify(
            redSpatialReference.boundingBox
        ) !==
        JSON.stringify(
            nirSpatialReference.boundingBox
        )
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different spatial bounding boxes."
        );
    }

    if (
        JSON.stringify(
            redSpatialReference.resolution
        ) !==
        JSON.stringify(
            nirSpatialReference.resolution
        )
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR assets use different spatial resolutions."
        );
    }

    return redSpatialReference;
}

function validateMatchingRadiometricMetadata(
    redAsset,
    nirAsset
) {
    const redRadiometry =
        buildRadiometricMetadataFromAsset(
            redAsset
        );

    const nirRadiometry =
        buildRadiometricMetadataFromAsset(
            nirAsset
        );

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

function buildSafeSceneId(sceneId) {
    if (typeof sceneId !== "string" || !sceneId) {
        throw new Error(
            "Sentinel-2 catalogue item is missing a valid scene identifier."
        );
    }

    return sceneId.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
    );
}

/*
 * A Sentinel-2 band is reusable only when the expected
 * deterministic cache file exists and contains data.
 */
async function isUsableLocalBand(outputPath) {
    try {
        const stat =
            await fs.promises.stat(
                outputPath
            );

        return (
            stat.isFile() &&
            stat.size > 0
        );
    } catch {
        return false;
    }
}

async function acquireSentinel2Bands({
    request,
    outputDirectory,
    bandNames = Object.keys(SENTINEL2_BANDS),

    fetchImpl = globalThis.fetch,
    searchImpl = defaultSearch,
    getAccessTokenImpl = defaultGetAccessToken,
    downloadAssetImpl = defaultDownloadAsset
}) {
    if (
        !request ||
        typeof request !== "object"
    ) {
        throw new TypeError(
            "Sentinel-2 acquisition request is required."
        );
    }

    if (
        typeof outputDirectory !== "string" ||
        outputDirectory.trim().length === 0
    ) {
        throw new TypeError(
            "outputDirectory must be a non-empty string."
        );
    }

    if (
        !Array.isArray(bandNames) ||
        bandNames.length === 0
    ) {
        throw new TypeError(
            "bandNames must be a non-empty array."
        );
    }

    const requestedSceneId =
        request.acquisitionParameters &&
        request.acquisitionParameters.sceneId;

    const explicitSceneId =
        typeof requestedSceneId === "string" &&
        requestedSceneId.trim().length > 0
            ? requestedSceneId.trim()
            : null;

        /*
     * Fast local-cache path.
     *
     * A complete acquisition manifest contains the
     * scientific metadata required to reconstruct the
     * acquisition contract without contacting STAC.
     */
    if (explicitSceneId) {
        const localAcquisition =
            await resolveLocalAcquisition({
                outputDirectory,
                sceneId: explicitSceneId,
                bandNames
            });

        if (localAcquisition) {
            return localAcquisition;
        }
    }

    const catalogue =
        await searchImpl(
            request,
            { fetchImpl }
        );

    const item =
        explicitSceneId
            ? catalogue?.features?.find(
                feature =>
                    feature &&
                    feature.id === explicitSceneId
            )
            : catalogue?.features?.[0];

    if (!item) {
        throw new Error(
            explicitSceneId
                ? "Sentinel-2 catalogue item " +
                  explicitSceneId +
                  " was not returned by the acquisition search."
                : "No Sentinel-2 catalogue item matched the acquisition request."
        );
    }

    const assets =
        getSentinel2BandAssets(
            item,
            bandNames
        );

    const safeId =
        buildSafeSceneId(item.id);

    const bands = {};

    /*
     * Determine which bands need downloading before
     * requesting an access token.
     */
    const pendingDownloads = [];

    for (const bandName of bandNames) {
        const asset =
            assets[bandName];

        const assetKey =
            SENTINEL2_BANDS[bandName];

        const outputPath =
            path.join(
                outputDirectory,
                `${safeId}_${assetKey}.jp2`
            );

        if (
            await isUsableLocalBand(
                outputPath
            )
        ) {
            bands[bandName] = {
                assetKey,
                path: outputPath,
                spatialReference:
                    buildSpatialReferenceFromAsset(
                        asset
                    ),
                radiometry:
                    buildRadiometricMetadataFromAsset(
                        asset
                    ),
                source:
                    "local-cache"
            };

            continue;
        }

        pendingDownloads.push({
            bandName,
            asset,
            assetKey,
            outputPath
        });
    }

    /*
     * Authentication is required only when at least one
     * requested band is actually missing.
     */
    let accessToken = null;

    if (pendingDownloads.length > 0) {
        accessToken =
            await getAccessTokenImpl({
                fetchImpl
            });
    }

    for (const pending of pendingDownloads) {
        await downloadAssetImpl({
            asset:
                pending.asset,

            outputPath:
                pending.outputPath,

            accessToken,

            fetchImpl
        });

        bands[pending.bandName] = {
            assetKey:
                pending.assetKey,

            path:
                pending.outputPath,

            spatialReference:
                buildSpatialReferenceFromAsset(
                    pending.asset
                ),

            radiometry:
                buildRadiometricMetadataFromAsset(
                    pending.asset
                ),

            source:
                "download"
        };
    }

    const orderedBands = {};

    for (const bandName of bandNames) {
        if (bands[bandName]) {
            orderedBands[bandName] = bands[bandName];
        }
    }

    const acquisition = {
        sceneId:
            item.id,

        acquisitionDate:
            item.properties?.datetime,

        sourceProvider:
            "copernicus-data-space",

        spatialCoverage:
            Array.isArray(item.bbox)
                ? item.bbox.slice()
                : null,

        bands: orderedBands
    };

    await writeAcquisitionMetadata({
        outputDirectory,
        acquisition
    });

    return acquisition;
}

async function acquireNDVIBands({
    request,
    outputDirectory,
    fetchImpl = globalThis.fetch,

    searchImpl = defaultSearch,
    getAccessTokenImpl = defaultGetAccessToken,
    downloadAssetImpl = defaultDownloadAsset
}) {
    const result =
        await acquireSentinel2Bands({
            request,
            outputDirectory,

            bandNames: [
                "Red",
                "NIR"
            ],

            fetchImpl,
            searchImpl,
            getAccessTokenImpl,
            downloadAssetImpl
        });

    const red =
        result.bands.Red;

    const nir =
        result.bands.NIR;

    if (!red || !nir) {
        throw new Error(
            "Required Sentinel-2 NDVI assets are missing."
        );
    }

    const spatialReference =
        validateMatchingSpatialReference(
            {
                "proj:code":
                    `EPSG:${red.spatialReference.geoKeys.ProjectedCSTypeGeoKey}`,

                "proj:bbox":
                    red.spatialReference.boundingBox,

                "proj:transform": [
                    red.spatialReference.resolution[0],
                    0,
                    red.spatialReference.origin[0],
                    0,
                    red.spatialReference.resolution[1],
                    red.spatialReference.origin[1]
                ]
            },

            {
                "proj:code":
                    `EPSG:${nir.spatialReference.geoKeys.ProjectedCSTypeGeoKey}`,

                "proj:bbox":
                    nir.spatialReference.boundingBox,

                "proj:transform": [
                    nir.spatialReference.resolution[0],
                    0,
                    nir.spatialReference.origin[0],
                    0,
                    nir.spatialReference.resolution[1],
                    nir.spatialReference.origin[1]
                ]
            }
        );

    const radiometry =
        validateMatchingRadiometricMetadata(
            {
                "raster:scale":
                    red.radiometry.scale,

                "raster:offset":
                    red.radiometry.offset,

                nodata:
                    red.radiometry.noData,

                data_type:
                    red.radiometry.sourceDataType
            },

            {
                "raster:scale":
                    nir.radiometry.scale,

                "raster:offset":
                    nir.radiometry.offset,

                nodata:
                    nir.radiometry.noData,

                data_type:
                    nir.radiometry.sourceDataType
            }
        );

    return {
        sceneId:
            result.sceneId,

        acquisitionDate:
            result.acquisitionDate,

        spatialReference,

        radiometry,

        red: {
            assetKey:
                red.assetKey,

            path:
                red.path
        },

        nir: {
            assetKey:
                nir.assetKey,

            path:
                nir.path
        }
    };
}

module.exports = {
    acquireSentinel2Bands,
    acquireNDVIBands,
    buildSpatialReferenceFromAsset,
    validateMatchingSpatialReference,
    buildRadiometricMetadataFromAsset,
    validateMatchingRadiometricMetadata,
    isUsableLocalBand
};
