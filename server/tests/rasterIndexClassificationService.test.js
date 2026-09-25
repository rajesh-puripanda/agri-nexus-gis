"use strict";

// ============================================================
// server/tests/rasterIndexClassificationService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.3.2
// Raster Index Classification Service Tests
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getIndexDefinition
} = require("../scientific/remoteSensing/indices/indexRegistry");

const {
    validateRasterIndexClassificationResult
} = require("../scientific/remoteSensing/raster/rasterIndexClassificationContract");

const {
    isNoDataValue,
    getRasterNoData,
    findClassification,
    createClassDefinitions,
    calculateClassStatistics,
    classifyRasterIndex,
    processRasterIndexClassification
} = require("../services/remoteSensing/raster/rasterIndexClassificationService");

function createRaster(indexCode, values, options = {}) {
    const width = options.width || values.length;
    const height = options.height || 1;

    return {
        contractVersion: "1.0",
        width,
        height,
        pixelCount: width * height,
        bands: {
            [indexCode]: {
                data: values
            }
        },
        noData:
            options.noData !== undefined
                ? options.noData
                : null,
        spatialReference:
            options.spatialReference || {
                origin: [100, 200],
                resolution: [10, -10],
                boundingBox: [100, 160, 140, 200],
                geoKeys: {
                    GeographicTypeGeoKey: 4326
                }
            },
        metadata:
            options.metadata || {
                sourceType: "Calculated Raster Index"
            }
    };
}

function createClassificationRequest(
    indexCode,
    values,
    options = {}
) {
    return {
        indexCode,
        raster: createRaster(indexCode, values, options),
        parameters: options.parameters || {},
        processingContext:
            options.processingContext || {
                source: "test"
            },
        spatialContext:
            options.spatialContext || {
                region: "test-region"
            }
    };
}

// ============================================================
// Helper Functions
// ============================================================

test("isNoDataValue recognizes explicit NoData values", () => {
    assert.equal(isNoDataValue(-9999, -9999), true);
    assert.equal(isNoDataValue(0, -9999), false);
    assert.equal(isNoDataValue(0, null), false);
    assert.equal(isNoDataValue(0, undefined), false);
});

test("getRasterNoData prefers request NoData", () => {
    const raster = {
        noData: -9999
    };

    assert.equal(
        getRasterNoData(raster, -32768),
        -32768
    );
});

test("getRasterNoData falls back to raster NoData", () => {
    const raster = {
        noData: -9999
    };

    assert.equal(
        getRasterNoData(raster, undefined),
        -9999
    );
});

test("getRasterNoData returns null when NoData is absent", () => {
    assert.equal(
        getRasterNoData({}, undefined),
        null
    );
});

test("findClassification applies non-final half-open boundaries", () => {
    const definition = getIndexDefinition("NDVI");

    const classes =
        definition.classificationRules.classes;

    assert.equal(
        findClassification(0, classes).classification.code,
        "low"
    );

    assert.equal(
        findClassification(0.2, classes).classification.code,
        "moderate"
    );

    assert.equal(
        findClassification(0.5, classes).classification.code,
        "high"
    );

    assert.equal(
        findClassification(0.8, classes).classification.code,
        "very_high"
    );
});

test("findClassification includes the final maximum boundary", () => {
    const definition = getIndexDefinition("NDVI");

    const match = findClassification(
        1.0,
        definition.classificationRules.classes
    );

    assert.ok(match);
    assert.equal(
        match.classification.code,
        "very_high"
    );
    assert.equal(match.classValue, 5);
});

test("findClassification rejects values outside the registered valid range", () => {
    const definition = getIndexDefinition("NDVI");

    assert.equal(
        findClassification(
            -1.000001,
            definition.classificationRules.classes
        ),
        null
    );

    assert.equal(
        findClassification(
            1.000001,
            definition.classificationRules.classes
        ),
        null
    );
});

