"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    resolveSentinel2PreparedRasterSource
} = require(
    "../scientific/remoteSensing/bands/" +
    "sentinel2PreparedRasterSourceResolver"
);

test("resolves canonical NIR to Sentinel-2 B08 prepared raster source", () => {
    assert.deepEqual(
        resolveSentinel2PreparedRasterSource(
            "NIR"
        ),
        {
            canonicalBandName: "NIR",
            sentinel2BandName: "NIR",
            bandId: "B08",
            assetKey: "B08_10m",
            nativeResolution: 10,
            sourceBand: 4
        }
    );
});

test("resolves canonical SWIR to Sentinel-2 B11 prepared raster source", () => {
    assert.deepEqual(
        resolveSentinel2PreparedRasterSource(
            "SWIR"
        ),
        {
            canonicalBandName: "SWIR",
            sentinel2BandName: "SWIR1",
            bandId: "B11",
            assetKey: "B11_20m",
            nativeResolution: 20,
            sourceBand: 5
        }
    );
});

test("unsupported canonical spectral band is rejected", () => {
    assert.throws(
        () =>
            resolveSentinel2PreparedRasterSource(
                "Thermal"
            ),
        /Unsupported Sentinel-2 canonical spectral band: Thermal/
    );
});
