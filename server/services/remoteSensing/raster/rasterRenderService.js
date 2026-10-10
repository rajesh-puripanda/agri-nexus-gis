"use strict";

const crypto = require("node:crypto");
const fs = require("fs/promises");
const path = require("path");

const {
    createWebMercatorRaster
} = require("./webMercatorRasterService");

const RENDER_CACHE_DIRECTORY = path.resolve(
    __dirname,
    "../../../../data/remote-sensing/render-cache"
);

const DEFAULT_RENDER_SIZE = 1200;

function getRenderCachePath(sourcePath, indexCode, type) {
    const normalizedCode =
        String(indexCode).trim().toUpperCase();

    const normalizedType =
        String(type).trim().toLowerCase();

    const suffix =
        normalizedType === "index"
            ? "_index.tif"
            : normalizedType === "classification"
                ? "_classification.tif"
                : null;

    if (!suffix) {
        throw new Error("Unsupported raster render type.");
    }

    const sourceHash = crypto
        .createHash("sha256")
        .update(path.resolve(sourcePath))
        .digest("hex")
        .slice(0, 16);

    return path.join(
        RENDER_CACHE_DIRECTORY,
        `${normalizedCode}_${sourceHash}_webmercator_v1${suffix}`
    );
}

function getMetadataPath(cachePath) {
    return `${cachePath}.source.json`;
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

async function createRasterRenderCache({
    sourcePath,
    indexCode,
    type,
    maxSize = DEFAULT_RENDER_SIZE
}) {
    const cachePath = getRenderCachePath(
        sourcePath,
        indexCode,
        type
    );

    const result = await createWebMercatorRaster({
        sourcePath,
        maxSize
    });

    await fs.mkdir(RENDER_CACHE_DIRECTORY, {
        recursive: true
    });

    const sourceStat = await fs.stat(sourcePath);

    await writeAtomically(
        cachePath,
        Buffer.from(result.arrayBuffer)
    );

    await writeAtomically(
        getMetadataPath(cachePath),
        JSON.stringify({
            sourceSize: sourceStat.size,
            sourceMtimeMs: sourceStat.mtimeMs,
            maxSize
        })
    );

    return {
        cachePath,
        width: result.width,
        height: result.height,
        sourceWidth: result.sourceWidth,
        sourceHeight: result.sourceHeight,
        sourceEpsg: result.sourceEpsg,
        targetEpsg: result.targetEpsg,
        boundingBox: result.boundingBox
    };
}

async function ensureRasterRenderCache({
    sourcePath,
    indexCode,
    type,
    maxSize = DEFAULT_RENDER_SIZE
}) {
    const cachePath = getRenderCachePath(
        sourcePath,
        indexCode,
        type
    );

    const sourceStat = await fs.stat(sourcePath);

    let cacheStat;
    let metadata;

    try {
        [cacheStat, metadata] = await Promise.all([
            fs.stat(cachePath),
            fs.readFile(getMetadataPath(cachePath), "utf8")
                .then(JSON.parse)
        ]);
    } catch (error) {
        if (
            error.code !== "ENOENT" &&
            !(error instanceof SyntaxError)
        ) {
            throw error;
        }
    }

    if (
        cacheStat &&
        metadata &&
        metadata.sourceSize === sourceStat.size &&
        metadata.sourceMtimeMs === sourceStat.mtimeMs &&
        metadata.maxSize === maxSize
    ) {
        return {
            cachePath,
            reused: true
        };
    }

    const result = await createRasterRenderCache({
        sourcePath,
        indexCode,
        type,
        maxSize
    });

    return {
        ...result,
        reused: false
    };
}

module.exports = {
    RENDER_CACHE_DIRECTORY,
    DEFAULT_RENDER_SIZE,
    getRenderCachePath,
    createRasterRenderCache,
    ensureRasterRenderCache
};
