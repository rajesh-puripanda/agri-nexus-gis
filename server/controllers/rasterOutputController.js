"use strict";

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const {
    ensureRasterRenderCache
} = require("../services/remoteSensing/raster/rasterRenderService");

const {
    hasIndexDefinition
} = require("../scientific/remoteSensing/indices/indexRegistry");

const OUTPUT_DIRECTORY = path.resolve(
    __dirname,
    "../../data/remote-sensing/outputs"
);

const PRODUCTION_DIRECTORY = path.resolve(
    __dirname,
    "../../data/remote-sensing/production"
);

const OUTPUT_TYPES = Object.freeze({
    index: "index",
    classification: "classification"
});

function normalizeDate(value) {
    const date = String(value || "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function getOutputPath(indexCode, type) {
    const code = String(indexCode || "").trim().toUpperCase();
    const normalizedType = String(type || "").trim().toLowerCase();

    if (!hasIndexDefinition(code)) return null;

    const suffix =
        normalizedType === OUTPUT_TYPES.index
            ? "_index.tif"
            : normalizedType === OUTPUT_TYPES.classification
                ? "_classification.tif"
                : null;

    return suffix ? path.join(OUTPUT_DIRECTORY, `${code}${suffix}`) : null;
}

async function findProductionOutputPath({
    indexCode,
    type,
    sceneId,
    acquisitionDate
}) {
    const code = String(indexCode || "").trim().toUpperCase();
    const normalizedType = String(type || "").trim().toLowerCase();
    const date = normalizeDate(acquisitionDate);

    if (!hasIndexDefinition(code) && code !== "LAI") {
        const error = new Error("Unknown raster index code.");
        error.statusCode = 400;
        throw error;
    }

    if (code === "LAI" && normalizedType !== OUTPUT_TYPES.index) {
        const error = new Error(
            "LAI supports continuous raster output only."
        );
        error.statusCode = 400;
        throw error;
    }

    if (!sceneId || !date) {
        const error = new Error(
            "sceneId and a valid acquisitionDate are required together."
        );
        error.statusCode = 400;
        throw error;
    }

    const outputKey =
        normalizedType === OUTPUT_TYPES.index
            ? "continuous"
            : normalizedType === OUTPUT_TYPES.classification
                ? "classification"
                : null;

    if (!outputKey) {
        const error = new Error("Unsupported raster output type.");
        error.statusCode = 400;
        throw error;
    }

    async function visit(directory) {
        let entries;
        try {
            entries = await fsp.readdir(directory, { withFileTypes: true });
        } catch (error) {
            if (error.code === "ENOENT") return null;
            throw error;
        }

        const manifestEntry = entries.find(
            entry =>
                entry.isFile() &&
                entry.name === "production_metadata.json"
        );

        if (manifestEntry) {
            const manifestPath = path.join(directory, manifestEntry.name);
            const manifest = JSON.parse(
                await fsp.readFile(manifestPath, "utf8")
            );

            if (
                manifest.manifestType === "SENTINEL2_INDEX_PRODUCTION" &&
                Array.isArray(manifest.products)
            ) {
                for (const product of manifest.products) {
                    if (
                        String(product.indexCode || product.productCode || "").toUpperCase() !== code ||
                        String(product.sceneId || "") !== String(sceneId) ||
                        normalizeDate(product.acquisitionDate) !== date
                    ) {
                        continue;
                    }

                    const filename = product.outputs?.[outputKey];

                    // Manifest output paths must be plain filenames.
                    if (
                        typeof filename !== "string" ||
                        !filename ||
                        filename !== path.basename(filename)
                    ) {
                        throw new Error(
                            `Unsafe ${outputKey} filename in production manifest.`
                        );
                    }

                    if (product.availability?.[outputKey] !== true) {
                        continue;
                    }

                    const resolved = path.resolve(directory, filename);
                    const relative = path.relative(directory, resolved);

                    if (
                        relative.startsWith("..") ||
                        path.isAbsolute(relative)
                    ) {
                        throw new Error(
                            "Production output escaped its manifest directory."
                        );
                    }

                    try {
                        const stat = await fsp.stat(resolved);
                        if (stat.isFile() && stat.size > 0) {
                            return resolved;
                        }
                    } catch (error) {
                        if (error.code !== "ENOENT") throw error;
                    }
                }
            }
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const found = await visit(path.join(directory, entry.name));
            if (found) return found;
        }

        return null;
    }

    const found = await visit(PRODUCTION_DIRECTORY);

    if (!found) {
        const error = new Error(
            `No ${code} ${normalizedType} raster is available for scene ${sceneId} on ${date}.`
        );
        error.statusCode = 404;
        error.code = "OBSERVATION_RASTER_NOT_FOUND";
        throw error;
    }

    return found;
}

function getObservationRequest(req) {
    const sceneId = req.query?.sceneId;
    const acquisitionDate =
        req.query?.observationDate || req.query?.acquisitionDate;

    // Do not use the legacy output directory when an observation was requested.
    if (sceneId || acquisitionDate) {
        if (!sceneId || !acquisitionDate) {
            const error = new Error(
                "sceneId and observationDate must be supplied together."
            );
            error.statusCode = 400;
            throw error;
        }

        return { sceneId, acquisitionDate };
    }

    return null;
}

async function resolveRequestOutputPath(req) {
    const observation = getObservationRequest(req);

    if (observation) {
        return findProductionOutputPath({
            indexCode: req.params.indexCode,
            type: req.params.type,
            ...observation
        });
    }

    const outputPath = getOutputPath(
        req.params.indexCode,
        req.params.type
    );

    if (!outputPath) {
        const error = new Error("Invalid raster output request.");
        error.statusCode = 400;
        throw error;
    }

    return outputPath;
}

function sendError(res, error, defaultCode, defaultMessage) {
    const status = Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;

    return res.status(status).json({
        success: false,
        code: error.code || defaultCode,
        message: error.message || defaultMessage
    });
}

async function serveRasterOutput(req, res) {
    try {
        const outputPath = await resolveRequestOutputPath(req);

        if (!fs.existsSync(outputPath)) {
            return res.status(404).json({
                success: false,
                code: "RASTER_OUTPUT_NOT_FOUND",
                message: "Requested raster output was not found."
            });
        }

        return res.sendFile(outputPath);
    } catch (error) {
        console.error("Raster output delivery error:", error);
        return sendError(
            res,
            error,
            "RASTER_OUTPUT_DELIVERY_ERROR",
            "Failed to deliver raster output."
        );
    }
}

async function serveRasterRender(req, res) {
    try {
        const sourcePath = await resolveRequestOutputPath(req);

        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({
                success: false,
                code: "RASTER_OUTPUT_NOT_FOUND",
                message: "Requested raster output was not found."
            });
        }

        const result = await ensureRasterRenderCache({
            sourcePath,
            indexCode: req.params.indexCode,
            type: req.params.type
        });

        return res.sendFile(result.cachePath);
    } catch (error) {
        console.error("Raster render delivery error:", error);
        return sendError(
            res,
            error,
            "RASTER_RENDER_DELIVERY_ERROR",
            "Failed to deliver raster render."
        );
    }
}

