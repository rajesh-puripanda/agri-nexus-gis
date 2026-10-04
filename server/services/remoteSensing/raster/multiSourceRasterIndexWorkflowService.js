"use strict";

const {
    readGeoTiff
} = require("./rasterReaderService");

const {
    buildDefaultTargetGrid,
    alignRasterToTargetGrid
} = require("./rasterAlignmentService");require("./rasterAlignmentService");

const {
    normalizeMultiSourceRaster
} = require("./multiSourceRasterNormalizationService");

const {
    processRasterIndex
} = require("./rasterIndexProcessingService");

const {
    getIndexDefinition
} = require(
    "../../../scientific/remoteSensing/indices/indexRegistry"
);

function assertNonEmptyString(value, name) {
    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {
        throw new TypeError(
            `${name} must be a non-empty string.`
        );
    }
}

function assertSources(sources) {
    if (!Array.isArray(sources)) {
        throw new TypeError(
            "sources must be an array."
        );
    }

    if (sources.length === 0) {
        throw new Error(
            "At least one raster source is required."
        );
    }

    sources.forEach((source, index) => {
        if (
            !source ||
            typeof source !== "object" ||
            Array.isArray(source)
        ) {
            throw new TypeError(
                `Source at index ${index} must be an object.`
            );
        }

        assertNonEmptyString(
            source.band,
            `sources[${index}].band`
        );

        const hasRaster =
            source.raster &&
            typeof source.raster === "object" &&
            !Array.isArray(source.raster);

        const hasInputPath =
            typeof source.inputPath === "string" &&
            source.inputPath.trim() !== "";

        if (!hasRaster && !hasInputPath) {
            throw new Error(
                `sources[${index}] must provide either raster or inputPath.`
            );
        }
    });
}

function assertTargetResolution(
    targetResolution
) {
    if (
        typeof targetResolution !== "number" ||
        !Number.isFinite(targetResolution) ||
        targetResolution <= 0
    ) {
        throw new TypeError(
            "targetResolution must be a positive finite number."
        );
    }
}

async function readSourceRaster(source) {
    if (
        source.raster &&
        typeof source.raster === "object"
    ) {
        return source.raster;
    }

    return readGeoTiff(
        source.inputPath
    );
}

function extractSingleBandData(
    raster,
    sourceBand
) {
    if (
        !Number.isInteger(sourceBand) ||
        sourceBand <= 0
    ) {
        throw new Error(
            `Source band "${sourceBand}" must be a positive integer.`
        );
    }

    if (
        !Array.isArray(raster.data) &&
        !ArrayBuffer.isView(raster.data)
    ) {
        throw new Error(
            "Raster does not contain readable band data."
        );
    }

    const first =
        raster.data[0];

    const isNested =
        Array.isArray(first) ||
        ArrayBuffer.isView(first);

    if (!isNested) {
        if (sourceBand !== 1) {
            throw new Error(
                `Raster contains a single band; sourceBand ${sourceBand} is unavailable.`
            );
        }

        return raster.data;
    }

    const bandIndex =
        sourceBand - 1;

    if (
        bandIndex < 0 ||
        bandIndex >= raster.data.length
    ) {
        throw new Error(
            `sourceBand ${sourceBand} is outside the raster band range 1-${raster.data.length}.`
        );
    }

    return raster.data[bandIndex];
}

async function prepareSources({
    sources,
    targetResolution,
    noData
}) {
    const prepared = [];

    let targetGrid = null;

    for (const source of sources) {
        const raster =
            await readSourceRaster(
                source
            );

        const singleBandRaster = {
            width:
                raster.width,

            height:
                raster.height,

            pixelCount:
                raster.width *
                raster.height,

            data:
                extractSingleBandData(
                    raster,
                    source.sourceBand || 1
                ),

            noData:
                raster.noData,

            origin:
                raster.origin,

            resolution:
                raster.resolution,

            boundingBox:
                raster.boundingBox,

            geoKeys:
                raster.geoKeys
                    ? {
                        ...raster.geoKeys
                    }
                    : undefined,

            metadata:
                raster.metadata
                    ? {
                        ...raster.metadata
                    }
                    : {}
        };

        if (!targetGrid) {
            targetGrid =
                buildDefaultTargetGrid({
                    raster:
                        singleBandRaster,

                    targetResolution
                });
        }

        const aligned =
            alignRasterToTargetGrid({
                raster:
                    singleBandRaster,

                targetGrid,

                resamplingMethod:
                    "nearest_neighbor",

                noData
            });

        prepared.push({
            band:
                source.band,

            raster:
                aligned
        });
    }

    return prepared;
}

async function processMultiSourceRasterIndex({
    indexCode,
    sources,
    targetResolution,
    noData,
    parameters
}) {
    assertNonEmptyString(
        indexCode,
        "indexCode"
    );

    assertSources(
        sources
    );

    assertTargetResolution(
        targetResolution
    );

    const definition =
        getIndexDefinition(
            indexCode
        );

    if (!definition) {
        throw new Error(
            `Unknown remote sensing index: ${indexCode}`
        );
    }

    const preparedSources =
        await prepareSources({
            sources,
            targetResolution,
            noData
        });

    const normalizedRaster =
        normalizeMultiSourceRaster(
            preparedSources
        );

    const result =
        processRasterIndex({
            indexCode:
                definition.code,

            raster:
                normalizedRaster,

            parameters
        });

    return {
        indexCode:
            definition.code,

        indexName:
            definition.name,

        targetResolution,

        sourceBands:
            preparedSources.map(
                source =>
                    source.band
            ),

        normalizedRaster,

        result
    };
}

module.exports = {
    processMultiSourceRasterIndex
};


