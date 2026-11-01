const path = require("path");
const geotiff = require("geotiff");

const {
    writeCropConditionTemporalChangeRaster
} = require("./cropConditionTemporalChangeRasterWriter");

const CHUNK_ROWS = 32;
const NO_DATA_VALUE = -9999;
const GRID_TOLERANCE = 1e-7;

function isValidValue(value, noData) {
    return Number.isFinite(value) &&
        (noData === undefined || value !== noData);
}

function nearlyEqual(a, b) {
    return Math.abs(a - b) <= GRID_TOLERANCE *
        Math.max(1, Math.abs(a), Math.abs(b));
}

function validateWindow(window, raster, label, width, height) {
    if (!Array.isArray(window) || window.length !== 4 ||
        !window.every(Number.isSafeInteger)) {
        throw new Error(`${label} window must contain four integer coordinates`);
    }

    const [left, top, right, bottom] = window;

    if (left < 0 || top < 0 ||
        right <= left || bottom <= top ||
        right > raster.width || bottom > raster.height) {
        throw new Error(`${label} window is outside raster bounds`);
    }

    if (right - left !== width || bottom - top !== height) {
        throw new Error(`${label} window dimensions do not match commonFootprint`);
    }
}

function getWindowSpatialReference(raster, window) {
    const [left, top] = window;

    return {
        origin: [
            raster.origin[0] + left * raster.resolution[0],
            raster.origin[1] + top * raster.resolution[1],
            raster.origin[2] || 0
        ],
        resolution: raster.resolution,
        geoKeys: raster.geoKeys
    };
}

function getWindowBounds(raster, window) {
    const [left, top, right, bottom] = window;
    const x1 = raster.origin[0] + left * raster.resolution[0];
    const x2 = raster.origin[0] + right * raster.resolution[0];
    const y1 = raster.origin[1] + top * raster.resolution[1];
    const y2 = raster.origin[1] + bottom * raster.resolution[1];

    return [
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.max(x1, x2),
        Math.max(y1, y2)
    ];
}

function validateSameGrid(baseline, comparison, baselineWindow,
    comparisonWindow, commonFootprint) {
    for (let i = 0; i < 2; i++) {
        if (!nearlyEqual(
            baseline.resolution[i],
            comparison.resolution[i]
        )) {
            throw new Error("Baseline and comparison resolutions differ");
        }
    }

    const baselineReference =
        getWindowSpatialReference(baseline, baselineWindow);
    const comparisonReference =
        getWindowSpatialReference(comparison, comparisonWindow);

    for (let i = 0; i < 2; i++) {
        if (!nearlyEqual(
            baselineReference.origin[i],
            comparisonReference.origin[i]
        )) {
            throw new Error("Baseline and comparison pixel grids are not aligned");
        }
    }

    const baselineCrs = baseline.geoKeys.ProjectedCSTypeGeoKey;
    const comparisonCrs = comparison.geoKeys.ProjectedCSTypeGeoKey;

    const baselineRasterType = baseline.geoKeys.GTRasterTypeGeoKey;
    const comparisonRasterType = comparison.geoKeys.GTRasterTypeGeoKey;

    if (
        baselineCrs == null ||
        comparisonCrs == null ||
        baselineCrs !== comparisonCrs ||
        baselineRasterType == null ||
        comparisonRasterType == null ||
        baselineRasterType !== comparisonRasterType
    ) {
        throw new Error(
            "Baseline and comparison CRS or raster types differ"
        );
    }

    const expectedBounds = commonFootprint.boundingBox;

    for (const [label, raster, window] of [
        ["Baseline", baseline, baselineWindow],
        ["Comparison", comparison, comparisonWindow]
    ]) {
        const actualBounds = getWindowBounds(raster, window);

        for (let i = 0; i < 4; i++) {
            if (!nearlyEqual(actualBounds[i], expectedBounds[i])) {
                throw new Error(
                    `${label} window does not match commonFootprint bounds`
                );
            }
        }
    }

    return baselineReference;
}

