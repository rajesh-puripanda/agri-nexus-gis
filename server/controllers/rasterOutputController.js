"use strict";

const path = require("path");
const fs = require("fs");

const {
    hasIndexDefinition
} = require(
    "../scientific/remoteSensing/indices/indexRegistry"
);

const OUTPUT_DIRECTORY = path.resolve(
    __dirname,
    "../../data/remote-sensing/outputs"
);

const OUTPUT_TYPES = Object.freeze({
    index: "index",
    classification: "classification"
});

function getOutputPath(indexCode, type) {
    const normalizedCode =
        String(indexCode).trim().toUpperCase();

    const normalizedType =
        String(type).trim().toLowerCase();

    if (!hasIndexDefinition(normalizedCode)) {
        return null;
    }

    const suffix =
        normalizedType === OUTPUT_TYPES.index
            ? "_index.tif"
            : normalizedType === OUTPUT_TYPES.classification
                ? "_classification.tif"
                : null;

    if (!suffix) {
        return null;
    }

    return path.join(
        OUTPUT_DIRECTORY,
        `${normalizedCode}${suffix}`
    );
}

function serveRasterOutput(req, res) {
    try {
        const outputPath =
            getOutputPath(
                req.params.indexCode,
                req.params.type
            );

        if (!outputPath) {
            return res.status(400).json({
                success: false,
                code: "INVALID_RASTER_OUTPUT_REQUEST",
                message: "Invalid raster output request."
            });
        }

        if (!fs.existsSync(outputPath)) {
            return res.status(404).json({
                success: false,
                code: "RASTER_OUTPUT_NOT_FOUND",
                message: "Requested raster output was not found."
            });
        }

        return res.sendFile(outputPath);
    } catch (error) {
        console.error(
            "Raster output delivery error:",
            error
        );

        return res.status(500).json({
            success: false,
            code: "RASTER_OUTPUT_DELIVERY_ERROR",
            message:
                error.message ||
                "Failed to deliver raster output."
        });
    }
}

module.exports = {
    serveRasterOutput
};