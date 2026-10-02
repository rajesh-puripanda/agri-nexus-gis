"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    processMultiSourceRasterIndex
} = require(
    "../services/remoteSensing/raster/multiSourceRasterIndexWorkflowService"
);

test(
    "processMultiSourceRasterIndex aligns mixed-resolution NIR and SWIR sources before NDMI calculation",
    async () => {
        const result =
            await processMultiSourceRasterIndex({
                indexCode: "NDMI",
                targetResolution: 20,
                sources: [
                    {
                        band: "NIR",
                        raster: {
                            width: 4,
                            height: 4,
                            data: [
                                new Float32Array([
                                    0.8, 0.8, 0.8, 0.8,
                                    0.8, 0.8, 0.8, 0.8,
                                    0.8, 0.8, 0.8, 0.8,
                                    0.8, 0.8, 0.8, 0.8
                                ])
                            ],
                            noData: -9999,
                            origin: [0, 80, 0],
                            resolution: [10, -10, 0],
                            boundingBox: [0, 40, 40, 80],
                            geoKeys: {
                                ProjectedCSTypeGeoKey: 32644
                            }
                        }
                    },
                    {
                        band: "SWIR",
                        raster: {
                            width: 2,
                            height: 2,
                            data: [
                                new Float32Array([
                                    0.2, 0.2,
                                    0.2, 0.2
                                ])
                            ],
                            noData: -9999,
                            origin: [0, 80, 0],
                            resolution: [20, -20, 0],
                            boundingBox: [0, 40, 40, 80],
                            geoKeys: {
                                ProjectedCSTypeGeoKey: 32644
                            }
                        }
                    }
                ]
            });

        assert.equal(result.indexCode, "NDMI");
        assert.equal(result.targetResolution, 20);

        assert.deepEqual(
            result.sourceBands,
            ["NIR", "SWIR"]
        );

        assert.equal(
            result.normalizedRaster.width,
            2
        );

        assert.equal(
            result.normalizedRaster.height,
            2
        );

        assert.deepEqual(
            result.normalizedRaster.spatialReference.resolution,
            [20, -20, 0]
        );

        assert.equal(
            result.normalizedRaster.spatialReference.geoKeys
                .ProjectedCSTypeGeoKey,
            32644
        );

        const ndmiData =
            result.result.results.raster.bands.NDMI.data;

        assert.equal(ndmiData.length, 4);

        for (const value of ndmiData) {
            assert.ok(
                Math.abs(value - 0.6) < 1e-6,
                `Expected NDMI  0.6, received ${value}`
            );
        }
    }
);

test(
    "selects an explicit sourceBand from a multi-band raster",
    async () => {
        const result =
            await processMultiSourceRasterIndex({
                indexCode: "NDMI",
                targetResolution: 20,
                sources: [
                    {
                        band: "NIR",
                        sourceBand: 4,
                        raster: {
                            width: 2,
                            height: 2,
                            data: [
                                new Float32Array([
                                    0.1, 0.1, 0.1, 0.1
                                ]),
                                new Float32Array([
                                    0.2, 0.2, 0.2, 0.2
                                ]),
                                new Float32Array([
                                    0.3, 0.3, 0.3, 0.3
                                ]),
                                new Float32Array([
                                    0.8, 0.8, 0.8, 0.8
                                ])
                            ],
                            noData: -9999,
                            origin: [0, 40, 0],
                            resolution: [20, -20, 0],
                            boundingBox: [0, 0, 40, 40],
                            geoKeys: {
                                ProjectedCSTypeGeoKey: 32644
                            }
                        }
                    },
                    {
                        band: "SWIR",
                        sourceBand: 1,
                        raster: {
                            width: 2,
                            height: 2,
                            data: [
                                new Float32Array([
                                    0.2, 0.2, 0.2, 0.2
                                ])
                            ],
                            noData: -9999,
                            origin: [0, 40, 0],
                            resolution: [20, -20, 0],
                            boundingBox: [0, 0, 40, 40],
                            geoKeys: {
                                ProjectedCSTypeGeoKey: 32644
                            }
                        }
                    }
                ]
            });

        const ndmiData =
            result.result.results.raster.bands.NDMI.data;

        assert.equal(ndmiData.length, 4);

        for (const value of ndmiData) {
            assert.ok(
                Math.abs(value - 0.6) < 1e-6,
                `Expected NDMI 0.6, received ${value}`
            );
        }
    }
);