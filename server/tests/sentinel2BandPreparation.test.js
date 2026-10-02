"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_BANDS,
    SENTINEL2_NDVI_BANDS,
    getSentinel2BandAssets,
    getNDVIBandAssets
} = require(
    "../services/remoteSensing/acquisition/sentinel2BandPreparation"
);

test("Sentinel-2 L2A spectral band mapping is correct", () => {
    assert.deepEqual(
        SENTINEL2_BANDS,
        {
            CoastalAerosol: "B01_60m",

            Blue: "B02_10m",
            Green: "B03_10m",
            Red: "B04_10m",

            RedEdge1: "B05_20m",
            RedEdge2: "B06_20m",
            RedEdge3: "B07_20m",

            NIR: "B08_10m",

            RedEdge4: "B8A_20m",

            WaterVapor: "B09_60m",

            SWIR1: "B11_20m",
            SWIR2: "B12_20m"
        }
    );
});

test("Sentinel-2 L2A mapping excludes B10 Cirrus", () => {
    assert.equal(
        Object.prototype.hasOwnProperty.call(
            SENTINEL2_BANDS,
            "Cirrus"
        ),
        false
    );
});

test("Sentinel-2 NDVI band mapping is correct", () => {
    assert.deepEqual(
        SENTINEL2_NDVI_BANDS,
        {
            Red: "B04_10m",
            NIR: "B08_10m"
        }
    );
});

test("getSentinel2BandAssets resolves all 12 L2A spectral bands", () => {
    const item = {
        assets: {
            B01_60m: { href: "b01.jp2" },
            B02_10m: { href: "b02.jp2" },
            B03_10m: { href: "b03.jp2" },
            B04_10m: { href: "b04.jp2" },
            B05_20m: { href: "b05.jp2" },
            B06_20m: { href: "b06.jp2" },
            B07_20m: { href: "b07.jp2" },
            B08_10m: { href: "b08.jp2" },
            B8A_20m: { href: "b8a.jp2" },
            B09_60m: { href: "b09.jp2" },
            B11_20m: { href: "b11.jp2" },
            B12_20m: { href: "b12.jp2" }
        }
    };

    const assets =
        getSentinel2BandAssets(item);

    assert.deepEqual(
        Object.keys(assets),
        [
            "CoastalAerosol",
            "Blue",
            "Green",
            "Red",
            "RedEdge1",
            "RedEdge2",
            "RedEdge3",
            "NIR",
            "RedEdge4",
            "WaterVapor",
            "SWIR1",
            "SWIR2"
        ]
    );

    assert.equal(
        assets.CoastalAerosol.href,
        "b01.jp2"
    );

    assert.equal(
        assets.Blue.href,
        "b02.jp2"
    );

    assert.equal(
        assets.Green.href,
        "b03.jp2"
    );

    assert.equal(
        assets.Red.href,
        "b04.jp2"
    );

    assert.equal(
        assets.RedEdge1.href,
        "b05.jp2"
    );

    assert.equal(
        assets.RedEdge2.href,
        "b06.jp2"
    );

    assert.equal(
        assets.RedEdge3.href,
        "b07.jp2"
    );

    assert.equal(
        assets.NIR.href,
        "b08.jp2"
    );

    assert.equal(
        assets.RedEdge4.href,
        "b8a.jp2"
    );

    assert.equal(
        assets.WaterVapor.href,
        "b09.jp2"
    );

    assert.equal(
        assets.SWIR1.href,
        "b11.jp2"
    );

    assert.equal(
        assets.SWIR2.href,
        "b12.jp2"
    );
});

test("getSentinel2BandAssets resolves a selected subset", () => {
    const item = {
        assets: {
            B03_10m: {
                href: "green.jp2"
            },
            B08_10m: {
                href: "nir.jp2"
            },
            B11_20m: {
                href: "swir1.jp2"
            }
        }
    };

    assert.deepEqual(
        getSentinel2BandAssets(
            item,
            [
                "Green",
                "NIR",
                "SWIR1"
            ]
        ),
        {
            Green: {
                href: "green.jp2"
            },
            NIR: {
                href: "nir.jp2"
            },
            SWIR1: {
                href: "swir1.jp2"
            }
        }
    );
});

test("unsupported Sentinel-2 band is rejected", () => {
    assert.throws(
        () =>
            getSentinel2BandAssets(
                {
                    assets: {}
                },
                ["Cirrus"]
            ),
        /Unsupported Sentinel-2 band: Cirrus/
    );
});

test("missing required Sentinel-2 band is rejected", () => {
    assert.throws(
        () =>
            getSentinel2BandAssets(
                {
                    assets: {
                        B04_10m: {
                            href: "red.jp2"
                        }
                    }
                },
                [
                    "Red",
                    "NIR"
                ]
            ),
        /Required Sentinel-2 band asset is missing: NIR \(B08_10m\)/
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

test("missing NDVI band preserves legacy error contract", () => {
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