async function openRaster(filePath) {
    const tiff = await geotiff.fromFile(filePath);

    try {
        const image = await tiff.getImage();
        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const geoKeys = image.getGeoKeys();
        const noDataValue = image.getGDALNoData();
        const noData = noDataValue == null
            ? undefined
            : Number(noDataValue);

        if (!Array.isArray(origin) || origin.length < 2 ||
            !origin.slice(0, 2).every(Number.isFinite) ||
            !Array.isArray(resolution) || resolution.length < 2 ||
            !resolution.slice(0, 2).every(Number.isFinite) ||
            resolution[0] === 0 || resolution[1] === 0 ||
            !geoKeys ||
            geoKeys.ProjectedCSTypeGeoKey == null ||
            geoKeys.GTRasterTypeGeoKey == null ||
            (noData !== undefined && !Number.isFinite(noData))) {
            throw new Error(`Invalid GeoTIFF spatial metadata: ${filePath}`);
        }

        return {
            tiff,
            image,
            filePath,
            width: image.getWidth(),
            height: image.getHeight(),
            origin,
            resolution,
            geoKeys,
            noData
        };
    } catch (error) {
        await tiff.close();
        throw error;
    }
}

function createChangeRows({
    baseline,
    comparison,
    baselineWindow,
    comparisonWindow,
    width,
    height,
    chunkRows,
    statistics
}) {
    return (async function* () {
        for (let rowStart = 0; rowStart < height; rowStart += chunkRows) {
            const rowsInChunk = Math.min(chunkRows, height - rowStart);

            const baselineData = await baseline.image.readRasters({
                window: [
                    baselineWindow[0],
                    baselineWindow[1] + rowStart,
                    baselineWindow[2],
                    baselineWindow[1] + rowStart + rowsInChunk
                ],
                interleave: true
            });

            const comparisonData = await comparison.image.readRasters({
                window: [
                    comparisonWindow[0],
                    comparisonWindow[1] + rowStart,
                    comparisonWindow[2],
                    comparisonWindow[1] + rowStart + rowsInChunk
                ],
                interleave: true
            });

            const expectedLength = width * rowsInChunk;

            if (baselineData.length !== expectedLength ||
                comparisonData.length !== expectedLength) {
                throw new Error("Raster chunk dimensions are inconsistent");
            }

            for (let row = 0; row < rowsInChunk; row++) {
                const output = new Float32Array(width);

                for (let col = 0; col < width; col++) {
                    const index = row * width + col;
                    const baselineValue = Number(baselineData[index]);
                    const comparisonValue = Number(comparisonData[index]);

                    if (!isValidValue(baselineValue, baseline.noData) ||
                        !isValidValue(comparisonValue, comparison.noData)) {
                        output[col] = NO_DATA_VALUE;
                        statistics.noDataPixelCount++;
                        continue;
                    }

                    const change = comparisonValue - baselineValue;

                    if (!Number.isFinite(change)) {
                        throw new Error("Non-finite NDVI change encountered");
                    }

                    output[col] = change;

                    if (!Number.isFinite(output[col])) {
                        throw new Error("NDVI change exceeds Float32 range");
                    }

                    const storedValue = output[col];

                    statistics.validPixelCount++;
                    statistics.sum += storedValue;
                    statistics.min = Math.min(statistics.min, storedValue);
                    statistics.max = Math.max(statistics.max, storedValue);
                }

                yield output;
            }
        }
    })();
}

