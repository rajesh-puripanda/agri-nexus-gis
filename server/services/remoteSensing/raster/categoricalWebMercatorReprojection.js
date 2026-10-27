"use strict";

const proj4 = require("proj4");

const TARGET_CRS = "EPSG:3857";
const MAX_MERCATOR_Y = 20037508.342789244;

function reprojectCategoricalRasterToWebMercator({
    data,
    width,
    height,
    spatialReference,
    noData = 0
}) {
    if (!data || data.length !== width * height) {
        throw new Error("Classification data and dimensions are inconsistent");
    }

    const { origin, resolution, geoKeys } = spatialReference || {};
    const sourceEpsg =
        geoKeys?.ProjectedCSTypeGeoKey ||
        geoKeys?.GeographicTypeGeoKey;

    if (!Number.isInteger(sourceEpsg) || !origin || !resolution) {
        throw new Error("Classification source CRS and georeferencing are required");
    }

    const [originX, originY] = origin;
    const [resX, resY] = resolution;

    if (![originX, originY, resX, resY].every(Number.isFinite) ||
        resX === 0 || resY === 0) {
        throw new Error("Invalid classification raster georeferencing");
    }

    const sourceCrs = `EPSG:${sourceEpsg}`;
    const sourceToTarget = point =>
        proj4(sourceCrs, TARGET_CRS, point);

    const sourceToTargetX = (col, row) =>
        sourceToTarget([
            originX + col * resX,
            originY + row * resY
        ]);

    const perimeter = [];
    const steps = 128;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        perimeter.push(
            [width * t, 0],
            [width * t, height],
            [0, height * t],
            [width, height * t]
        );
    }

    const projected = perimeter
        .map(([col, row]) => sourceToTargetX(col, row))
        .filter(([x, y]) =>
            Number.isFinite(x) &&
            Number.isFinite(y) &&
            Math.abs(y) <= MAX_MERCATOR_Y
        );

    if (projected.length < 4) {
        throw new Error("Unable to transform classification raster extent");
    }

    const minX = Math.min(...projected.map(p => p[0]));
    const maxX = Math.max(...projected.map(p => p[0]));
    const minY = Math.max(-MAX_MERCATOR_Y, Math.min(...projected.map(p => p[1])));
    const maxY = Math.min(MAX_MERCATOR_Y, Math.max(...projected.map(p => p[1])));

    const centerCol = width / 2;
    const centerRow = height / 2;
    const center = sourceToTargetX(centerCol, centerRow);
    const nextX = sourceToTargetX(centerCol + 1, centerRow);
    const nextY = sourceToTargetX(centerCol, centerRow + 1);
    const pixelWidth = Math.hypot(nextX[0] - center[0], nextX[1] - center[1]);
    const pixelHeight = Math.hypot(nextY[0] - center[0], nextY[1] - center[1]);

    if (![pixelWidth, pixelHeight].every(v => Number.isFinite(v) && v > 0)) {
        throw new Error("Unable to determine Web Mercator pixel resolution");
    }

    const outputWidth = Math.ceil((maxX - minX) / pixelWidth);
    const outputHeight = Math.ceil((maxY - minY) / pixelHeight);

    if (!outputWidth || !outputHeight ||
        !Number.isSafeInteger(outputWidth * outputHeight)) {
        throw new Error("Invalid Web Mercator output dimensions");
    }

    const output = new data.constructor(outputWidth * outputHeight);
    output.fill(noData);

    for (let row = 0; row < outputHeight; row++) {
        const targetY = maxY - (row + 0.5) * pixelHeight;

        for (let col = 0; col < outputWidth; col++) {
            const targetX = minX + (col + 0.5) * pixelWidth;
            const [sourceX, sourceY] = proj4(
                TARGET_CRS,
                sourceCrs,
                [targetX, targetY]
            );

            const sourceCol = Math.floor((sourceX - originX) / resX);
            const sourceRow = Math.floor((sourceY - originY) / resY);

            if (sourceCol < 0 || sourceCol >= width ||
                sourceRow < 0 || sourceRow >= height) {
                continue;
            }

            output[row * outputWidth + col] =
                data[sourceRow * width + sourceCol];
        }
    }

    return {
        data: output,
        width: outputWidth,
        height: outputHeight,
        pixelCount: output.length,
        noData,
        spatialReference: {
            origin: [minX, maxY, 0],
            resolution: [pixelWidth, -pixelHeight, 0],
            boundingBox: [
                minX,
                maxY - outputHeight * pixelHeight,
                minX + outputWidth * pixelWidth,
                maxY
            ],
            geoKeys: {
                GTModelTypeGeoKey: 1,
                GTRasterTypeGeoKey: 1,
                ProjectedCSTypeGeoKey: 3857
            }
        }
    };
}

module.exports = {
    reprojectCategoricalRasterToWebMercator
};
