"use strict";

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const MANIFEST_FILENAME = "crop-condition-evidence.json";
const RASTER_FILENAME = "NDVI_CHANGE.tif";
const MANIFEST_SCHEMA_VERSION = 1;
const PROCESSING_VERSION = "1.0.0";

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.keys(value)
            .sort()
            .map(key =>
                `${JSON.stringify(key)}:${stableStringify(value[key])}`
            );

        return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value);
}

async function calculateFileSha256(filePath) {
    const hash = crypto.createHash("sha256");
    const file = await fs.open(filePath, "r");

    try {
        const buffer = Buffer.alloc(1024 * 1024);
        let position = 0;

        while (true) {
            const { bytesRead } = await file.read(
                buffer,
                0,
                buffer.length,
                position
            );

            if (bytesRead === 0) break;

            hash.update(buffer.subarray(0, bytesRead));
            position += bytesRead;
        }

        return hash.digest("hex");
    } finally {
        await file.close();
    }
}

function buildCropConditionComparisonId({
    indexCode,
    baseline,
    comparison
}) {
    const identity = {
        indexCode,
        baseline,
        comparison
    };

    const hash = crypto
        .createHash("sha256")
        .update(stableStringify(identity))
        .digest("hex")
        .slice(0, 12);

    const safeIndex = String(indexCode).replace(/[^a-zA-Z0-9_-]/g, "_");

    return [
        "CROP-CONDITION",
        safeIndex,
        baseline.date.replace(/-/g, ""),
        comparison.date.replace(/-/g, ""),
        hash
    ].join("-");
}

function buildCropConditionEvidenceIdentity({
    indexCode,
    baseline,
    comparison,
    commonFootprint,
    spatialContext
}) {
    if (indexCode !== "NDVI") {
        throw new Error("Temporal change persistence currently supports NDVI only");
    }

    if (
        !baseline?.sceneId ||
        !baseline?.date ||
        !comparison?.sceneId ||
        !comparison?.date
    ) {
        throw new Error("Baseline and comparison identities are required");
    }

    if (
        !commonFootprint ||
        !Number.isSafeInteger(commonFootprint.width) ||
        !Number.isSafeInteger(commonFootprint.height) ||
        !Array.isArray(commonFootprint.boundingBox) ||
        !Array.isArray(commonFootprint.windows)
    ) {
        throw new Error("A valid common footprint is required");
    }

    if (
        !spatialContext ||
        !Array.isArray(spatialContext.origin) ||
        !Array.isArray(spatialContext.resolution) ||
        !spatialContext.origin.every(Number.isFinite) ||
        !spatialContext.resolution.every(Number.isFinite) ||
        spatialContext.projectedCrsCode == null ||
        spatialContext.rasterType == null
    ) {
        throw new Error("A valid spatial grid definition is required");
    }

    return {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        processingVersion: PROCESSING_VERSION,
        indexCode,
        baseline: {
            sceneId: baseline.sceneId,
            date: baseline.date,
            indexCode: baseline.indexCode
        },
        comparison: {
            sceneId: comparison.sceneId,
            date: comparison.date,
            indexCode: comparison.indexCode
        },
        commonFootprint: {
            boundingBox: commonFootprint.boundingBox,
            width: commonFootprint.width,
            height: commonFootprint.height,
            windows: commonFootprint.windows,
            spatialContext: {
                origin: spatialContext.origin,
                resolution: spatialContext.resolution,
                projectedCrsCode: spatialContext.projectedCrsCode,
                rasterType: spatialContext.rasterType
            }
        }
    };
}

function buildCropConditionEvidencePaths({
    projectRoot = process.cwd(),
    comparisonId
}) {
    if (
        typeof comparisonId !== "string" ||
        !/^[a-zA-Z0-9_-]+$/.test(comparisonId)
    ) {
        throw new Error("Invalid crop-condition comparison ID");
    }

    const outputDirectory = path.join(
        projectRoot,
        "data",
        "crop-intelligence",
        "condition",
        comparisonId
    );

    return {
        comparisonId,
        outputDirectory,
        rasterPath: path.join(outputDirectory, RASTER_FILENAME),
        manifestPath: path.join(outputDirectory, MANIFEST_FILENAME)
    };
}

