
"use strict";

const fs = require("fs/promises");
const path = require("path");
const geotiff = require("geotiff");

const {
    writeBareSoilFrequencyStreamingRaster
} = require("./bareSoilFrequencyStreamingRasterWriter");

const NO_DATA = -9999;
const CHUNK_ROWS = 32;
const NDVI_MAX = 0.2;
const BSI_MIN = 0.2;

function closeEnough(a, b) {
    return Math.abs(a - b) < 1e-7;
}

function valid(value, noData) {
    return Number.isFinite(value) && value !== noData;
}

async function openRaster(filePath) {
    const tiff = await geotiff.fromFile(filePath);

    try {
        const image = await tiff.getImage();
        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const bbox = image.getBoundingBox();
        const geoKeys = image.getGeoKeys();
        const noDataValue = image.getGDALNoData();
        const noData = noDataValue == null
            ? undefined
            : Number(noDataValue);

        if (
            !Number.isFinite(noData) &&
            noData !== undefined
        ) {
            throw new Error(`Invalid NoData: ${filePath}`);
        }

        return {
            tiff,
            image,
            filePath,
            width: image.getWidth(),
            height: image.getHeight(),
            origin,
            resolution,
            bbox,
            geoKeys,
            noData
        };
    } catch (error) {
        await tiff.close();
        throw error;
    }
}

function assertSameGrid(a, b, label) {
    if (
        a.width !== b.width ||
        a.height !== b.height ||
        !a.origin.every((v, i) =>
            closeEnough(v, b.origin[i] ?? 0)
        ) ||
        !a.resolution.every((v, i) =>
            closeEnough(v, b.resolution[i] ?? 0)
        ) ||
        a.geoKeys.ProjectedCSTypeGeoKey !==
            b.geoKeys.ProjectedCSTypeGeoKey
    ) {
        throw new Error(`${label}: raster grids do not match.`);
    }
}

function calculateCommonGrid(rasters) {
    const reference = rasters[0];
    const [rx, ry] = reference.resolution;

    if (!(rx > 0 && ry < 0)) {
        throw new Error("Expected north-up projected rasters.");
    }

    for (const raster of rasters) {
        if (
            !closeEnough(raster.resolution[0], rx) ||
            !closeEnough(raster.resolution[1], ry) ||
            raster.geoKeys.ProjectedCSTypeGeoKey !==
                reference.geoKeys.ProjectedCSTypeGeoKey
        ) {
            throw new Error(
                "Temporal rasters must share CRS and pixel resolution."
            );
        }

        const colOffset = (raster.origin[0] - reference.origin[0]) / rx;
        const rowOffset = (raster.origin[1] - reference.origin[1]) / ry;

        if (
            !closeEnough(colOffset, Math.round(colOffset)) ||
            !closeEnough(rowOffset, Math.round(rowOffset))
        ) {
            throw new Error(
                `Raster origin is not pixel-aligned: ${raster.filePath}`
            );
        }
    }
    const minX = Math.max(...rasters.map(r => r.bbox[0]));
    const minY = Math.max(...rasters.map(r => r.bbox[1]));
    const maxX = Math.min(...rasters.map(r => r.bbox[2]));
    const maxY = Math.min(...rasters.map(r => r.bbox[3]));

    if (maxX <= minX || maxY <= minY) {
        throw new Error("Temporal rasters have no overlapping extent.");
    }

    const width = Math.round((maxX - minX) / rx);
    const height = Math.round((maxY - minY) / Math.abs(ry));

    if (
        !closeEnough(width * rx, maxX - minX) ||
        !closeEnough(height * Math.abs(ry), maxY - minY)
    ) {
        throw new Error("Overlap does not align to the common pixel grid.");
    }

    const origin = [minX, maxY, reference.origin[2] ?? 0];

    const offsets = rasters.map(raster => {
        const col = (minX - raster.origin[0]) / rx;
        const row = (raster.origin[1] - maxY) / Math.abs(ry);

        if (
            !closeEnough(col, Math.round(col)) ||
            !closeEnough(row, Math.round(row))
        ) {
            throw new Error(
                `Raster origin is not aligned: ${raster.filePath}`
            );
        }

        return {
            col: Math.round(col),
            row: Math.round(row)
        };
    });

    return {
        width,
        height,
        origin,
        resolution: [...reference.resolution],
        offsets,
        geoKeys: {
            GTModelTypeGeoKey:
                reference.geoKeys.GTModelTypeGeoKey ?? 1,
            GTRasterTypeGeoKey:
                reference.geoKeys.GTRasterTypeGeoKey ?? 1,
            ProjectedCSTypeGeoKey:
                reference.geoKeys.ProjectedCSTypeGeoKey
        }
    };
}

