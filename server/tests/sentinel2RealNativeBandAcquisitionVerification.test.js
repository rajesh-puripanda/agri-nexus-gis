"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    acquireSentinel2Bands
} = require("../services/remoteSensing/acquisition/sentinel2AcquisitionService");

const {
    getAllSentinel2Bands,
    getSentinel2BandDefinition
} = require("../scientific/remoteSensing/bands/sentinel2BandCatalog");


const TEST_REQUEST = {
    request: {
        temporalContext: {
            startDate: "2026-09-08",
            endDate: "2026-09-09"
        },

        spatialContext: {
            bbox: {
                west: 82.9,
                south: 17.6,
                east: 83.4,
                north: 17.9
            }
        }
    }
};

test(
    "real Sentinel-2 scene resolves all native L2A bands",
    async () => {

        const result =
            await acquireSentinel2Bands(
                TEST_REQUEST
            );


        assert.ok(
            result,
            "Acquisition result must exist"
        );


        assert.ok(
            result.bands && typeof result.bands === "object" && !Array.isArray(result.bands),
        );


        const catalog =
            getAllSentinel2Bands();


        assert.equal(
            Object.keys(result.bands).length,
            catalog.length,
            "All Sentinel-2 native bands must resolve"
        );


        for (const [bandName, band] of Object.entries(result.bands)) {

            const definition =
                getSentinel2BandDefinition(
                    bandName
                );


            assert.ok(
                definition,
                `${bandName} must exist in band catalog`
            );


            assert.equal(
                band.assetKey,
                definition.assetKey
            );


            /*
            Spatial contract
            ----------------
            CDSE returns:
                proj:code = EPSG:32644

            AgriNexus normalizes:
                geoKeys.ProjectedCSTypeGeoKey = 32644
            */

            assert.equal(
                band.spatialReference
                    .geoKeys
                    .ProjectedCSTypeGeoKey,
                32644
            );


            assert.equal(
                band.spatialReference
                    .resolution[0],
                definition.nativeResolution
            );


            /*
            Radiometric contract
            --------------------
            Sentinel-2 L2A BOA reflectance
            */

            assert.equal(
                band.radiometry.scale,
                0.0001
            );


            assert.equal(
                band.radiometry.offset,
                -0.1
            );


            assert.equal(
                band.radiometry.noData,
                0
            );


            assert.equal(
                band.radiometry.sourceDataType,
                "UINT16"
            );


            console.log(
                [
                    "PASS",
                    band.assetKey.padEnd(5),
                    `${band.spatialReference.resolution[0]}m`,
                    band.radiometry.sourceDataType,
                    band.asset.href
                ].join(" | ")
            );
        }
    }
);












