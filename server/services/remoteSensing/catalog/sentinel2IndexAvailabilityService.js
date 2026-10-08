"use strict";

// ============================================================
// AgriNexus GIS
// Sentinel-2 Index Availability Service
// ============================================================
//
// Determines whether a Sentinel-2 remote-sensing index product
// is already available for a requested observation date.
//
// Responsibilities:
//   - Scientific index universe comes from indexRegistry.
//   - Existing production comes from production_metadata.json.
//   - Referenced GeoTIFF files are verified on disk.
//
// This service does NOT:
//   - calculate indices
//   - download Sentinel-2 data
//   - process rasters
//   - trigger production
// ============================================================

const fs = require("node:fs/promises");
const path = require("node:path");

const {
    getAllIndexDefinitions,
} = require(
    "../../../scientific/remoteSensing/indices/indexRegistry"
);

const {
    METADATA_FILE_NAME,
    readProductionMetadata,
} = require(
    "./sentinel2IndexProductionMetadataService"
);

const SENTINEL2_INDEX_AVAILABILITY_SERVICE_VERSION =
    "1.0";

function normalizeDate(value) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return null;
    }

    return value.trim().slice(0, 10);
}

function normalizeIndexCode(value) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return null;
    }

    return value.trim().toUpperCase();
}

function assertNonEmptyString(value, name) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${name} must be a non-empty string.`
        );
    }
}

async function listProductionDirectories(
    productionRoot
) {
    const entries =
        await fs.readdir(
            productionRoot,
            {
                withFileTypes: true,
            }
        );

    return entries
        .filter(
            (entry) =>
                entry.isDirectory()
        )
        .map(
            (entry) =>
                path.join(
                    productionRoot,
                    entry.name
                )
        );
}

async function readManifestIfPresent(
    productionDirectory
) {
    const metadataPath =
        path.join(
            productionDirectory,
            METADATA_FILE_NAME
        );

    try {
        return await readProductionMetadata(
            productionDirectory
        );
    } catch (error) {
        throw new Error(
            `Failed to read production metadata: ${metadataPath}. ${error.message}`
        );
    }
}

async function verifyOutput(
    productionDirectory,
    outputName
) {
    if (
        typeof outputName !== "string" ||
        outputName.trim().length === 0
    ) {
        return false;
    }

    const outputPath =
        path.join(
            productionDirectory,
            outputName
        );

    try {
        const stat =
            await fs.stat(outputPath);

        return (
            stat.isFile() &&
            stat.size > 0
        );
    } catch (_) {
        return false;
    }
}

async function findAvailableProduct({
    productionRoot,
    productionRoots = null,
    acquisitionDate,
    indexCode,
}) {
    const roots =
        Array.isArray(productionRoots) &&
        productionRoots.length > 0
            ? productionRoots
            : [productionRoot];

    const directories = [];

    for (
        const root
        of roots
    ) {
        directories.push(
            root,
            ...(await listProductionDirectories(
                root
            ))
        );
    }

    const normalizedDate =
        normalizeDate(
            acquisitionDate
        );

    const normalizedCode =
        normalizeIndexCode(
            indexCode
        );

    for (
        const productionDirectory
        of directories
    ) {
        const metadata =
            await readManifestIfPresent(
                productionDirectory
            );

        if (
            !metadata ||
            !Array.isArray(
                metadata.products
            )
        ) {
            continue;
        }

        for (
            const product
            of metadata.products
        ) {
            if (
                normalizeDate(
                    product.acquisitionDate
                ) !== normalizedDate
            ) {
                continue;
            }

            if (
                normalizeIndexCode(
                    product.indexCode
                ) !== normalizedCode
            ) {
                continue;
            }

            const continuousAvailable =
                await verifyOutput(
                    productionDirectory,
                    product.outputs?.continuous
                );

            const classificationAvailable =
                await verifyOutput(
                    productionDirectory,
                    product.outputs?.classification
                );

            return {
                status:
                    continuousAvailable &&
                    classificationAvailable
                        ? "AVAILABLE"
                        : "INCOMPLETE",

                indexCode:
                    product.indexCode,

                indexName:
                    product.indexName,

                acquisitionDate:
                    normalizeDate(
                        product.acquisitionDate
                    ),

                sceneId:
                    product.sceneId,

                targetResolution:
                    product.targetResolution,

                productionDirectory,

                outputs: {
                    continuous:
                        product.outputs?.continuous ||
                        null,

                    classification:
                        product.outputs?.classification ||
                        null,
                },

                availability: {
                    continuous:
                        continuousAvailable,

                    classification:
                        classificationAvailable,
                },
            };
        }
    }

    return null;
}

async function getIndexAvailability({
    productionRoot,
    productionRoots = null,
    acquisitionDate,
    indexCode = null,
}) {
    if (
        !(
            Array.isArray(productionRoots) &&
            productionRoots.length > 0
        )
    ) {
        assertNonEmptyString(
            productionRoot,
            "productionRoot"
        );
    }

    const normalizedDate =
        normalizeDate(
            acquisitionDate
        );

    if (!normalizedDate) {
        throw new TypeError(
            "acquisitionDate must be a non-empty date string."
        );
    }

    const definitions =
        getAllIndexDefinitions();

    const selectedDefinitions =
        indexCode
            ? definitions.filter(
                (definition) =>
                    definition.code ===
                    normalizeIndexCode(
                        indexCode
                    )
            )
            : definitions;

    if (
        indexCode &&
        selectedDefinitions.length === 0
    ) {
        throw new Error(
            `Unknown remote-sensing index code: ${indexCode}`
        );
    }

    const results = [];

    for (
        const definition
        of selectedDefinitions
    ) {
        const product =
            await findAvailableProduct({
                productionRoot,
                productionRoots,
                acquisitionDate:
                    normalizedDate,
                indexCode:
                    definition.code,
            });

        if (!product) {
            results.push({
                indexCode:
                    definition.code,

                indexName:
                    definition.name,

                category:
                    definition.category,

                acquisitionDate:
                    normalizedDate,

                status:
                    "MISSING",
            });

            continue;
        }

        results.push({
            ...product,

            category:
                definition.category,
        });
    }

    return {
        serviceVersion:
            SENTINEL2_INDEX_AVAILABILITY_SERVICE_VERSION,

        observationDate:
            normalizedDate,

        results,
    };
}

module.exports = {
    SENTINEL2_INDEX_AVAILABILITY_SERVICE_VERSION,
    normalizeDate,
    normalizeIndexCode,
    getIndexAvailability,
};

