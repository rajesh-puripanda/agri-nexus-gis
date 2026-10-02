"use strict";

// ============================================================
// AgriNexus GIS
//
// Raster Alignment Service
//
// Responsibility:
//   Explicitly align prepared raster bands to a target grid.
//
// Scientific boundary:
//   - preserves source pixel values
//   - preserves NoData
//   - supports explicit target resolution
//   - supports nearest-neighbor resampling
//
// Does NOT:
//   - calculate indices
//   - classify pixels
//   - reproject CRS
//   - perform interpolation
//   - apply radiometric conversion
// ============================================================

const {
    createRasterAlignmentContract
} = require(
    "../scientific/remoteSensing/raster/rasterAlignmentContract"
);

const RASTER_ALIGNMENT_SERVICE_VERSION = "1.0";

function assertRaster(
    raster,
    name = "raster"
) {
    if (
        raster === null ||
        typeof raster !== "object"
    ) {
        throw new TypeError(
            `${name} must be an object.`
        );
    }

    if (
        !Number.isInteger(raster.width) ||
        raster.width <= 0
    ) {
        throw new Error(
            `${name}.width must be a positive integer.`
        );
    }

    if (
        !Number.isInteger(raster.height) ||
        raster.height <= 0
    ) {
        throw new Error(
            `${name}.height must be a positive integer.`
        );
    }

    if (
        !Array.isArray(raster.data) &&
        !ArrayBuffer.isView(raster.data)
    ) {
        throw new TypeError(
            `${name}.data must be array-like.`
        );
    }

    const expectedPixels =
        raster.width *
        raster.height;

    if (
        raster.data.length !==
        expectedPixels
    ) {
        throw new Error(
            `${name}.data length must equal width × height.`
        );
    }

    if (
        !Array.isArray(raster.origin) ||
        raster.origin.length < 2
    ) {
        throw new Error(
            `${name}.origin must contain x and y.`
        );
    }

    if (
        !Array.isArray(raster.resolution) ||
        raster.resolution.length < 2
    ) {
        throw new Error(
            `${name}.resolution must contain x and y.`
        );
    }

    if (
        raster.noData !== undefined &&
        (
            typeof raster.noData !== "number" ||
            !Number.isFinite(raster.noData)
        )
    ) {
        throw new Error(
            `${name}.noData must be finite when provided.`
        );
    }
}

function isNoData(
    value,
    noData
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return true;
    }

    if (
        noData !== undefined &&
        value === noData
    ) {
        return true;
    }

    return false;
}

function calculateTargetDimension(
    sourceSize,
    sourceResolution,
    targetResolution
) {
    const sourceExtent =
        sourceSize *
        Math.abs(sourceResolution);

    return Math.round(
        sourceExtent /
        targetResolution
    );
}

function buildDefaultTargetGrid({
    raster,
    targetResolution
}) {
    const width =
        calculateTargetDimension(
            raster.width,
            raster.resolution[0],
            targetResolution
        );

    const height =
        calculateTargetDimension(
            raster.height,
            raster.resolution[1],
            targetResolution
        );

    const origin = [
        raster.origin[0],
        raster.origin[1],
        raster.origin[2] ?? 0
    ];

    const resolution = [
        targetResolution,
        raster.resolution[1] < 0
            ? -targetResolution
            : targetResolution,
        raster.resolution[2] ?? 0
    ];

    const maxX =
        origin[0] +
        width *
        resolution[0];

    const minY =
        origin[1] +
        height *
        resolution[1];

    const boundingBox = [
        Math.min(
            origin[0],
            maxX
        ),
        Math.min(
            origin[1],
            minY
        ),
        Math.max(
            origin[0],
            maxX
        ),
        Math.max(origin[1], minY)
    ];

    return {
        width,
        height,
        origin,
        resolution,
        boundingBox
    };
}

function calculateNearestNeighborIndex(
    targetCoordinate,
    sourceOrigin,
    sourceResolution,
    sourceSize
) {
    const sourceCoordinate =
        (
            targetCoordinate -
            sourceOrigin
        ) /
        sourceResolution;

    let index =
        Math.floor(
            sourceCoordinate
        );

    index =
        Math.max(
            0,
            Math.min(
                sourceSize - 1,
                index
            )
        );

    return index;
}

