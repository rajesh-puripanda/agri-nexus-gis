"use strict";

// ============================================================
// AgriNexus GIS
// Sentinel-2 Index Production Metadata Service
// ============================================================
//
// Writes the authoritative metadata manifest alongside
// successfully produced Sentinel-2 index GeoTIFF outputs.
//
// One production directory may contain multiple index products.
// Therefore the manifest maintains a products[] collection.
//
// This service does NOT calculate scientific indices.
// ============================================================

const fs = require("node:fs/promises");
const path = require("node:path");

const SENTINEL2_INDEX_PRODUCTION_METADATA_VERSION = "1.0";

const METADATA_FILE_NAME =
    "production_metadata.json";

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

function assertObject(value, name) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError(
            `${name} must be an object.`
        );
    }
}

function normalizeDate(value) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return null;
    }

    return value.trim().slice(0, 10);
}

function buildProductMetadata({
    workflowResult,
    outputDirectory
}) {
    assertObject(
        workflowResult,
        "workflowResult"
    );

    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );

    if (
        !workflowResult.outputProcessing ||
        typeof workflowResult.outputProcessing !== "object"
    ) {
        throw new Error(
            "workflowResult.outputProcessing is required."
        );
    }

    const outputPaths =
        workflowResult.outputProcessing.outputPaths;

    if (
        !outputPaths ||
        typeof outputPaths !== "object"
    ) {
        throw new Error(
            "workflowResult.outputProcessing.outputPaths is required."
        );
    }

    assertNonEmptyString(
        outputPaths.continuous,
        "outputPaths.continuous"
    );

    assertNonEmptyString(
        outputPaths.classification,
        "outputPaths.classification"
    );

    return {
        indexCode:
            workflowResult.indexCode,

        indexName:
            workflowResult.indexName,

        sceneId:
            workflowResult.sceneId,

        acquisitionDate:
            normalizeDate(
                workflowResult.acquisitionDate
            ),

        targetResolution:
            workflowResult.targetResolution,

        workflowVersion:
            workflowResult.workflowVersion,

        requiredBands:
            workflowResult.requiredBands,

        outputs: {
            continuous:
                path.basename(
                    outputPaths.continuous
                ),

            classification:
                path.basename(
                    outputPaths.classification
                )
        },


    };
}

async function writeJsonAtomically(
    filePath,
    value
) {
    const directory =
        path.dirname(filePath);

    await fs.mkdir(
        directory,
        { recursive: true }
    );

    const temporaryPath =
        `${filePath}.tmp-${process.pid}-${Date.now()}`;

    try {
        await fs.writeFile(
            temporaryPath,
            JSON.stringify(
                value,
                null,
                2
            ),
            "utf8"
        );

        await fs.rename(
            temporaryPath,
            filePath
        );
    } catch (error) {
        try {
            await fs.unlink(
                temporaryPath
            );
        } catch (_) {
            // Ignore cleanup failure.
        }

        throw error;
    }
}

async function readProductionMetadata(
    outputDirectory
) {
    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );

    const metadataPath =
        path.join(
            outputDirectory,
            METADATA_FILE_NAME
        );

    try {
        const text =
            await fs.readFile(
                metadataPath,
                "utf8"
            );

        return JSON.parse(text);
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }

        throw error;
    }
}

async function writeProductionMetadata({
    workflowResult,
    outputDirectory
}) {
    const product =
        buildProductMetadata({
            workflowResult,
            outputDirectory
        });

    const metadataPath =
        path.join(
            outputDirectory,
            METADATA_FILE_NAME
        );

    const existing =
        await readProductionMetadata(
            outputDirectory
        );

    const products =
        Array.isArray(
            existing?.products
        )
            ? existing.products
            : [];

    const productKey =
        `${product.indexCode}|${product.sceneId}|${product.acquisitionDate}`;

    const filteredProducts =
        products.filter(
            (item) =>
                `${item.indexCode}|${item.sceneId}|${item.acquisitionDate}` !==
                productKey
        );

    filteredProducts.push({
        ...product,

        availability: {
            continuous: true,
            classification: true
        }
    });

    const metadata = {
        metadataVersion:
            SENTINEL2_INDEX_PRODUCTION_METADATA_VERSION,

        manifestType:
            "SENTINEL2_INDEX_PRODUCTION",

        observation: {
            sceneId:
                workflowResult.sceneId,

            acquisitionDate:
                normalizeDate(
                    workflowResult.acquisitionDate
                )
        },

        products:
            filteredProducts,

        updatedAt:
            new Date().toISOString()
    };

    await writeJsonAtomically(
        metadataPath,
        metadata
    );

    return {
        metadataPath,
        metadata
    };
}

module.exports = {
    SENTINEL2_INDEX_PRODUCTION_METADATA_VERSION,
    METADATA_FILE_NAME,
    buildProductMetadata,
    readProductionMetadata,
    writeProductionMetadata
};