async function serveSoilVegetationClassification(req, res) {
    try {
        const sceneId = String(req.params.sceneId || "");

        if (!/^[A-Za-z0-9_-]+$/.test(sceneId)) {
            return res.status(400).json({
                success: false,
                code: "INVALID_SCENE_ID",
                message: "Invalid scene ID."
            });
        }

        const outputPath = path.join(
            PRODUCTION_DIRECTORY,
            sceneId,
            "soil_vegetation_classification.tif"
        );

        const stat = await fsp.stat(outputPath).catch(error => {
            if (error.code === "ENOENT") return null;
            throw error;
        });

        if (!stat?.isFile() || stat.size === 0) {
            return res.status(404).json({
                success: false,
                code: "ANALYSIS_CLASSIFICATION_NOT_FOUND",
                message: "Soil/vegetation classification is unavailable."
            });
        }

        return res.sendFile(outputPath);
    } catch (error) {
        return sendError(
            res,
            error,
            "ANALYSIS_CLASSIFICATION_DELIVERY_ERROR",
            "Failed to deliver soil/vegetation classification."
        );
    }
}

async function serveBareSoilFrequency(req, res) {
    try {
        const outputPath = path.resolve(
            __dirname,
            "../../data/remote-sensing/temporal-analysis/bare-soil-frequency-20260908-20260928/BARE_SOIL_FREQUENCY.tif"
        );

        const stat = await fsp.stat(outputPath).catch(error => {
            if (error.code === "ENOENT") return null;
            throw error;
        });

        if (!stat?.isFile() || stat.size === 0) {
            return res.status(404).json({
                success: false,
                code: "BARE_SOIL_FREQUENCY_NOT_FOUND",
                message: "Bare Soil Frequency raster is unavailable."
            });
        }

        return res.sendFile(outputPath);
    } catch (error) {
        return sendError(
            res,
            error,
            "BARE_SOIL_FREQUENCY_DELIVERY_ERROR",
            "Failed to deliver Bare Soil Frequency raster."
        );
    }
}

module.exports = {
    getOutputPath,
    findProductionOutputPath,
    serveRasterOutput,
    serveRasterRender,
    serveSoilVegetationClassification,
    serveBareSoilFrequency
};