async function* createFrequencyRows({
    observations,
    grid,
    chunkRows
}) {
    for (let startRow = 0; startRow < grid.height; startRow += chunkRows) {
        const rowsInChunk = Math.min(
            chunkRows,
            grid.height - startRow
        );

        const windows = await Promise.all(
            observations.map(async observation => {
                const { ndvi, bsi } = observation;
                const ndviOffset = observation.ndviOffset;
                const bsiOffset = observation.bsiOffset;

                const windowFor = (raster, offset) => [
                    offset.col,
                    offset.row + startRow,
                    offset.col + grid.width,
                    offset.row + startRow + rowsInChunk
                ];

                const [ndviData, bsiData] = await Promise.all([
                    ndvi.image.readRasters({
                        window: windowFor(ndvi, ndviOffset),
                        interleave: true
                    }),
                    bsi.image.readRasters({
                        window: windowFor(bsi, bsiOffset),
                        interleave: true
                    })
                ]);

                if (
                    ndviData.length !== grid.width * rowsInChunk ||
                    bsiData.length !== grid.width * rowsInChunk
                ) {
                    throw new Error(
                        `${observation.date}: unexpected window dimensions.`
                    );
                }

                return { observation, ndviData, bsiData };
            })
        );

        for (let row = 0; row < rowsInChunk; row++) {
            const output = new Float32Array(grid.width);
            output.fill(NO_DATA);

            for (let col = 0; col < grid.width; col++) {
                let validCount = 0;
                let bareSoilCount = 0;

                for (const item of windows) {
                    const index = row * grid.width + col;
                    const ndvi = item.ndviData[index];
                    const bsi = item.bsiData[index];

                    if (
                        !valid(ndvi, item.observation.ndvi.noData) ||
                        !valid(bsi, item.observation.bsi.noData)
                    ) {
                        continue;
                    }

                    validCount++;

                    if (ndvi < NDVI_MAX && bsi >= BSI_MIN) {
                        bareSoilCount++;
                    }
                }

                if (validCount > 0) {
                    output[col] = 100 * bareSoilCount / validCount;
                }
            }

            yield output;
        }
    }
}

async function calculateBareSoilFrequencyStreaming({
    observations,
    outputPath,
    chunkRows = CHUNK_ROWS
}) {
    if (!Array.isArray(observations) || observations.length < 2) {
        throw new Error("At least two observations are required.");
    }

    if (!Number.isInteger(chunkRows) || chunkRows < 1) {
        throw new Error("chunkRows must be a positive integer.");
    }

    if (!outputPath) {
        throw new Error("outputPath is required.");
    }

    const dates = observations.map(item => item.date);

    if (
        dates.some(date =>
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(`${date}T00:00:00Z`))
        ) ||
        new Set(dates).size !== dates.length
    ) {
        throw new Error("Observation dates must be valid and distinct.");
    }

    const opened = [];

    try {
        const prepared = [];

        for (const item of observations) {
            const ndvi = await openRaster(item.ndviPath);
            opened.push(ndvi);

            const bsi = await openRaster(item.bsiPath);
            opened.push(bsi);

            assertSameGrid(ndvi, bsi, `${item.date} NDVI/BSI`);

            prepared.push({
                date: item.date,
                ndvi,
                bsi
            });
        }

        const allRasters = prepared.flatMap(item => [
            item.ndvi,
            item.bsi
        ]);

        const grid = calculateCommonGrid(allRasters);

        const outputResolved = path.resolve(outputPath);
        const productionRoot = path.resolve("data/remote-sensing/production");
        const relativeToProduction = path.relative(productionRoot, outputResolved);

        if (
            relativeToProduction === "" ||
            (
                relativeToProduction !== ".." &&
                !relativeToProduction.startsWith(`..${path.sep}`) &&
                !path.isAbsolute(relativeToProduction)
            )
        ) {
            throw new Error("Output must be outside data/remote-sensing/production.");
        }
        if (opened.some(r => path.resolve(r.filePath) === outputResolved)) {
            throw new Error("Output must not overwrite an input raster.");
        }

        const rows = createFrequencyRows({
            observations: prepared.map((item, i) => ({
                ...item,
                ndviOffset: grid.offsets[i * 2],
                bsiOffset: grid.offsets[i * 2 + 1]
            })),
            grid,
            chunkRows
        });

        await fs.mkdir(path.dirname(outputResolved), { recursive: true });

        return await writeBareSoilFrequencyStreamingRaster({
            width: grid.width,
            height: grid.height,
            rows,
            outputPath: outputResolved,
            spatialReference: {
                origin: grid.origin,
                resolution: grid.resolution,
                geoKeys: grid.geoKeys
            },
            productMetadata: {
                productCode: "BARE_SOIL_FREQUENCY",
                units: "percent",
                method: "provisional_ndvi_bsi_evidence_rules",
                calibrationStatus: "provisional_uncalibrated",
                thresholds: {
                    ndviMaximumExclusive: NDVI_MAX,
                    bsiMinimum: BSI_MIN
                },
                observationDates: [...dates].sort()
            }
        });
    } finally {
        await Promise.all(
            opened.map(raster => raster.tiff.close())
        );
    }
}

module.exports = {
    calculateBareSoilFrequencyStreaming,
    calculateCommonGrid
};