test("createClassDefinitions derives definitions from registered classes", () => {
    const definition = getIndexDefinition("NDVI");

    const result = createClassDefinitions(
        definition.classificationRules.classes
    );

    assert.equal(result.length, 5);

    assert.deepEqual(
        result[0],
        {
            classValue: 1,
            classCode: "very_low",
            label: "Very Low Vegetation",
            min: -1,
            max: 0
        }
    );

    assert.equal(
        result[4].classValue,
        5
    );
});

test("calculateClassStatistics calculates percentages", () => {
    const classes = [
        {
            classValue: 1,
            classCode: "low",
            label: "Low",
            min: 0,
            max: 0.2,
            pixelCount: 2
        },
        {
            classValue: 2,
            classCode: "moderate",
            label: "Moderate",
            min: 0.2,
            max: 0.5,
            pixelCount: 3
        }
    ];

    const result = calculateClassStatistics({
        classStatistics: classes,
        validPixelCount: 5
    });

    assert.equal(result[0].percentage, 40);
    assert.equal(result[1].percentage, 60);
});

// ============================================================
// Direct Raster Classification
// ============================================================

test("classifyRasterIndex produces Uint8Array class raster", () => {
    const indexCode = "NDVI";

    const definition =
        getIndexDefinition(indexCode);

    const raster = createRaster(
        indexCode,
        [-0.5, 0.1, 0.3, 0.6, 0.9]
    );

    const result = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules:
            definition.classificationRules,
        noData: null
    });

    assert.ok(
        result.raster.bands[indexCode].data
            instanceof Uint8Array
    );

    assert.deepEqual(
        Array.from(
            result.raster.bands[indexCode].data
        ),
        [1, 2, 3, 4, 5]
    );

    assert.equal(
        result.validPixelCount,
        5
    );

    assert.equal(
        result.noDataPixelCount,
        0
    );
});

test("classifyRasterIndex propagates explicit NoData", () => {
    const indexCode = "NDVI";

    const definition =
        getIndexDefinition(indexCode);

    const raster = createRaster(
        indexCode,
        [-0.5, -9999, 0.3, -9999],
        {
            noData: -9999
        }
    );

    const result = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules:
            definition.classificationRules,
        noData: -9999
    });

    assert.deepEqual(
        Array.from(
            result.raster.bands[indexCode].data
        ),
        [1, 0, 3, 0]
    );

    assert.equal(
        result.validPixelCount,
        2
    );

    assert.equal(
        result.noDataPixelCount,
        2
    );
});

test("classifyRasterIndex treats non-finite values as NoData", () => {
    const indexCode = "NDVI";

    const definition =
        getIndexDefinition(indexCode);

    const raster = createRaster(
        indexCode,
        [0.1, NaN, Infinity, -Infinity]
    );

    const result = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules:
            definition.classificationRules,
        noData: null
    });

    assert.deepEqual(
        Array.from(
            result.raster.bands[indexCode].data
        ),
        [2, 0, 0, 0]
    );

    assert.equal(
        result.validPixelCount,
        1
    );

    assert.equal(
        result.noDataPixelCount,
        3
    );
});

test("classifyRasterIndex preserves raster dimensions and spatial reference", () => {
    const indexCode = "NDVI";

    const definition =
        getIndexDefinition(indexCode);

    const spatialReference = {
        origin: [100, 200],
        resolution: [10, -10],
        boundingBox: [100, 160, 140, 200],
        geoKeys: {
            GeographicTypeGeoKey: 4326
        }
    };

    const raster = createRaster(
        indexCode,
        [0.1, 0.3, 0.6, 0.9],
        {
            width: 2,
            height: 2,
            spatialReference
        }
    );

    const result = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules:
            definition.classificationRules,
        noData: null
    });

    assert.equal(result.raster.width, 2);
    assert.equal(result.raster.height, 2);
    assert.equal(result.raster.pixelCount, 4);

    assert.deepEqual(
        result.raster.spatialReference,
        spatialReference
    );
});

