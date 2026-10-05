"use strict";

// ============================================================
// AgriNexus GIS
// Sentinel-2 Observation Discovery Service
// Version 1.0
//
// Responsibility:
// - Discover Sentinel-2 observations matching a request.
// - Return observation identity and acquisition metadata.
//
// Does NOT:
// - select an observation
// - download assets
// - process rasters
// - calculate indices
// - perform scientific interpretation
// - determine index-specific band requirements
// ============================================================

const {
    search: defaultSearch
} = require(
    "./copernicusDataSpaceAdapter"
);

const DEFAULT_DISCOVERY_LIMIT = 50;

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function assertRequest(request) {
    if (!isPlainObject(request)) {
        throw new TypeError(
            "Sentinel-2 observation discovery request must be an object."
        );
    }

    if (
        !isPlainObject(request.temporalContext)
    ) {
        throw new TypeError(
            "Sentinel-2 observation discovery request requires temporalContext."
        );
    }

    const {
        startDate,
        endDate
    } = request.temporalContext;

    if (
        typeof startDate !== "string" ||
        startDate.trim().length === 0
    ) {
        throw new TypeError(
            "Sentinel-2 observation discovery request requires temporalContext.startDate."
        );
    }

    if (
        typeof endDate !== "string" ||
        endDate.trim().length === 0
    ) {
        throw new TypeError(
            "Sentinel-2 observation discovery request requires temporalContext.endDate."
        );
    }

    if (
        !isPlainObject(request.spatialContext) ||
        !isPlainObject(request.spatialContext.bbox)
    ) {
        throw new TypeError(
            "Sentinel-2 observation discovery request requires spatialContext.bbox."
        );
    }

    const {
        west,
        south,
        east,
        north
    } = request.spatialContext.bbox;

    for (const value of [
        west,
        south,
        east,
        north
    ]) {
        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {
            throw new TypeError(
                "Sentinel-2 observation discovery request requires numeric bbox coordinates."
            );
        }
    }
}

function buildObservation(item) {
    if (!item || typeof item !== "object") {
        throw new TypeError(
            "Sentinel-2 catalogue item must be an object."
        );
    }

    return {
        sceneId:
            item.id,

        acquisitionDate:
            item.properties?.datetime ?? null,

        cloudCover:
            item.properties?.["eo:cloud_cover"] ?? null,

        satellite:
            item.properties?.platform ??
            item.properties?.constellation ??
            null,

        spatialCoverage:
            Array.isArray(item.bbox)
                ? item.bbox.slice()
                : null
    };
}

async function discoverSentinel2Observations({
    request,
    searchImpl = defaultSearch,
    fetchImpl = globalThis.fetch,
    limit = DEFAULT_DISCOVERY_LIMIT
} = {}) {
    assertRequest(request);

    if (
        typeof searchImpl !== "function"
    ) {
        throw new TypeError(
            "searchImpl must be a function."
        );
    }

    if (
        !Number.isInteger(limit) ||
        limit <= 0
    ) {
        throw new TypeError(
            "limit must be a positive integer."
        );
    }

    const catalogue =
        await searchImpl(
            request,
            {
                fetchImpl,
                limit
            }
        );

    const features =
        Array.isArray(
            catalogue?.features
        )
            ? catalogue.features
            : [];

    return {
        observations:
            features.map(
                buildObservation
            )
    };
}

module.exports = {
    DEFAULT_DISCOVERY_LIMIT,
    buildObservation,
    discoverSentinel2Observations
};