function resampleNearestNeighbor({
    raster,
    targetGrid,
    noData
}) {
    const sourceWidth =
        raster.width;

    const sourceHeight =
        raster.height;

    const targetWidth =
        targetGrid.width;

    const targetHeight =
        targetGrid.height;

    const sourceData =
        raster.data;

    const output =
        new Float32Array(
            targetWidth *
            targetHeight
        );

    const sourceOriginX =
        raster.origin[0];

    const sourceOriginY =
        raster.origin[1];

    const sourceResolutionX =
        raster.resolution[0];

    const sourceResolutionY =
        raster.resolution[1];

    const targetOriginX =
        targetGrid.origin[0];

    const targetOriginY =
        targetGrid.origin[1];

    const targetResolutionX =
        targetGrid.resolution[0];

    const targetResolutionY =
        targetGrid.resolution[1];

    for (
        let row = 0;
        row < targetHeight;
        row++
    ) {
        const targetY =
            targetOriginY +
            (
                row +
                0.5
            ) *
            targetResolutionY;

        const sourceRow =
            calculateNearestNeighborIndex(
                targetY,
                sourceOriginY,
                sourceResolutionY,
                sourceHeight
            );

        for (
            let column = 0;
            column < targetWidth;
            column++
        ) {
            const targetX =
                targetOriginX +
                (
                    column +
                    0.5
                ) *
                targetResolutionX;

            const sourceColumn =
                calculateNearestNeighborIndex(
                    targetX,
                    sourceOriginX,
                    sourceResolutionX,
                    sourceWidth
                );

            const sourceIndex =
                sourceRow *
                sourceWidth +
                sourceColumn;

            const targetIndex =
                row *
                targetWidth +
                column;

            const value =
                Number(
                    sourceData[sourceIndex]
                );

            output[targetIndex] =
                isNoData(
                    value,
                    raster.noData
                )
                    ? noData
                    : value;
        }
    }

    return output;
}

function alignRasterToTargetGrid({
    raster,
    targetGrid,
    resamplingMethod =
        "nearest_neighbor",
    noData = -9999
}) {
    assertRaster(raster);

    const contract =
        createRasterAlignmentContract({
            alignmentMode:
                "target_resolution",

            resamplingMethod,

            targetResolution:
                Math.abs(
                    targetGrid.resolution[0]
                ),

            targetGrid,

            noData
        });

    if (
        contract.resamplingMethod !==
        "nearest_neighbor"
    ) {
        throw new Error(
            `Unsupported resampling method: ${contract.resamplingMethod}`
        );
    }

    const alignedData =
        resampleNearestNeighbor({
            raster,
            targetGrid:
                contract.targetGrid,
            noData
        });

    return {
        serviceVersion:
            RASTER_ALIGNMENT_SERVICE_VERSION,

        contractVersion:
            contract.contractVersion,

        width:
            contract.targetGrid.width,

        height:
            contract.targetGrid.height,

        pixelCount:
            contract.targetGrid.width *
            contract.targetGrid.height,

        data:
            alignedData,

        noData,

        origin: [
            ...contract.targetGrid.origin
        ],

        resolution: [
            ...contract.targetGrid.resolution
        ],

        boundingBox: [
            ...contract.targetGrid.boundingBox
        ],

        alignment:
            contract
    };
}

function alignRasterToResolution({
    raster,
    targetResolution,
    noData = -9999
}) {
    assertRaster(raster);

    if (
        !Number.isFinite(
            targetResolution
        ) ||
        targetResolution <= 0
    ) {
        throw new Error(
            "targetResolution must be a positive finite number."
        );
    }

    const targetGrid =
        buildDefaultTargetGrid({
            raster,
            targetResolution
        });

    return alignRasterToTargetGrid({
        raster,
        targetGrid,
        resamplingMethod:
            "nearest_neighbor",
        noData
    });
}

module.exports = {
    RASTER_ALIGNMENT_SERVICE_VERSION,
    assertRaster,
    buildDefaultTargetGrid,
    resampleNearestNeighbor,
    alignRasterToTargetGrid,
    alignRasterToResolution
};