test("classifyRasterIndex creates class statistics", () => {
    const indexCode = "NDVI";

    const definition =
        getIndexDefinition(indexCode);

    const raster = createRaster(
        indexCode,
        [
            -0.5,
            0.1,
            0.3,
            0.6,
            0.9,
            0.95
        ]
    );

    const result = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules:
            definition.classificationRules,
        noData: null
    });

    assert.equal(
        result.classStatistics.length,
        5
    );

    assert.deepEqual(
        result.classStatistics.map(
            item => item.pixelCount
        ),
        [1, 1, 1, 1, 2]
    );

    const percentages =
        result.classStatistics.map(
            item => item.percentage
        );

    assert.equal(percentages.length, 5);

    assert.ok(
        Math.abs(percentages[0] - (100 / 6)) < 1e-12
    );

    assert.ok(
        Math.abs(percentages[1] - (100 / 6)) < 1e-12
    );

    assert.ok(
        Math.abs(percentages[2] - (100 / 6)) < 1e-12
    );

    assert.ok(
        Math.abs(percentages[3] - (100 / 6)) < 1e-12
    );

    assert.ok(
        Math.abs(percentages[4] - (200 / 6)) < 1e-12
    );
});

// ============================================================
// Full Service
// ============================================================

test("processRasterIndexClassification returns complete result contract", () => {
    const request =
        createClassificationRequest(
            "NDVI",
            [-0.5, 0.1, 0.3, 0.6, 0.9]
        );

    const result =
        processRasterIndexClassification(request);

    assert.equal(
        result.analysisType,
        "remote_sensing_raster_index_classification"
    );

    assert.equal(
        result.analysisVersion,
        "1.0"
    );

    assert.ok(result.timestamp);

    assert.equal(
        result.inputContext.indexCode,
        "NDVI"
    );

    assert.equal(
        result.inputContext.indexName,
        "Normalized Difference Vegetation Index"
    );

    assert.equal(
        result.classification.method,
        "baseline_qualitative"
    );

    assert.ok(
        Array.isArray(
            result.classification.classDefinitions
        )
    );

    assert.equal(
        result.classification.classDefinitions.length,
        5
    );

    assert.ok(
        result.classification.raster
    );

    assert.deepEqual(
        Array.from(
            result.classification.raster.bands.NDVI.data
        ),
        [1, 2, 3, 4, 5]
    );
});

test("processRasterIndexClassification reports class statistics", () => {
    const request =
        createClassificationRequest(
            "NDVI",
            [-0.5, 0.1, 0.3, 0.6, 0.9, 0.9]
        );

    const result =
        processRasterIndexClassification(request);

    const classes =
        result.classification.statistics.classes;

    assert.deepEqual(
        classes.map(item => item.pixelCount),
        [1, 1, 1, 1, 2]
    );

    assert.equal(
        result.classification.statistics.validPixelCount,
        6
    );

    assert.equal(
        result.classification.statistics.noDataPixelCount,
        0
    );

    assert.equal(
        result.classification.statistics.totalPixelCount,
        6
    );
});

test("processRasterIndexClassification preserves NoData statistics", () => {
    const request =
        createClassificationRequest(
            "NDVI",
            [-0.5, -9999, 0.3, NaN],
            {
                noData: -9999
            }
        );

    const result =
        processRasterIndexClassification(request);

    assert.deepEqual(
        Array.from(
            result.classification.raster.bands.NDVI.data
        ),
        [1, 0, 3, 0]
    );

    assert.equal(
        result.classification.statistics.validPixelCount,
        2
    );

    assert.equal(
        result.classification.statistics.noDataPixelCount,
        2
    );
});

