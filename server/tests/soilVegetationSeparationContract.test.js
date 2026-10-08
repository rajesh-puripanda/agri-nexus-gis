"use strict";

const {
    SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION,
    ANALYSIS_TYPE,
    ANALYSIS_METHOD,
    INTERPRETATION_MODE,
    validateSoilVegetationSeparationRequest
} = require("../scientific/remoteSensing/soilVegetation/soilVegetationSeparationContract");

function createSpatialReference() {
    return {
        origin: [738570, 1964090, 0],
        resolution: [10, -10, 0],
        boundingBox: [738570, 1956200, 749280, 1964090],
        geoKeys: {
            ProjectedCSTypeGeoKey: 32644
        }
    };
}

function createRaster(indexCode, width = 2, height = 2, spatialReference = createSpatialReference()) {
    return {
        contractVersion: "1.0",
        width,
        height,
        pixelCount: width * height,
        bands: {
            [indexCode]: {
                data: new Float32Array(width * height),
                sourceBand: 1
            }
        },
        noData: -9999,
        spatialReference,
        metadata: {}
    };
}

function createRequest(ndviRaster, bsiRaster) {
    return {
        contractVersion:
            SOIL_VEGETATION_SEPARATION_CONTRACT_VERSION,

        analysisType:
            ANALYSIS_TYPE,

        method:
            ANALYSIS_METHOD,

        interpretationMode:
            INTERPRETATION_MODE,

        inputs: {
            ndvi: {
                raster: ndviRaster
            },
            bsi: {
                raster: bsiRaster
            }
        },

        spatialContext: {},

        parameters: {}
    };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAIL: ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

test("accepts compatible NDVI and BSI rasters", () => {
    const result = validateSoilVegetationSeparationRequest(
        createRequest(
            createRaster("NDVI"),
            createRaster("BSI")
        )
    );

    assert(result.valid, result.errors.join("; "));
});

test("rejects raster width mismatch", () => {
    const result = validateSoilVegetationSeparationRequest(
        createRequest(
            createRaster("NDVI", 3, 2),
            createRaster("BSI", 2, 2)
        )
    );

    assert(
        !result.valid,
        "Width mismatch should be rejected."
    );
});

test("rejects spatial resolution mismatch", () => {
    const spatialReference = createSpatialReference();

    const otherSpatialReference = {
        ...spatialReference,
        resolution: [20, -20, 0]
    };

    const result = validateSoilVegetationSeparationRequest(
        createRequest(
            createRaster("NDVI", 2, 2, spatialReference),
            createRaster("BSI", 2, 2, otherSpatialReference)
        )
    );

    assert(
        !result.valid,
        "Resolution mismatch should be rejected."
    );
});

test("rejects coordinate reference mismatch", () => {
    const spatialReference = createSpatialReference();

    const otherSpatialReference = {
        ...spatialReference,
        geoKeys: {
            ProjectedCSTypeGeoKey: 32643
        }
    };

    const result = validateSoilVegetationSeparationRequest(
        createRequest(
            createRaster("NDVI", 2, 2, spatialReference),
            createRaster("BSI", 2, 2, otherSpatialReference)
        )
    );

    assert(
        !result.valid,
        "Coordinate reference mismatch should be rejected."
    );
});
