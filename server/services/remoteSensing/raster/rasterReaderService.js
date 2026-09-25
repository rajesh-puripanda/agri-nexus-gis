"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterReaderService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.1  GeoTIFF Reader Service
//
// Responsibility:
//   Read a GeoTIFF and expose a normalized raster representation.
//
// Scientific calculations must NOT be performed here.
//
// ============================================================

const fs = require("node:fs/promises");
const path = require("node:path");

const geotiff = require("geotiff");

function assertRasterFilePath(filePath) {
    if (typeof filePath !== "string" || filePath.trim() === "") {
        throw new TypeError("GeoTIFF file path is required.");
    }

    const extension = path.extname(filePath).toLowerCase();

    if (extension !== ".tif" && extension !== ".tiff") {
        throw new Error(
            `Unsupported raster file extension "${extension}". Expected .tif or .tiff.`
        );
    }
}

function normalizeGeoKeys(geoKeys) {
    return geoKeys && typeof geoKeys === "object"
        ? { ...geoKeys }
        : {};
}

async function readGeoTiff(filePath) {
    assertRasterFilePath(filePath);

    const fileBuffer = await fs.readFile(filePath);

    const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const tiff = await geotiff.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const samplesPerPixel = image.getSamplesPerPixel();

    const data = await image.readRasters({
        interleave: false
    });

    const noData =
        typeof image.getGDALNoData === "function"
            ? image.getGDALNoData()
            : undefined;

    const origin =
        typeof image.getOrigin === "function"
            ? image.getOrigin()
            : undefined;

    const resolution =
        typeof image.getResolution === "function"
            ? image.getResolution()
            : undefined;

    const boundingBox =
        typeof image.getBoundingBox === "function"
            ? image.getBoundingBox()
            : undefined;

    const geoKeys =
        typeof image.getGeoKeys === "function"
            ? normalizeGeoKeys(image.getGeoKeys())
            : {};

    const fileDirectory = image.fileDirectory;

    return {
        width,
        height,
        samplesPerPixel,
        data: Array.from(data),
        noData,
        origin,
        resolution,
        boundingBox,
        geoKeys,
        metadata: {
            fileName: path.basename(filePath),
            filePath,
            imageCount: await tiff.getImageCount(),
            bitsPerSample:
                fileDirectory &&
                typeof fileDirectory.getValue === "function"
                    ? fileDirectory.getValue("BitsPerSample")
                    : undefined,
            sampleFormat:
                fileDirectory &&
                typeof fileDirectory.getValue === "function"
                    ? fileDirectory.getValue("SampleFormat")
                    : undefined,
            photometricInterpretation:
                fileDirectory &&
                typeof fileDirectory.getValue === "function"
                    ? fileDirectory.getValue("PhotometricInterpretation")
                    : undefined
        }
    };
}

module.exports = {
    readGeoTiff
};
