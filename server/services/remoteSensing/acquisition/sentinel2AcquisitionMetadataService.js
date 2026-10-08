"use strict";

const fs = require("fs");
const path = require("path");

const METADATA_VERSION = "1.0";
const METADATA_FILENAME = "acquisition_metadata.json";

function getMetadataPath(outputDirectory, sceneId) {
    if (
        typeof outputDirectory !== "string" ||
        !outputDirectory.trim()
    ) {
        throw new Error(
            "outputDirectory must be a non-empty string."
        );
    }

    if (
        typeof sceneId !== "string" ||
        !sceneId.trim()
    ) {
        throw new Error(
            "sceneId must be a non-empty string."
        );
    }

    return path.join(
        outputDirectory,
        `${sceneId.trim()}_${METADATA_FILENAME}`
    );
}

function toPortableRelativePath(outputDirectory, filePath) {
    return path
        .relative(outputDirectory, filePath)
        .split(path.sep)
        .join("/");
}

function resolveStoredPath(outputDirectory, storedPath) {
    if (
        typeof storedPath !== "string" ||
        !storedPath.trim()
    ) {
        throw new Error(
            "Acquisition metadata contains an invalid band path."
        );
    }

    return path.resolve(
        outputDirectory,
        storedPath
    );
}

function validateSpatialReference(value) {
    return (
        value &&
        Array.isArray(value.origin) &&
        value.origin.length === 3 &&
        Array.isArray(value.resolution) &&
        value.resolution.length === 3 &&
        Array.isArray(value.boundingBox) &&
        value.boundingBox.length === 4 &&
        value.geoKeys &&
        Number.isFinite(
            value.geoKeys.ProjectedCSTypeGeoKey
        )
    );
}

function validateRadiometry(value) {
    return (
        value &&
        Number.isFinite(value.scale) &&
        Number.isFinite(value.offset) &&
        Number.isFinite(value.noData) &&
        typeof value.sourceDataType === "string"
    );
}

function validateAcquisitionMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") {
        return false;
    }

    if (
        metadata.metadataVersion !==
        METADATA_VERSION
    ) {
        return false;
    }

    if (
        typeof metadata.sceneId !== "string" ||
        !metadata.sceneId
    ) {
        return false;
    }

    if (
        typeof metadata.acquisitionDate !== "string" ||
        !metadata.acquisitionDate
    ) {
        return false;
    }

    if (
        typeof metadata.sourceProvider !== "string" ||
        !metadata.sourceProvider
    ) {
        return false;
    }

    if (
        metadata.spatialCoverage !== undefined &&
        (
            !Array.isArray(metadata.spatialCoverage) ||
            metadata.spatialCoverage.length !== 4 ||
            metadata.spatialCoverage.some(
                value => !Number.isFinite(Number(value))
            ) ||
            Number(metadata.spatialCoverage[0]) >=
                Number(metadata.spatialCoverage[2]) ||
            Number(metadata.spatialCoverage[1]) >=
                Number(metadata.spatialCoverage[3])
        )
    ) {
        return false;
    }

    if (
        !metadata.bands ||
        typeof metadata.bands !== "object"
    ) {
        return false;
    }

    for (const band of Object.values(metadata.bands)) {
        if (
            !band ||
            typeof band.assetKey !== "string" ||
            typeof band.path !== "string" ||
            !validateSpatialReference(
                band.spatialReference
            ) ||
            !validateRadiometry(
                band.radiometry
            )
        ) {
            return false;
        }
    }

    return true;
}

async function readAcquisitionMetadata({
    outputDirectory,
    sceneId
}) {
    const metadataPath =
        getMetadataPath(
            outputDirectory,
            sceneId
        );

    try {
        const text =
            await fs.promises.readFile(
                metadataPath,
                "utf8"
            );

        const metadata =
            JSON.parse(text);

        if (
            !validateAcquisitionMetadata(
                metadata
            )
        ) {
            return null;
        }

        return {
            ...metadata,
            metadataPath
        };
    } catch {
        return null;
    }
}

async function writeAcquisitionMetadata({
    outputDirectory,
    acquisition
}) {
    if (
        !acquisition ||
        typeof acquisition.sceneId !== "string"
    ) {
        throw new Error(
            "Invalid acquisition metadata."
        );
    }

    if (
        !acquisition.bands ||
        typeof acquisition.bands !== "object"
    ) {
        throw new Error(
            "Acquisition metadata requires bands."
        );
    }

    await fs.promises.mkdir(
        outputDirectory,
        { recursive: true }
    );

    const metadataPath =
        getMetadataPath(
            outputDirectory,
            acquisition.sceneId
        );

    const bands = {};

    for (
        const [bandName, band] of
        Object.entries(acquisition.bands)
    ) {
        if (
            !band ||
            typeof band.path !== "string"
        ) {
            throw new Error(
                `Invalid acquisition metadata for band: ${bandName}`
            );
        }

        bands[bandName] = {
            assetKey: band.assetKey,
            path: toPortableRelativePath(
                outputDirectory,
                band.path
            ),
            spatialReference:
                band.spatialReference,
            radiometry:
                band.radiometry
        };
    }

    const metadata = {
        metadataVersion:
            METADATA_VERSION,

        sceneId:
            acquisition.sceneId,

        acquisitionDate:
            acquisition.acquisitionDate,

        sourceProvider:
            acquisition.sourceProvider,

        spatialCoverage:
            Array.isArray(
                acquisition.spatialCoverage
            )
                ? acquisition.spatialCoverage.slice()
                : undefined,

        bands
    };

    if (
        !validateAcquisitionMetadata(
            metadata
        )
    ) {
        throw new Error(
            "Generated acquisition metadata failed validation."
        );
    }

    const temporaryPath =
        `${metadataPath}.tmp`;

    await fs.promises.writeFile(
        temporaryPath,
        JSON.stringify(
            metadata,
            null,
            2
        ),
        "utf8"
    );

    await fs.promises.rename(
        temporaryPath,
        metadataPath
    );

    return {
        ...metadata,
        metadataPath
    };
}

async function resolveLocalAcquisition({
    outputDirectory,
    sceneId,
    bandNames
}) {
    const metadata =
        await readAcquisitionMetadata({
            outputDirectory,
            sceneId
        });

    if (!metadata) {
        return null;
    }

    const bands = {};

    for (const bandName of bandNames) {
        const band =
            metadata.bands?.[bandName];

        if (!band) {
            return null;
        }

        const filePath =
            resolveStoredPath(
                outputDirectory,
                band.path
            );

        try {
            const stat =
                await fs.promises.stat(
                    filePath
                );

            if (
                !stat.isFile() ||
                stat.size <= 0
            ) {
                return null;
            }
        } catch {
            return null;
        }

        bands[bandName] = {
            assetKey: band.assetKey,
            path: filePath,
            spatialReference:
                band.spatialReference,
            radiometry:
                band.radiometry,
            source: "local-cache"
        };
    }

    return {
        sceneId:
            metadata.sceneId,

        acquisitionDate:
            metadata.acquisitionDate,

        sourceProvider:
            metadata.sourceProvider,

        bands
    };
}

module.exports = {
    METADATA_VERSION,
    METADATA_FILENAME,
    getMetadataPath,
    validateAcquisitionMetadata,
    readAcquisitionMetadata,
    writeAcquisitionMetadata,
    resolveLocalAcquisition
};
