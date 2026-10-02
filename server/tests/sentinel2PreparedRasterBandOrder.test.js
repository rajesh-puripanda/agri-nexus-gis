"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getSentinel2PreparedRasterBandOrder,
    getSentinel2PreparedRasterSourceBand
} = require(
    "../scientific/remoteSensing/bands/" +
    "sentinel2PreparedRasterBandOrder"
);

test("Sentinel-2 prepared raster band order is correct", () => {
    assert.deepEqual(
        getSentinel2PreparedRasterBandOrder(10),
        [
            "Blue",
            "Green",
            "Red",
            "NIR"
        ]
    );

    assert.deepEqual(
        getSentinel2PreparedRasterBandOrder(20),
        [
            "RedEdge1",
            "RedEdge2",
            "RedEdge3",
            "RedEdge4",
            "SWIR1",
            "SWIR2"
        ]
    );

    assert.deepEqual(
        getSentinel2PreparedRasterBandOrder(60),
        [
            "CoastalAerosol",
            "WaterVapor"
        ]
    );
});

test("Sentinel-2 canonical spectral bands resolve to prepared raster sample positions", () => {
    assert.equal(
        getSentinel2PreparedRasterSourceBand(
            "NIR",
            10
        ),
        4
    );

    assert.equal(
        getSentinel2PreparedRasterSourceBand(
            "SWIR1",
            20
        ),
        5
    );
});

test("band absent from native-resolution raster is rejected", () => {
    assert.throws(
        () =>
            getSentinel2PreparedRasterSourceBand(
                "SWIR1",
                10
            ),
        /not present in the 10m prepared raster/
    );
});
