"use strict";

// ============================================================
// AgriNexus GIS
// Copernicus Data Space Adapter
//
// Phase 1:
// - Sentinel-2 catalogue discovery only
//
// Does NOT:
// - authenticate
// - download products
// - process rasters
// - calculate indices
// - perform scientific interpretation
// ============================================================

const {
    createSatelliteProviderAdapter
} = require(
    "./satelliteProviderAdapter"
);

const CDSE_STAC_BASE_URL =
    "https://stac.dataspace.copernicus.eu/v1";

const SENTINEL2_L2A_COLLECTION =
    "sentinel-2-l2a";

const DEFAULT_SEARCH_LIMIT = 20;

function assertAcquisitionRequest(request) {
    if (
        !request ||
        typeof request !== "object"
    ) {
        throw new TypeError(
            "Satellite acquisition request must be an object."
        );
    }

    if (
        !request.temporalContext ||
        typeof request.temporalContext !== "object"
    ) {
        throw new TypeError(
            "Satellite acquisition request requires temporalContext."
        );
    }

    if (
        !request.spatialContext ||
        typeof request.spatialContext !== "object" ||
        !request.spatialContext.bbox ||
        typeof request.spatialContext.bbox !== "object"
    ) {
        throw new TypeError(
            "Satellite acquisition request requires spatialContext.bbox."
        );
    }
}

function buildSearchPayload(
    request,
    {
        limit = DEFAULT_SEARCH_LIMIT
    } = {}
) {
    assertAcquisitionRequest(request);

    const {
        startDate,
        endDate
    } = request.temporalContext;

    const {
        west,
        south,
        east,
        north
    } = request.spatialContext.bbox;

    const payload = {
        collections: [
            SENTINEL2_L2A_COLLECTION
        ],

        datetime:
            `${startDate}T00:00:00Z/` +
            `${endDate}T23:59:59Z`,

        bbox: [
            west,
            south,
            east,
            north
        ],

        limit
    };

    const maxCloudCover =
        request.acquisitionParameters &&
        request.acquisitionParameters.maxCloudCover;

    if (maxCloudCover !== undefined) {
        payload.query = {
            "eo:cloud_cover": {
                lte: maxCloudCover
            }
        };
    }

    return payload;
}

async function search(
    request,
    {
        fetchImpl = globalThis.fetch,
        endpoint = `${CDSE_STAC_BASE_URL}/search`,
        limit = DEFAULT_SEARCH_LIMIT
    } = {}
) {
    if (typeof fetchImpl !== "function") {
        throw new TypeError(
            "A fetch implementation is required."
        );
    }

    const payload = buildSearchPayload(
        request,
        { limit }
    );

    const response = await fetchImpl(
        endpoint,
        {
            method: "POST",

            headers: {
                "content-type":
                    "application/json",
                accept:
                    "application/geo+json"
            },

            body: JSON.stringify(payload)
        }
    );

    if (!response.ok) {
        const error =
            new Error(
                `Copernicus Data Space STAC search failed: ${response.status} ${response.statusText}`
            );

        error.code =
            "CDSE_STAC_SEARCH_FAILED";

        error.status =
            response.status;

        throw error;
    }

    return response.json();
}

function select(items) {
    if (!Array.isArray(items)) {
        throw new TypeError(
            "Satellite catalogue items must be an array."
        );
    }

    return items;
}

async function acquire() {
    throw new Error(
        "Copernicus Data Space acquisition is not implemented yet."
    );
}

function createCopernicusDataSpaceAdapter() {
    return createSatelliteProviderAdapter({
        providerId:
            "copernicus-data-space",

        search,

        select,

        acquire
    });
}

module.exports = {
    CDSE_STAC_BASE_URL,
    SENTINEL2_L2A_COLLECTION,
    DEFAULT_SEARCH_LIMIT,
    buildSearchPayload,
    search,
    select,
    acquire,
    createCopernicusDataSpaceAdapter
};
