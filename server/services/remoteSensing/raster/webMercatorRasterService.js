"use strict";

const geotiff = require("geotiff");
const proj4 = require("proj4");

const SOURCE_CRS_PREFIX = "EPSG:";

// Create a display-sized raster whose pixels are actually reprojected
// into Web Mercator. The analytical source file is never modified.
async function createWebMercatorRaster({
    sourcePath,
    maxSize = 1200
}) {
    if (!Number.isInteger(maxSize) || maxSize < 1) {
        throw new TypeError("maxSize must be a positive integer.");
    }

    const tiff = await geotiff.fromFile(sourcePath);
    const image = await tiff.getImage();

    const sourceWidth = image.getWidth();
    const sourceHeight = image.getHeight();
    const bbox = image.getBoundingBox();
    const geoKeys = image.getGeoKeys() || {};
    const sourceEpsg = geoKeys.ProjectedCSTypeGeoKey;

    if (
        !Number.isInteger(sourceEpsg) ||
        sourceEpsg < 1 ||
        !bbox ||
        bbox.length !== 4 ||
        bbox.some(value => !Number.isFinite(value))
    ) {
        throw new Error(
            "A valid projected CRS and raster bounding box are required."
        );
    }

    const sourceCrs = `${SOURCE_CRS_PREFIX}${sourceEpsg}`;
    const rawNoData = image.getGDALNoData();
    const parsedNoData =
        rawNoData === undefined || rawNoData === null
            ? undefined
            : Number(rawNoData);
    const sourceNoData =
        parsedNoData !== undefined && Number.isFinite(parsedNoData)
            ? parsedNoData
            : undefined;

    // Read a reduced source grid first to keep display processing bounded.
    const sourceScale = Math.min(
        1,
        maxSize / Math.max(sourceWidth, sourceHeight)
    );

    const reducedWidth = Math.max(
        1,
        Math.round(sourceWidth * sourceScale)
    );
    const reducedHeight = Math.max(
        1,
        Math.round(sourceHeight * sourceScale)
    );

    const sourceRaster = await image.readRasters({
        samples: [0],
        width: reducedWidth,
        height: reducedHeight,
        resampleMethod: "nearest"
    });

    const sourceValues = sourceRaster[0];

    // Sample the perimeter, not only the corners, to estimate the
    // projected envelope under the nonlinear CRS transformation.
    const perimeter = [];
    const steps = 32;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = bbox[0] + (bbox[2] - bbox[0]) * t;
        const y = bbox[1] + (bbox[3] - bbox[1]) * t;

        perimeter.push([x, bbox[1]], [x, bbox[3]]);
        perimeter.push([bbox[0], y], [bbox[2], y]);
    }

    const projected = perimeter.map(point =>
        proj4(sourceCrs, "EPSG:3857", point)
    );

    const finitePoints = projected.filter(point =>
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        Math.abs(point[1]) < 20037508.342789244
    );

    if (finitePoints.length < 4) {
        throw new Error("Unable to transform raster bounds to Web Mercator.");
    }

    const minX = Math.min(...finitePoints.map(p => p[0]));
    const maxX = Math.max(...finitePoints.map(p => p[0]));
    const minY = Math.min(...finitePoints.map(p => p[1]));
    const maxY = Math.max(...finitePoints.map(p => p[1]));

    const extentWidth = maxX - minX;
    const extentHeight = maxY - minY;

    if (
        !Number.isFinite(extentWidth) ||
        !Number.isFinite(extentHeight) ||
        extentWidth <= 0 ||
        extentHeight <= 0
    ) {
        throw new Error("Invalid Web Mercator raster extent.");
    }

    const scale = Math.min(
        1,
        maxSize / Math.max(reducedWidth, reducedHeight)
    );

    const width = Math.max(1, Math.round(reducedWidth * scale));
    const height = Math.max(1, Math.round(reducedHeight * scale));

    // Use the extent's aspect ratio for the display grid.
    const aspectScale = Math.min(
        maxSize / extentWidth,
        maxSize / extentHeight
    );

    const outputWidth = Math.max(1, Math.min(
        maxSize,
        Math.round(extentWidth * aspectScale)
    ));
    const outputHeight = Math.max(1, Math.min(
        maxSize,
        Math.round(extentHeight * aspectScale)
    ));

    // Float32 preserves negative NoData sentinels even when the source
    // classification raster uses an unsigned integer pixel type.
    const output = new Float32Array(
        outputWidth * outputHeight
    );

    const fillValue = sourceNoData !== undefined
        ? sourceNoData
        : 0;

    output.fill(fillValue);

    const pixelWidth = extentWidth / outputWidth;
    const pixelHeight = extentHeight / outputHeight;

    for (let row = 0; row < outputHeight; row++) {
        const mercatorY = maxY - (row + 0.5) * pixelHeight;

        for (let col = 0; col < outputWidth; col++) {
            const mercatorX = minX + (col + 0.5) * pixelWidth;

            const [sourceX, sourceY] = proj4(
                "EPSG:3857",
                sourceCrs,
                [mercatorX, mercatorY]
            );

            const sourceCol = Math.floor(
                ((sourceX - bbox[0]) / (bbox[2] - bbox[0])) *
                reducedWidth
            );

            const sourceRow = Math.floor(
                ((bbox[3] - sourceY) / (bbox[3] - bbox[1])) *
                reducedHeight
            );

            if (
                sourceCol < 0 ||
                sourceCol >= reducedWidth ||
                sourceRow < 0 ||
                sourceRow >= reducedHeight
            ) {
                continue;
            }

            const value =
                sourceValues[sourceRow * reducedWidth + sourceCol];

            if (
                sourceNoData !== undefined &&
                Object.is(value, sourceNoData)
            ) {
                continue;
            }

            if (Number.isFinite(value)) {
                output[row * outputWidth + col] = value;
            }
        }
    }

    const arrayBuffer = await geotiff.writeArrayBuffer(output, {
        width: outputWidth,
        height: outputHeight,
        ModelPixelScale: [pixelWidth, pixelHeight, 0],
        ModelTiepoint: [0, 0, 0, minX, maxY, 0],
        GTModelTypeGeoKey: 1,
        GTRasterTypeGeoKey: 1,
        ProjectedCSTypeGeoKey: 3857,
        ...(sourceNoData !== undefined
            ? { GDAL_NODATA: String(sourceNoData) }
            : {})
    });

    return {
        arrayBuffer,
        width: outputWidth,
        height: outputHeight,
        sourceWidth,
        sourceHeight,
        sourceEpsg,
        targetEpsg: 3857,
        boundingBox: [minX, minY, maxX, maxY],
        noData: sourceNoData
    };
}

module.exports = {
    createWebMercatorRaster
};
