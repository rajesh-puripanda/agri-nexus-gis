"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    CDSE_STAC_BASE_URL,
    SENTINEL2_L2A_COLLECTION,
    DEFAULT_SEARCH_LIMIT,
    buildSearchPayload,
    search,
    select,
    createCopernicusDataSpaceAdapter
} = require(
    "../services/remoteSensing/acquisition/copernicusDataSpaceAdapter"
);

const VALID_REQUEST = {
    temporalContext: {
        startDate: "2026-09-01",
        endDate: "2026-09-15"
    },

    spatialContext: {
        bbox: {
            west: 82.9,
            south: 17.6,
            east: 83.4,
            north: 17.9
        }
    },

    acquisitionParameters: {
        maxCloudCover: 20
    }
};

test(
    "buildSearchPayload creates the Sentinel-2 L2A STAC search payload",
    () => {
        const payload =
            buildSearchPayload(
                VALID_REQUEST
            );

        assert.deepEqual(
            payload,
            {
                collections: [
                    SENTINEL2_L2A_COLLECTION
                ],

                datetime:
                    "2026-09-01T00:00:00Z/" +
                    "2026-09-15T23:59:59Z",

                bbox: [
                    82.9,
                    17.6,
                    83.4,
                    17.9
                ],

                limit:
                    DEFAULT_SEARCH_LIMIT,

                query: {
                    "eo:cloud_cover": {
                        lte: 20
                    }
                }
            }
        );
    }
);

test(
    "buildSearchPayload supports a custom search limit",
    () => {
        const payload =
            buildSearchPayload(
                VALID_REQUEST,
                {
                    limit: 5
                }
            );

        assert.equal(
            payload.limit,
            5
        );
    }
);

test(
    "search sends the STAC request using POST",
    async () => {
        let capturedUrl;
        let capturedOptions;

        const fetchImpl = async (
            url,
            options
        ) => {
            capturedUrl = url;
            capturedOptions = options;

            return {
                ok: true,

                json: async () => ({
                    type: "FeatureCollection",
                    features: []
                })
            };
        };

        const result =
            await search(
                VALID_REQUEST,
                {
                    fetchImpl
                }
            );

        assert.equal(
            capturedUrl,
            `${CDSE_STAC_BASE_URL}/search`
        );

        assert.equal(
            capturedOptions.method,
            "POST"
        );

        assert.equal(
            capturedOptions.headers["content-type"],
            "application/json"
        );

        assert.equal(
            capturedOptions.headers.accept,
            "application/geo+json"
        );

        assert.deepEqual(
            JSON.parse(
                capturedOptions.body
            ),
            buildSearchPayload(
                VALID_REQUEST
            )
        );

        assert.deepEqual(
            result,
            {
                type: "FeatureCollection",
                features: []
            }
        );
    }
);

test(
    "search reports a CDSE STAC failure",
    async () => {
        const fetchImpl = async () => ({
            ok: false,
            status: 400,
            statusText: "Bad Request"
        });

        await assert.rejects(
            () =>
                search(
                    VALID_REQUEST,
                    {
                        fetchImpl
                    }
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "CDSE_STAC_SEARCH_FAILED"
                );

                assert.equal(
                    error.status,
                    400
                );

                return true;
            }
        );
    }
);

test(
    "select returns the supplied catalogue items",
    () => {
        const items = [
            {
                id: "S2_TEST_001"
            },
            {
                id: "S2_TEST_002"
            }
        ];

        assert.deepEqual(
            select(items),
            items
        );
    }
);

test(
    "createCopernicusDataSpaceAdapter exposes the provider boundary",
    () => {
        const adapter =
            createCopernicusDataSpaceAdapter();

        assert.equal(
            adapter.providerId,
            "copernicus-data-space"
        );

        assert.equal(
            typeof adapter.search,
            "function"
        );

        assert.equal(
            typeof adapter.select,
            "function"
        );

        assert.equal(
            typeof adapter.acquire,
            "function"
        );
    }
);
test(
    "buildSearchPayload adds an explicit Sentinel-2 scene ID filter",
    () => {
        const sceneId =
            "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920";

        const request = {
            ...VALID_REQUEST,

            acquisitionParameters: {
                ...VALID_REQUEST.acquisitionParameters,
                sceneId
            }
        };

        const payload =
            buildSearchPayload(
                request
            );

        assert.deepEqual(
            payload.ids,
            [
                sceneId
            ]
        );

        assert.deepEqual(
            payload.query,
            {
                "eo:cloud_cover": {
                    lte: 20
                }
            }
        );
    }
);
