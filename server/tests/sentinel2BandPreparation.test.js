"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_NDVI_BANDS,
    getNDVIBandAssets
} = require(
    "../services/remoteSensing/acquisition/sentinel2BandPreparation"
);

test("Sentinel-2 NDVI band mapping is correct", () => {
    assert.deepEqual(
        SENTINEL2_NDVI_BANDS,
        {
            Red: "B04_10m",
            NIR: "B08_10m"
        }
    );
});

test("getNDVIBandAssets returns Red and NIR assets", () => {
    const item = {
        assets: {
            B04_10m: {
                href: "red.tif"
            },
            B08_10m: {
                href: "nir.tif"
            }
        }
    };

    assert.deepEqual(
        getNDVIBandAssets(item),
        {
            Red: {
                href: "red.tif"
            },
            NIR: {
                href: "nir.tif"
            }
        }
    );
});

test("missing required band is rejected", () => {
    assert.throws(
        () =>
            getNDVIBandAssets({
                assets: {
                    B04_10m: {
                        href: "red.tif"
                    }
                }
            }),
        /Required Sentinel-2 NDVI band assets are missing/
    );
});
