"use strict";

const crypto = require("node:crypto");
const fs = require("fs/promises");
const path = require("path");

const {
    createWebMercatorRaster
} = require("../remoteSensing/raster/webMercatorRasterService");

const RENDER_CACHE_DIRECTORY = path.resolve(
    __dirname,
    "../../../data/crop-intelligence/render-cache"
);

const DEFAULT_RENDER_SIZE = 1200;
const RENDER_VERSION = 1;

function getCachePath(comparisonId) {
    const hash = crypto
        .createHash("sha256")
        .update(String(comparisonId))
        .digest("hex")
        .slice(0, 20);

    return path.join(
        RENDER_CACHE_DIRECTORY,
        `NDVI_CHANGE_${hash}_webmercator_v${RENDER_VERSION}.tif`
    );
}

async function writeAtomically(filePath, content) {
    const temporaryPath =
        `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;

    try {
        await fs.writeFile(temporaryPath, content);
        await fs.rename(temporaryPath, filePath);
    } catch (error) {
        await fs.rm(temporaryPath, { force: true }).catch(() => {});
        throw error;
    }
}

async function ensureCropConditionTemporalRasterRenderCache({
    comparisonId,
    sourcePath,
    maxSize = DEFAULT_RENDER_SIZE
}) {
    if (
        typeof comparisonId !== "string" ||
        !comparisonId.trim() ||
        !sourcePath
    ) {
        throw new TypeError(
            "comparisonId and sourcePath are required."
        );
    }

    if (!Number.isInteger(maxSize) || maxSize < 1) {
        throw new TypeError("maxSize must be a positive integer.");
    }

    const cachePath = getCachePath(comparisonId);
    const metadataPath = `${cachePath}.source.json`;
    const sourceStat = await fs.stat(sourcePath);

    let metadata;

    try {
        const [cacheStat, metadataContent] = await Promise.all([
            fs.stat(cachePath),
            fs.readFile(metadataPath, "utf8")
        ]);

        metadata = JSON.parse(metadataContent);

        if (
            cacheStat.isFile() &&
            metadata.sourceSize === sourceStat.size &&
            metadata.sourceMtimeMs === sourceStat.mtimeMs &&
            metadata.maxSize === maxSize &&
            metadata.renderVersion === RENDER_VERSION
        ) {
            return {
                cachePath,
                reused: true
            };
        }
    } catch (error) {
        if (
            error.code !== "ENOENT" &&
            !(error instanceof SyntaxError)
        ) {
            throw error;
        }
    }

    const result = await createWebMercatorRaster({
        sourcePath,
        maxSize
    });

    await fs.mkdir(RENDER_CACHE_DIRECTORY, {
        recursive: true
    });

    await writeAtomically(
        cachePath,
        Buffer.from(result.arrayBuffer)
    );

    await writeAtomically(
        metadataPath,
        JSON.stringify({
            comparisonId,
            sourceSize: sourceStat.size,
            sourceMtimeMs: sourceStat.mtimeMs,
            maxSize,
            renderVersion: RENDER_VERSION,
            sourceEpsg: result.sourceEpsg,
            targetEpsg: result.targetEpsg,
            width: result.width,
            height: result.height
        })
    );

    return {
        cachePath,
        reused: false,
        width: result.width,
        height: result.height,
        sourceEpsg: result.sourceEpsg,
        targetEpsg: result.targetEpsg,
        boundingBox: result.boundingBox
    };
}

module.exports = {
    DEFAULT_RENDER_SIZE,
    ensureCropConditionTemporalRasterRenderCache
};