async function calculateCropConditionTemporalChangeStreaming({
    baselinePath,
    comparisonPath,
    commonFootprint,
    outputPath,
    baseline,
    comparison,
    chunkRows = CHUNK_ROWS
}) {
    if (!baselinePath || !comparisonPath || !outputPath) {
        throw new Error("Baseline, comparison and output paths are required");
    }

    if (!commonFootprint ||
        !Number.isSafeInteger(commonFootprint.width) ||
        commonFootprint.width < 1 ||
        !Number.isSafeInteger(commonFootprint.height) ||
        commonFootprint.height < 1 ||
        !Array.isArray(commonFootprint.windows) ||
        commonFootprint.windows.length < 2 ||
        !Array.isArray(commonFootprint.boundingBox) ||
        commonFootprint.boundingBox.length !== 4 ||
        !commonFootprint.boundingBox.every(Number.isFinite)) {
        throw new Error("Valid controller commonFootprint is required");
    }

    if (!Number.isSafeInteger(chunkRows) || chunkRows < 1) {
        throw new Error("chunkRows must be a positive integer");
    }

    if (!baseline?.date || !baseline?.sceneId ||
        !comparison?.date || !comparison?.sceneId ||
        baseline.date >= comparison.date) {
        throw new Error("Valid chronologically ordered baseline and comparison metadata are required");
    }

    if (baseline.indexCode !== "NDVI" ||
        comparison.indexCode !== "NDVI") {
        throw new Error("Both observations must be NDVI products");
    }

    const baselineFile = path.resolve(baselinePath);
    const comparisonFile = path.resolve(comparisonPath);
    const destination = path.resolve(outputPath);

    if (destination === baselineFile || destination === comparisonFile) {
        throw new Error("Output path must not overwrite an input raster");
    }

    const productionDirectory = path.resolve(
        "data/remote-sensing/production"
    );

    if (destination.startsWith(productionDirectory + path.sep) ||
        destination === productionDirectory) {
        throw new Error("Crop Condition output must be outside Sentinel-2 production");
    }

    const baselineWindow = commonFootprint.windows[0];
    const comparisonWindow =
        commonFootprint.windows[commonFootprint.windows.length - 1];

    let baselineRaster;
    let comparisonRaster;

    try {
        baselineRaster = await openRaster(baselineFile);
        comparisonRaster = await openRaster(comparisonFile);

        validateWindow(
            baselineWindow,
            baselineRaster,
            "Baseline",
            commonFootprint.width,
            commonFootprint.height
        );

        validateWindow(
            comparisonWindow,
            comparisonRaster,
            "Comparison",
            commonFootprint.width,
            commonFootprint.height
        );

        const spatialReference = validateSameGrid(
            baselineRaster,
            comparisonRaster,
            baselineWindow,
            comparisonWindow,
            commonFootprint
        );

        const statistics = {
            totalPixelCount:
                commonFootprint.width * commonFootprint.height,
            validPixelCount: 0,
            noDataPixelCount: 0,
            min: Infinity,
            max: -Infinity,
            sum: 0
        };

        const rows = createChangeRows({
            baseline: baselineRaster,
            comparison: comparisonRaster,
            baselineWindow,
            comparisonWindow,
            width: commonFootprint.width,
            height: commonFootprint.height,
            chunkRows,
            statistics
        });

        const productMetadata = {
            productCode: "NDVI_TEMPORAL_CHANGE",
            units: "NDVI difference",
            method: "comparison_minus_baseline",
            calibrationStatus: "not_calibrated",
            observationDates: [baseline.date, comparison.date],
            baseline: {
                sceneId: baseline.sceneId,
                date: baseline.date,
                indexCode: baseline.indexCode
            },
            comparison: {
                sceneId: comparison.sceneId,
                date: comparison.date,
                indexCode: comparison.indexCode
            }
        };

        const rasterMetadata =
            await writeCropConditionTemporalChangeRaster({
                width: commonFootprint.width,
                height: commonFootprint.height,
                rows,
                outputPath: destination,
                spatialReference,
                productMetadata
            });

        const validPixelCount = statistics.validPixelCount;
        const noDataPixelCount = statistics.noDataPixelCount;
        const totalPixelCount = statistics.totalPixelCount;

        return {
            ...rasterMetadata,
            spatialReference,
            statistics: {
                totalPixelCount,
                validPixelCount,
                noDataPixelCount,
                validCoveragePercent:
                    (validPixelCount / totalPixelCount) * 100,
                noDataCoveragePercent:
                    (noDataPixelCount / totalPixelCount) * 100,
                min: validPixelCount ? statistics.min : null,
                max: validPixelCount ? statistics.max : null,
                mean: validPixelCount
                    ? statistics.sum / validPixelCount
                    : null
            },
            baseline: productMetadata.baseline,
            comparison: productMetadata.comparison,
            method: productMetadata.method,
            calibrationStatus: productMetadata.calibrationStatus
        };
    } finally {
        if (baselineRaster) {
            await baselineRaster.tiff.close();
        }

        if (comparisonRaster) {
            await comparisonRaster.tiff.close();
        }
    }
}

module.exports = {
    calculateCropConditionTemporalChangeStreaming,
    CHUNK_ROWS,
    NO_DATA_VALUE
};