async function checkReusableCropConditionEvidence({
    outputDirectory,
    expectedIdentity
}) {
    const manifestPath = path.join(
        outputDirectory,
        MANIFEST_FILENAME
    );

    const rasterPath = path.join(
        outputDirectory,
        RASTER_FILENAME
    );

    let manifest;

    try {
        const contents = await fs.readFile(manifestPath, "utf8");
        manifest = JSON.parse(contents);
    } catch (error) {
        if (error.code === "ENOENT") {
            return { reusable: false, reason: "manifest_missing" };
        }

        return { reusable: false, reason: "manifest_unreadable" };
    }

    if (
        manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
        stableStringify(manifest.identity) !==
            stableStringify(expectedIdentity)
    ) {
        return { reusable: false, reason: "identity_mismatch" };
    }

    if (manifest.raster?.fileName !== RASTER_FILENAME) {
        return { reusable: false, reason: "raster_reference_invalid" };
    }

    try {
        const stat = await fs.stat(rasterPath);

        if (!stat.isFile() || stat.size <= 0) {
            return { reusable: false, reason: "raster_invalid" };
        }

        if (stat.size !== manifest.raster.byteLength) {
            return { reusable: false, reason: "raster_size_mismatch" };
        }

        if (
            typeof manifest.raster.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(manifest.raster.sha256)
        ) {
            return { reusable: false, reason: "raster_checksum_missing" };
        }

        const actualChecksum = await calculateFileSha256(rasterPath);

        if (actualChecksum !== manifest.raster.sha256) {
            return { reusable: false, reason: "raster_checksum_mismatch" };
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            return { reusable: false, reason: "raster_missing" };
        }

        throw error;
    }

    return {
        reusable: true,
        reason: "identity_and_raster_match",
        rasterPath,
        evidence: manifest.evidence,
        rasterMetadata: manifest.raster,
        manifest
    };
}

async function saveCropConditionEvidence({
    outputDirectory,
    rasterPath,
    identity,
    result
}) {
    const expectedRasterPath = path.resolve(
        outputDirectory,
        RASTER_FILENAME
    );

    if (path.resolve(rasterPath) !== expectedRasterPath) {
        throw new Error("Raster path does not match the evidence output directory");
    }

    const stat = await fs.stat(rasterPath);

    if (!stat.isFile() || stat.size <= 0) {
        throw new Error("Cannot save evidence: output raster is missing or empty");
    }

    const sha256 = await calculateFileSha256(rasterPath);

    if (
        !result ||
        !result.statistics ||
        !result.baseline ||
        !result.comparison
    ) {
        throw new Error("Temporal change result is incomplete");
    }

    await fs.mkdir(outputDirectory, { recursive: true });

    const manifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        identity,
        raster: {
            fileName: RASTER_FILENAME,
            productCode: result.productCode,
            format: result.format,
            dataType: result.dataType,
            noData: result.noData,
            width: result.width,
            height: result.height,
            pixelCount: result.pixelCount,
            byteLength: stat.size,
            sha256
        },
        evidence: {
            statistics: result.statistics,
            baseline: result.baseline,
            comparison: result.comparison,
            method: result.method,
            calibrationStatus: result.calibrationStatus
        }
    };

    const manifestPath = path.join(
        outputDirectory,
        MANIFEST_FILENAME
    );

    const temporaryPath = path.join(
        outputDirectory,
        `${MANIFEST_FILENAME}.${process.pid}.${crypto.randomUUID()}.tmp`
    );

    try {
        await fs.writeFile(
            temporaryPath,
            JSON.stringify(manifest, null, 2),
            { encoding: "utf8", flag: "wx" }
        );

        await fs.rename(temporaryPath, manifestPath);
    } catch (error) {
        await fs.rm(temporaryPath, { force: true });
        throw error;
    }

    return {
        manifestPath,
        rasterPath,
        manifest
    };
}

module.exports = {
    MANIFEST_SCHEMA_VERSION,
    PROCESSING_VERSION,
    MANIFEST_FILENAME,
    RASTER_FILENAME,
    buildCropConditionComparisonId,
    buildCropConditionEvidenceIdentity,
    buildCropConditionEvidencePaths,
    checkReusableCropConditionEvidence,
    saveCropConditionEvidence
};
