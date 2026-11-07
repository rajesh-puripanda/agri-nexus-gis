"use strict";

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const {
    createSpatialTemporalChangeEvidence,
    validateSpatialTemporalChangeEvidence
} = require("../../scientific/cropIntelligence/spatialTemporalChangeEvidenceContract");

const MANIFEST_FILENAME = "crop-condition-evidence.json";
const MANIFEST_SCHEMA_VERSION = 1;
const PROCESSING_VERSION = "1.0.0";

function isValidIsoDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function buildTemporalChangeRasterFilename(observationDates) {
    if (
        !Array.isArray(observationDates) ||
        observationDates.length !== 2 ||
        !observationDates.every(isValidIsoDate) ||
        observationDates[0] >= observationDates[1]
    ) {
        throw new Error(
            "Valid chronological observation dates are required"
        );
    }

    return (
        `NDVI_CHANGE_${observationDates[0].replace(/-/g, "")}_` +
        `${observationDates[1].replace(/-/g, "")}.tif`
    );
}

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

    const safeIndex = String(indexCode)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

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
        throw new Error(
            "Temporal change persistence currently supports NDVI only"
        );
    }

    if (
        !baseline?.sceneId ||
        !baseline?.date ||
        !comparison?.sceneId ||
        !comparison?.date
    ) {
        throw new Error(
            "Baseline and comparison identities are required"
        );
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

function buildCropConditionEvidenceDirectoryPaths({
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
        manifestPath: path.join(
            outputDirectory,
            MANIFEST_FILENAME
        )
    };
}

function buildCropConditionEvidencePaths({
    projectRoot = process.cwd(),
    comparisonId,
    baselineDate,
    comparisonDate
}) {
    const directoryPaths =
        buildCropConditionEvidenceDirectoryPaths({
            projectRoot,
            comparisonId
        });

    const rasterFileName = buildTemporalChangeRasterFilename([
        baselineDate,
        comparisonDate
    ]);

    return {
        ...directoryPaths,
        rasterFileName,
        rasterPath: path.join(
            directoryPaths.outputDirectory,
            rasterFileName
        )
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

    let rasterFileName;

    try {
        rasterFileName = buildTemporalChangeRasterFilename([
            expectedIdentity?.baseline?.date,
            expectedIdentity?.comparison?.date
        ]);
    } catch {
        return {
            reusable: false,
            reason: "expected_identity_invalid"
        };
    }

    const rasterPath = path.join(
        outputDirectory,
        rasterFileName
    );

    let manifest;

    try {
        const contents = await fs.readFile(
            manifestPath,
            "utf8"
        );

        manifest = JSON.parse(contents);
    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                reusable: false,
                reason: "manifest_missing"
            };
        }

        return {
            reusable: false,
            reason: "manifest_unreadable"
        };
    }

    if (
        manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
        stableStringify(manifest.identity) !==
            stableStringify(expectedIdentity)
    ) {
        return {
            reusable: false,
            reason: "identity_mismatch"
        };
    }

    if (manifest.raster?.fileName !== rasterFileName) {
        return {
            reusable: false,
            reason: "raster_reference_invalid"
        };
    }

    try {
        const stat = await fs.stat(rasterPath);

        if (!stat.isFile() || stat.size <= 0) {
            return {
                reusable: false,
                reason: "raster_invalid"
            };
        }

        if (stat.size !== manifest.raster.byteLength) {
            return {
                reusable: false,
                reason: "raster_size_mismatch"
            };
        }

        if (
            typeof manifest.raster.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(manifest.raster.sha256)
        ) {
            return {
                reusable: false,
                reason: "raster_checksum_missing"
            };
        }

        const actualChecksum =
            await calculateFileSha256(rasterPath);

        if (actualChecksum !== manifest.raster.sha256) {
            return {
                reusable: false,
                reason: "raster_checksum_mismatch"
            };
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                reusable: false,
                reason: "raster_missing"
            };
        }

        throw error;
    }

    const contract =
        manifest.spatialTemporalChangeEvidence;

    const contractValidation =
        validateSpatialTemporalChangeEvidence(contract);

    const manifestEvidence = {
        statistics: manifest.evidence?.statistics,
        method: manifest.evidence?.method,
        calibrationStatus:
            manifest.evidence?.calibrationStatus
    };

    if (
        !contractValidation.valid ||
        stableStringify(contract.identity) !==
            stableStringify(manifest.identity) ||
        stableStringify(contract.raster) !==
            stableStringify(manifest.raster) ||
        stableStringify(contract.evidence) !==
            stableStringify(manifestEvidence) ||
        contract.processingContext?.processingVersion !==
            manifest.identity?.processingVersion
    ) {
        return {
            reusable: false,
            reason: "spatial_temporal_change_evidence_invalid"
        };
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
    const rasterFileName =
        buildTemporalChangeRasterFilename([
            identity?.baseline?.date,
            identity?.comparison?.date
        ]);

    const expectedRasterPath = path.resolve(
        outputDirectory,
        rasterFileName
    );

    if (path.resolve(rasterPath) !== expectedRasterPath) {
        throw new Error(
            "Raster path does not match the evidence output directory"
        );
    }

    const stat = await fs.stat(rasterPath);

    if (!stat.isFile() || stat.size <= 0) {
        throw new Error(
            "Cannot save evidence: output raster is missing or empty"
        );
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

    await fs.mkdir(outputDirectory, {
        recursive: true
    });

    const rasterMetadata = {
        fileName: rasterFileName,
        productCode: result.productCode,
        format: result.format,
        dataType: result.dataType,
        noData: result.noData,
        width: result.width,
        height: result.height,
        pixelCount: result.pixelCount,
        byteLength: stat.size,
        sha256
    };

    const evidenceMetadata = {
        statistics: result.statistics,
        baseline: result.baseline,
        comparison: result.comparison,
        method: result.method,
        calibrationStatus: result.calibrationStatus
    };

    const spatialTemporalChangeEvidence =
        createSpatialTemporalChangeEvidence({
            identity,
            spatialReference: result.spatialReference,
            raster: rasterMetadata,
            evidence: {
                statistics: result.statistics,
                method: result.method,
                calibrationStatus: result.calibrationStatus
            },
            processingContext: {
                processingVersion: identity.processingVersion
            }
        });

    const manifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        identity,
        raster: rasterMetadata,
        evidence: evidenceMetadata,
        spatialTemporalChangeEvidence
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
            {
                encoding: "utf8",
                flag: "wx"
            }
        );

        await fs.rename(
            temporaryPath,
            manifestPath
        );
    } catch (error) {
        await fs.rm(temporaryPath, {
            force: true
        });

        throw error;
    }

    return {
        manifestPath,
        rasterPath,
        manifest
    };
}

