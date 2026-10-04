"use strict";

const proj4 = require("proj4");

const SENTINEL2_SPATIAL_WINDOW_VERSION =
    "1.0";

function assertFiniteNumber(value, name) {
    if (!Number.isFinite(value)) {
        throw new Error(
            `${name} must be a finite number.`
        );
    }
}

function validateWgs84Bbox(bbox) {
    if (
        !Array.isArray(bbox) ||
        bbox.length !== 4
    ) {
        throw new Error(
            "WGS84 bbox must contain [west, south, east, north]."
        );
    }

    const [
        west,
        south,
        east,
        north
    ] = bbox;

    assertFiniteNumber(west, "bbox west");
    assertFiniteNumber(south, "bbox south");
    assertFiniteNumber(east, "bbox east");
    assertFiniteNumber(north, "bbox north");

    if (west >= east) {
        throw new Error(
            "WGS84 bbox west must be less than east."
        );
    }

    if (south >= north) {
        throw new Error(
            "WGS84 bbox south must be less than north."
        );
    }

    if (
        west < -180 ||
        east > 180 ||
        south < -90 ||
        north > 90
    ) {
        throw new Error(
            "WGS84 bbox coordinates are outside valid geographic bounds."
        );
    }
}

function validateProjectedSpatialReference(
    spatialReference
) {
    if (
        !spatialReference ||
        typeof spatialReference !== "object"
    ) {
        throw new Error(
            "Projected spatial reference is required."
        );
    }

    const origin =
        spatialReference.origin;

    const resolution =
        spatialReference.resolution;

    const epsg =
        spatialReference
            ?.geoKeys
            ?.ProjectedCSTypeGeoKey;

    if (
        !Array.isArray(origin) ||
        origin.length < 2
    ) {
        throw new Error(
            "Projected spatial reference origin is required."
        );
    }

    if (
        !Array.isArray(resolution) ||
        resolution.length < 2
    ) {
        throw new Error(
            "Projected spatial reference resolution is required."
        );
    }

    assertFiniteNumber(
        origin[0],
        "spatialReference.origin[0]"
    );

    assertFiniteNumber(
        origin[1],
        "spatialReference.origin[1]"
    );

    assertFiniteNumber(
        resolution[0],
        "spatialReference.resolution[0]"
    );

    assertFiniteNumber(
        resolution[1],
        "spatialReference.resolution[1]"
    );

    if (
        resolution[0] === 0 ||
        resolution[1] === 0
    ) {
        throw new Error(
            "Projected spatial reference resolution cannot be zero."
        );
    }

    if (
        !Number.isInteger(epsg) ||
        epsg <= 0
    ) {
        throw new Error(
            "Projected spatial reference EPSG code is required."
        );
    }

    return {
        origin,
        resolution,
        epsg
    };
}

function transformWgs84BboxToProjected(
    bbox,
    targetEpsg
) {
    validateWgs84Bbox(bbox);

    if (
        !Number.isInteger(targetEpsg) ||
        targetEpsg <= 0
    ) {
        throw new Error(
            "targetEpsg must be a positive integer."
        );
    }

    const sourceCrs =
        "EPSG:4326";

    const targetCrs =
        `EPSG:${targetEpsg}`;

    const [
        west,
        south,
        east,
        north
    ] = bbox;

    const corners = [
        proj4(
            sourceCrs,
            targetCrs,
            [west, south]
        ),

        proj4(
            sourceCrs,
            targetCrs,
            [west, north]
        ),

        proj4(
            sourceCrs,
            targetCrs,
            [east, south]
        ),

        proj4(
            sourceCrs,
            targetCrs,
            [east, north]
        )
    ];

    const xs =
        corners.map(
            coordinate => coordinate[0]
        );

    const ys =
        corners.map(
            coordinate => coordinate[1]
        );

    return [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
    ];
}

function projectedBboxToPixelWindow(
    projectedBbox,
    spatialReference
) {
    if (
        !Array.isArray(projectedBbox) ||
        projectedBbox.length !== 4
    ) {
        throw new Error(
            "Projected bbox must contain [minX, minY, maxX, maxY]."
        );
    }

    const [
        minX,
        minY,
        maxX,
        maxY
    ] = projectedBbox;

    assertFiniteNumber(minX, "projected bbox minX");
    assertFiniteNumber(minY, "projected bbox minY");
    assertFiniteNumber(maxX, "projected bbox maxX");
    assertFiniteNumber(maxY, "projected bbox maxY");

    if (
        minX >= maxX ||
        minY >= maxY
    ) {
        throw new Error(
            "Projected bbox must have positive width and height."
        );
    }

    const {
        origin,
        resolution
    } =
        validateProjectedSpatialReference(
            spatialReference
        );

    const pixelSizeX =
        Math.abs(resolution[0]);

    const pixelSizeY =
        Math.abs(resolution[1]);

    const originX =
        origin[0];

    const originY =
        origin[1];

    const x0 =
        Math.floor(
            (minX - originX) /
            pixelSizeX
        );

    const x1 =
        Math.ceil(
            (maxX - originX) /
            pixelSizeX
        );

    const y0 =
        Math.floor(
            (originY - maxY) /
            pixelSizeY
        );

    const y1 =
        Math.ceil(
            (originY - minY) /
            pixelSizeY
        );

    if (
        x1 <= x0 ||
        y1 <= y0
    ) {
        throw new Error(
            "Projected bbox does not intersect a positive pixel window."
        );
    }

    return {
        x0,
        y0,
        x1,
        y1,
        width: x1 - x0,
        height: y1 - y0
    };
}

function buildPixelWindowFromWgs84Bbox({
    bbox,
    spatialReference
}) {
    const {
        epsg
    } =
        validateProjectedSpatialReference(
            spatialReference
        );

    const projectedBbox =
        transformWgs84BboxToProjected(
            bbox,
            epsg
        );

    const window =
        projectedBboxToPixelWindow(
            projectedBbox,
            spatialReference
        );

    return {
        version:
            SENTINEL2_SPATIAL_WINDOW_VERSION,

        sourceCrs:
            "EPSG:4326",

        targetCrs:
            `EPSG:${epsg}`,

        geographicBbox:
            bbox.slice(),

        projectedBbox,

        window
    };
}

module.exports = {
    SENTINEL2_SPATIAL_WINDOW_VERSION,
    transformWgs84BboxToProjected,
    projectedBboxToPixelWindow,
    buildPixelWindowFromWgs84Bbox
};
