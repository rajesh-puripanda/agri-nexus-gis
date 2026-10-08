const {
    analyzePairedEvidence,
    processSoilVegetationSeparation
} = require("../services/remoteSensing/soilVegetation/soilVegetationSeparationService");

const spatialReference = {
    origin: [0, 0, 0],
    resolution: [10, -10, 0],
    boundingBox: [0, -20, 20, 0],
    geoKeys: {
        ProjectedCSTypeGeoKey: 32644
    }
};

function createRaster(code, data, noData = -9999) {
    return {
        contractVersion: "1.0",
        width: 2,
        height: 2,
        pixelCount: 4,
        bands: {
            [code]: {
                data: new Float32Array(data),
                sourceBand: 1
            }
        },
        noData,
        spatialReference,
        metadata: {}
    };
}

function assertClose(actual, expected, tolerance = 1e-6) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(
            `Expected ${expected}, received ${actual}`
        );
    }
}

function assertThrows(fn, message) {
    let threw = false;

    try {
        fn();
    } catch (error) {
        threw = true;
    }

    if (!threw) {
        throw new Error(message);
    }
}

// 1. Valid paired evidence
{
    const ndvi = createRaster("NDVI", [0.2, 0.4, 0.6, -9999]);
    const bsi = createRaster("BSI", [0.1, 0.3, 0.5, -9999]);

    const result = analyzePairedEvidence({
        ndviRaster: ndvi,
        bsiRaster: bsi
    });

    if (result.pairedPixelCount !== 4) {
        throw new Error("Expected 4 paired pixels.");
    }

    if (result.validPairedPixelCount !== 3) {
        throw new Error("Expected 3 valid paired pixels.");
    }

    if (result.noDataPairedPixelCount !== 1) {
        throw new Error("Expected 1 NoData paired pixel.");
    }

    assertClose(result.ndvi.minimum, 0.2);
    assertClose(result.ndvi.maximum, 0.6);
    assertClose(result.ndvi.mean, 0.4);

    assertClose(result.bsi.minimum, 0.1);
    assertClose(result.bsi.maximum, 0.5);
    assertClose(result.bsi.mean, 0.3);

    assertClose(result.relationship.coefficient, 1);

    console.log("PASS: valid paired evidence");
}

// 2. Spatial mismatch must be rejected by the processing boundary
{
    const ndvi = createRaster("NDVI", [0.2, 0.4, 0.6, 0.8]);
    const bsi = createRaster("BSI", [0.1, 0.3, 0.5, 0.7]);

    bsi.spatialReference = {
        ...spatialReference,
        resolution: [20, -20, 0]
    };

    assertThrows(
        () => processSoilVegetationSeparation({
            contractVersion: "1.0",
            analysisType: "remote_sensing_soil_vegetation_separation",
            method: "evidence_comparison",
            interpretationMode: "context_dependent",
            inputs: {
                ndvi,
                bsi
            },
            spatialContext: {},
            parameters: {}
        }),
        "Expected spatial mismatch to be rejected."
    );

    console.log("PASS: spatial mismatch rejected");
}

// 3. Coordinate-reference mismatch must be rejected
{
    const ndvi = createRaster("NDVI", [0.2, 0.4, 0.6, 0.8]);
    const bsi = createRaster("BSI", [0.1, 0.3, 0.5, 0.7]);

    bsi.spatialReference = {
        ...spatialReference,
        geoKeys: {
            ProjectedCSTypeGeoKey: 4326
        }
    };

    assertThrows(
        () => processSoilVegetationSeparation({
            contractVersion: "1.0",
            analysisType: "remote_sensing_soil_vegetation_separation",
            method: "evidence_comparison",
            interpretationMode: "context_dependent",
            inputs: {
                ndvi,
                bsi
            },
            spatialContext: {},
            parameters: {}
        }),
        "Expected coordinate-reference mismatch to be rejected."
    );

    console.log("PASS: coordinate-reference mismatch rejected");
}

// 4. Full processing contract success
{
    const ndvi = createRaster("NDVI", [0.2, 0.4, 0.6, 0.8]);
    const bsi = createRaster("BSI", [0.1, 0.3, 0.5, 0.7]);

    const result = processSoilVegetationSeparation({
        contractVersion: "1.0",
        analysisType: "remote_sensing_soil_vegetation_separation",
        method: "evidence_comparison",
        interpretationMode: "context_dependent",
        inputs: {
            ndvi: {
                raster: ndvi
            },
            bsi: {
                raster: bsi
            }
        },
        spatialContext: {},
        parameters: {}
    });

    if (result.contractVersion !== "1.0") {
        throw new Error("Invalid result contract version.");
    }

    if (result.analysisType !== "remote_sensing_soil_vegetation_separation") {
        throw new Error("Invalid result analysis type.");
    }

    if (result.parameters.method !== "evidence_comparison") {
        throw new Error("Invalid result method.");
    }

    if (result.parameters.interpretationMode !== "context_dependent") {
        throw new Error("Invalid interpretation mode.");
    }

    if (result.results.pairedEvidence.validPairedPixelCount !== 4) {
        throw new Error("Expected 4 valid paired pixels.");
    }

    if (result.statistics.validPairedPixelCount !== 4) {
        throw new Error("Expected 4 valid paired pixels in statistics.");
    }

    if (result.metadata.processingType !== "paired_remote_sensing_evidence_analysis") {
        throw new Error("Invalid processing type.");
    }

    console.log("PASS: full processing contract success");
}

console.log("ALL SOILVEGETATION SERVICE TESTS: PASS");