test("processRasterIndexClassification preserves processing and spatial context", () => {
    const request =
        createClassificationRequest(
            "NDVI",
            [0.1],
            {
                processingContext: {
                    source: "Sentinel-2",
                    sceneId: "TEST-001"
                },
                spatialContext: {
                    region: "Visakhapatnam"
                }
            }
        );

    const result =
        processRasterIndexClassification(request);

    assert.deepEqual(
        result.inputContext.processingContext,
        {
            source: "Sentinel-2",
            sceneId: "TEST-001"
        }
    );

    assert.deepEqual(
        result.spatialContext,
        {
            region: "Visakhapatnam"
        }
    );
});

test("processRasterIndexClassification identifies processing metadata", () => {
    const result =
        processRasterIndexClassification(
            createClassificationRequest(
                "NDVI",
                [0.1]
            )
        );

    assert.equal(
        result.metadata.processingType,
        "pixelwise_raster_classification"
    );

    assert.equal(
        result.metadata.indexCode,
        "NDVI"
    );

    assert.equal(
        result.metadata.indexName,
        "Normalized Difference Vegetation Index"
    );

    assert.equal(
        result.metadata.classificationMethod,
        "baseline_qualitative"
    );
});

test("processRasterIndexClassification result satisfies result contract", () => {
    const result =
        processRasterIndexClassification(
            createClassificationRequest(
                "NDVI",
                [0.1, 0.3, 0.6, 0.9]
            )
        );

    const validation =
        validateRasterIndexClassificationResult(
            result
        );

    assert.equal(
        validation.valid,
        true,
        validation.errors?.join("; ")
    );
});

// ============================================================
// All Registered Indices
// ============================================================

test("processRasterIndexClassification supports all registered indices", () => {
    const indices = [
        "NDVI",
        "EVI",
        "SAVI",
        "GNDVI",
        "ARVI",
        "NDWI",
        "NDMI"
    ];

    for (const indexCode of indices) {
        const result =
            processRasterIndexClassification(
                createClassificationRequest(
                    indexCode,
                    [-0.5, 0.1, 0.3, 0.6, 0.9]
                )
            );

        assert.equal(
            result.inputContext.indexCode,
            indexCode
        );

        assert.equal(
            result.classification.classDefinitions.length,
            5
        );

        assert.deepEqual(
            Array.from(
                result.classification.raster
                    .bands[indexCode]
                    .data
            ),
            [1, 2, 3, 4, 5]
        );
    }
});

// ============================================================
// Validation / Error Handling
// ============================================================

test("processRasterIndexClassification rejects unknown index", () => {
    assert.throws(
        () =>
            processRasterIndexClassification(
                createClassificationRequest(
                    "UNKNOWN_INDEX",
                    [0.1]
                )
            ),
        /Invalid raster index classification request/
    );
});

test("processRasterIndexClassification rejects missing calculated index band", () => {
    const request = {
        indexCode: "NDVI",
        raster: {
            width: 1,
            height: 1,
            pixelCount: 1,
            bands: {
                EVI: {
                    data: new Float32Array([0.1])
                }
            },
            noData: null,
            spatialReference: {},
            metadata: {}
        }
    };

    assert.throws(
        () =>
            processRasterIndexClassification(request),
        /raster is missing calculated index band: NDVI/
    );
});

test("processRasterIndexClassification rejects incorrect pixel count", () => {
    const request = createClassificationRequest(
        "NDVI",
        [0.1, 0.2],
        {
            width: 2,
            height: 2
        }
    );

    assert.throws(
        () =>
            processRasterIndexClassification(request),
        /contains 2 pixels; expected 4/
    );
});

test("processRasterIndexClassification preserves continuous input raster", () => {
    const values =
        new Float32Array([
            -0.5,
            0.1,
            0.3,
            0.6,
            0.9
        ]);

    const raster =
        createRaster("NDVI", values);

    const originalValues =
        Array.from(values);

    processRasterIndexClassification({
        indexCode: "NDVI",
        raster
    });

    assert.deepEqual(
        Array.from(
            raster.bands.NDVI.data
        ),
        originalValues
    );
});