async function findPublishedCropConditionEvidence({
    projectRoot = process.cwd(),
    comparisonId
}) {
    let paths;

    try {
        paths = buildCropConditionEvidenceDirectoryPaths({
            projectRoot,
            comparisonId
        });
    } catch {
        return {
            published: false,
            reason: "invalid_comparison_id"
        };
    }

    let manifest;

    try {
        manifest = JSON.parse(
            await fs.readFile(paths.manifestPath, "utf8")
        );
    } catch (error) {
        return {
            published: false,
            reason: error.code === "ENOENT"
                ? "manifest_missing"
                : "manifest_unreadable"
        };
    }

    if (
        !manifest ||
        typeof manifest !== "object" ||
        Array.isArray(manifest)
    ) {
        return {
            published: false,
            reason: "manifest_invalid"
        };
    }

    const identity = manifest.identity;
    const raster = manifest.raster;
    const evidence = manifest.evidence;

    if (
        manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
        identity?.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
        identity?.processingVersion !== PROCESSING_VERSION ||
        identity?.indexCode !== "NDVI" ||
        typeof identity?.baseline?.sceneId !== "string" ||
        !identity.baseline.sceneId ||
        typeof identity?.comparison?.sceneId !== "string" ||
        !identity.comparison.sceneId ||
        identity.baseline.indexCode !== "NDVI" ||
        identity.comparison.indexCode !== "NDVI" ||
        !isValidIsoDate(identity.baseline.date) ||
        !isValidIsoDate(identity.comparison.date) ||
        identity.baseline.date >= identity.comparison.date
    ) {
        return {
            published: false,
            reason: "manifest_identity_invalid"
        };
    }

    const footprint = identity.commonFootprint;
    const spatialContext = footprint?.spatialContext;

    if (
        !Number.isSafeInteger(footprint?.width) ||
        footprint.width <= 0 ||
        !Number.isSafeInteger(footprint?.height) ||
        footprint.height <= 0 ||
        !Array.isArray(footprint.boundingBox) ||
        footprint.boundingBox.length !== 4 ||
        !footprint.boundingBox.every(Number.isFinite) ||
        !Array.isArray(footprint.windows) ||
        footprint.windows.length < 2 ||
        !spatialContext ||
        !Array.isArray(spatialContext.origin) ||
        !Array.isArray(spatialContext.resolution) ||
        !spatialContext.origin.every(Number.isFinite) ||
        !spatialContext.resolution.every(Number.isFinite) ||
        spatialContext.projectedCrsCode == null ||
        spatialContext.rasterType == null
    ) {
        return {
            published: false,
            reason: "manifest_spatial_context_invalid"
        };
    }

    const expectedId = buildCropConditionComparisonId({
        indexCode: identity.indexCode,
        baseline: identity.baseline,
        comparison: identity.comparison
    });

    if (expectedId !== comparisonId) {
        return {
            published: false,
            reason: "comparison_identity_mismatch"
        };
    }

    const rasterFileName =
        buildTemporalChangeRasterFilename([
            identity.baseline.date,
            identity.comparison.date
        ]);

    paths = {
        ...paths,
        rasterFileName,
        rasterPath: path.join(
            paths.outputDirectory,
            rasterFileName
        )
    };

    const expectedPixelCount =
        raster?.width * raster?.height;

    if (
        raster?.fileName !== rasterFileName ||
        raster?.productCode !== "NDVI_TEMPORAL_CHANGE" ||
        raster?.format !== "GeoTIFF" ||
        raster?.dataType !== "Float32" ||
        !Number.isSafeInteger(raster.width) ||
        raster.width <= 0 ||
        !Number.isSafeInteger(raster.height) ||
        raster.height <= 0 ||
        !Number.isSafeInteger(expectedPixelCount) ||
        !Number.isSafeInteger(raster.pixelCount) ||
        raster.pixelCount !== expectedPixelCount ||
        raster.width !== footprint.width ||
        raster.height !== footprint.height ||
        !Number.isSafeInteger(raster.byteLength) ||
        raster.byteLength <= 0 ||
        typeof raster.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(raster.sha256)
    ) {
        return {
            published: false,
            reason: "raster_metadata_invalid"
        };
    }

    if (
        evidence?.baseline?.sceneId !== identity.baseline.sceneId ||
        evidence?.baseline?.date !== identity.baseline.date ||
        evidence?.comparison?.sceneId !== identity.comparison.sceneId ||
        evidence?.comparison?.date !== identity.comparison.date ||
        evidence?.method !== "comparison_minus_baseline" ||
        evidence?.calibrationStatus !== "not_calibrated"
    ) {
        return {
            published: false,
            reason: "evidence_metadata_invalid"
        };
    }

    const contract =
        manifest.spatialTemporalChangeEvidence;

    const contractValidation =
        validateSpatialTemporalChangeEvidence(contract);

    const manifestEvidence = {
        statistics: evidence?.statistics,
        method: evidence?.method,
        calibrationStatus: evidence?.calibrationStatus
    };

    if (
        !contractValidation.valid ||
        stableStringify(contract.identity) !==
            stableStringify(identity) ||
        stableStringify(contract.raster) !==
            stableStringify(raster) ||
        stableStringify(contract.evidence) !==
            stableStringify(manifestEvidence) ||
        contract.processingContext?.processingVersion !==
            identity?.processingVersion
    ) {
        return {
            published: false,
            reason: "spatial_temporal_change_evidence_invalid"
        };
    }

    try {
        const stat = await fs.stat(paths.rasterPath);

        if (
            !stat.isFile() ||
            stat.size !== raster.byteLength
        ) {
            return {
                published: false,
                reason: "raster_size_mismatch"
            };
        }

        const actualChecksum =
            await calculateFileSha256(paths.rasterPath);

        if (actualChecksum !== raster.sha256) {
            return {
                published: false,
                reason: "raster_checksum_mismatch"
            };
        }
    } catch (error) {
        return {
            published: false,
            reason: error.code === "ENOENT"
                ? "raster_missing"
                : "raster_unreadable"
        };
    }

    return {
        published: true,
        comparisonId,
        rasterPath: paths.rasterPath,
        raster,
        evidence,
        identity
    };
}

module.exports = {
    MANIFEST_SCHEMA_VERSION,
    PROCESSING_VERSION,
    MANIFEST_FILENAME,
    buildTemporalChangeRasterFilename,
    buildCropConditionComparisonId,
    buildCropConditionEvidenceIdentity,
    buildCropConditionEvidenceDirectoryPaths,
    buildCropConditionEvidencePaths,
    checkReusableCropConditionEvidence,
    saveCropConditionEvidence,
    findPublishedCropConditionEvidence
};
