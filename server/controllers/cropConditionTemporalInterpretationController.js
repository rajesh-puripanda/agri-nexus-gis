"use strict";
const path = require("path");

const {
    calculateCropConditionTemporalChangeStreaming
} = require("../services/cropIntelligence/cropConditionTemporalChangeStreamingWorkflowService");

const {
    PROCESSING_VERSION,
    buildCropConditionComparisonId,
    buildCropConditionEvidenceIdentity,
    buildCropConditionEvidencePaths,
    checkReusableCropConditionEvidence,
    saveCropConditionEvidence
} = require("../services/cropIntelligence/cropConditionEvidencePersistenceService");
const {
    findAvailableProduct
} = require("../services/remoteSensing/catalog/sentinel2IndexAvailabilityService");

const {
    createPublishedIndexObservation,
    inspectPublishedIndexRaster
} = require("../services/remoteSensing/temporal/publishedIndexObservationAdapterService");

const {
    createTemporalCompositionWorkflowRequest
} = require("../scientific/remoteSensing/temporal/temporalCompositionWorkflowRequestContract");

const {
    processTemporalCompositionWorkflow
} = require("../services/remoteSensing/temporal/temporalCompositionWorkflowService");

const {
    createTemporalAnalysisWorkflowRequest
} = require("../scientific/remoteSensing/temporal/temporalAnalysisWorkflowRequestContract");

const {
    processTemporalAnalysisWorkflow
} = require("../services/remoteSensing/temporal/temporalAnalysisWorkflowService");

const {
    createCropConditionEvidence
} = require("../scientific/cropIntelligence/cropConditionEvidenceContract");

const {
    processCropConditionInterpretation
} = require("../services/cropIntelligence/cropConditionInterpretationService");

const DEFAULT_PRODUCTION_ROOTS = [
    "./data/remote-sensing/outputs",
    "./data/remote-sensing/production",
    "./data/remote-sensing/production/ssmi",
];

const GRID_TOLERANCE = 1e-6;

function nearlyEqual(first, next) {
    return (
        Number.isFinite(first) &&
        Number.isFinite(next) &&
        Math.abs(first - next) <= GRID_TOLERANCE
    );
}

function spatialError(message, code) {
    return Object.assign(new Error(message), { code });
}

function calculateCommonFootprint(rasterMetadata) {
    if (!Array.isArray(rasterMetadata) || rasterMetadata.length < 2) {
        throw spatialError(
            "At least two raster metadata records are required.",
            "INVALID_TEMPORAL_RASTER_METADATA"
        );
    }

    const first = rasterMetadata[0];

    if (
        !first?.spatialContext ||
        !Array.isArray(first.spatialContext.origin) ||
        !Array.isArray(first.spatialContext.resolution)
    ) {
        throw spatialError(
            "Reference raster spatial metadata is incomplete.",
            "INVALID_TEMPORAL_RASTER_METADATA"
        );
    }

    const firstSpatial = first.spatialContext;
    const firstResolution = firstSpatial.resolution;

    for (const item of rasterMetadata) {
        const spatial = item?.spatialContext;
        const raster = item?.raster;

        if (
            !spatial ||
            !raster ||
            !Array.isArray(spatial.origin) ||
            !Array.isArray(spatial.resolution) ||
            !Array.isArray(spatial.boundingBox) ||
            spatial.origin.length < 2 ||
            spatial.resolution.length < 2 ||
            spatial.boundingBox.length !== 4 ||
            !spatial.origin.slice(0, 2).every(Number.isFinite) ||
            !spatial.resolution.slice(0, 2).every(Number.isFinite) ||
            !spatial.boundingBox.every(Number.isFinite) ||
            !Number.isInteger(raster.width) ||
            !Number.isInteger(raster.height) ||
            raster.width <= 0 ||
            raster.height <= 0
        ) {
            throw spatialError(
                "Published raster spatial metadata is incomplete or invalid.",
                "INVALID_TEMPORAL_RASTER_METADATA"
            );
        }

        if (
            spatial.projectedCrsCode !== firstSpatial.projectedCrsCode ||
            spatial.rasterType !== firstSpatial.rasterType ||
            !nearlyEqual(spatial.resolution[0], firstResolution[0]) ||
            !nearlyEqual(spatial.resolution[1], firstResolution[1]) ||
            spatial.resolution[0] === 0 ||
            spatial.resolution[1] === 0
        ) {
            throw spatialError(
                "Temporal comparison requires matching CRS, raster type, resolution, and orientation.",
                "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
            );
        }

        for (let axis = 0; axis < 2; axis += 1) {
            const pixelOffset =
                (spatial.origin[axis] - firstSpatial.origin[axis]) /
                firstResolution[axis];

            if (!nearlyEqual(pixelOffset, Math.round(pixelOffset))) {
                throw spatialError(
                    "Published rasters are not aligned to the same pixel grid.",
                    "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
                );
            }
        }
    }

    const commonBounds = [
        Math.max(
            ...rasterMetadata.map(item => item.spatialContext.boundingBox[0])
        ),
        Math.max(
            ...rasterMetadata.map(item => item.spatialContext.boundingBox[1])
        ),
        Math.min(
            ...rasterMetadata.map(item => item.spatialContext.boundingBox[2])
        ),
        Math.min(
            ...rasterMetadata.map(item => item.spatialContext.boundingBox[3])
        )
    ];

    if (
        commonBounds[0] >= commonBounds[2] ||
        commonBounds[1] >= commonBounds[3]
    ) {
        throw spatialError(
            "Published rasters do not have a common spatial footprint.",
            "NO_COMMON_TEMPORAL_FOOTPRINT"
        );
    }

    const windows = rasterMetadata.map(item => {
        const spatial = item.spatialContext;

        const [minX, minY, maxX, maxY] = commonBounds;
        const [originX, originY] = spatial.origin;
        const [resolutionX, resolutionY] = spatial.resolution;

        const columns = [
            (minX - originX) / resolutionX,
            (maxX - originX) / resolutionX
        ];

        const rows = [
            (minY - originY) / resolutionY,
            (maxY - originY) / resolutionY
        ];

        const normalizeZero = value =>
            Object.is(value, -0) ? 0 : value;

        const left = normalizeZero(Math.round(Math.min(...columns)));
        const right = normalizeZero(Math.round(Math.max(...columns)));
        const top = normalizeZero(Math.round(Math.min(...rows)));
        const bottom = normalizeZero(Math.round(Math.max(...rows)));

        if (
            !columns.every(value => nearlyEqual(value, Math.round(value))) ||
            !rows.every(value => nearlyEqual(value, Math.round(value))) ||
            left < 0 ||
            top < 0 ||
            right > item.raster.width ||
            bottom > item.raster.height ||
            left >= right ||
            top >= bottom
        ) {
            throw spatialError(
                "Common footprint does not align with published raster pixels.",
                "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
            );
        }

        return [left, top, right, bottom];
    });

    return {
        boundingBox: commonBounds,
        width: windows[0][2] - windows[0][0],
        height: windows[0][3] - windows[0][1],
        windows
    };
}

function isValidDateString(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function hasMatchingWindowGrid(observations, commonFootprint) {
    const first = observations[0];

    return observations.every(observation =>
        observation.raster.width === commonFootprint.width &&
        observation.raster.height === commonFootprint.height &&
        JSON.stringify(observation.spatialContext.boundingBox) ===
            JSON.stringify(commonFootprint.boundingBox) &&
        JSON.stringify(observation.spatialContext.resolution) ===
            JSON.stringify(first.spatialContext.resolution) &&
        observation.spatialContext.projectedCrsCode ===
            first.spatialContext.projectedCrsCode &&
        observation.spatialContext.rasterType ===
            first.spatialContext.rasterType &&
        JSON.stringify(observation.spatialContext.origin) ===
            JSON.stringify(first.spatialContext.origin)
    );
}

async function postCropConditionTemporalInterpretation(req, res) {
    try {
        const indexCode = String(req.body?.indexCode || "")
            .trim()
            .toUpperCase();

        const requestedObservations = req.body?.observations;

        if (
            !indexCode ||
            !Array.isArray(requestedObservations) ||
            requestedObservations.length < 2 ||
            requestedObservations.some(item =>
                !item ||
                !isValidDateString(item.observationDate) ||
                typeof item.sceneId !== "string" ||
                !item.sceneId.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                code: "INVALID_CROP_TEMPORAL_INTERPRETATION_REQUEST",
                message: "indexCode and at least two observations with valid observationDate and sceneId are required."
            });
        }

        for (
            let index = 1;
            index < requestedObservations.length;
            index += 1
        ) {
            if (
                requestedObservations[index].observationDate <=
                requestedObservations[index - 1].observationDate
            ) {
                return res.status(400).json({
                    success: false,
                    code: "INVALID_TEMPORAL_OBSERVATION_ORDER",
                    message: "Observations must be in strictly chronological order with unique dates."
                });
            }
        }

        const resolvedProducts = [];
        const rasterReferences = [];

        // Pass 1: resolve products and inspect raster metadata.
        for (const requested of requestedObservations) {
            const observationDate = requested.observationDate;
            const sceneId = requested.sceneId.trim();

            const product = await findAvailableProduct({
                productionRoots: DEFAULT_PRODUCTION_ROOTS,
                acquisitionDate: observationDate,
                indexCode,
                sceneId
            });

            if (!product?.availability?.continuous) {
                return res.status(404).json({
                    success: false,
                    code: "PUBLISHED_INDEX_UNAVAILABLE",
                    message: `No published continuous ${indexCode} raster is available for ${observationDate}.`,
                    observationDate,
                    sceneId
                });
            }

            const rasterMetadata = await inspectPublishedIndexRaster({
                sceneDirectory: product.productionDirectory,
                indexCode
            });

            if (
                rasterMetadata?.observation?.acquisitionDate !== observationDate ||
                rasterMetadata?.observation?.sceneId !== sceneId ||
                rasterMetadata?.observation?.indexCode !== indexCode
            ) {
                return res.status(409).json({
                    success: false,
                    code: "OBSERVATION_IDENTITY_MISMATCH",
                    message: "Published raster identity does not match the requested observation.",
                    observationDate,
                    sceneId
                });
            }

            resolvedProducts.push({
                product,
                observationDate,
                sceneId,
                rasterMetadata
            });

            if (product.availability.classification) {
                rasterReferences.push({
                    indexCode: product.indexCode,
                    sceneId: product.sceneId,
                    acquisitionDate: product.acquisitionDate,
                    productType: "index_classification",
                    fileName: product.outputs.classification,
                    targetResolution: product.targetResolution
                });
            }
        }

        // Calculate the exact shared footprint without resampling.
        const commonFootprint = calculateCommonFootprint(
            resolvedProducts.map(item => item.rasterMetadata)
        );

        // Pass 2: read statistics only within each common-footprint window.
        const observations = [];

        for (
            let index = 0;
            index < resolvedProducts.length;
            index += 1
        ) {
            const item = resolvedProducts[index];

            const observation = await createPublishedIndexObservation({
                sceneDirectory: item.product.productionDirectory,
                indexCode,
                window: commonFootprint.windows[index]
            });

            if (
                observation?.observation?.observationDate !== item.observationDate ||
                observation?.observation?.sceneId !== item.sceneId ||
                observation?.observation?.indexCode !== indexCode
            ) {
                return res.status(409).json({
                    success: false,
                    code: "OBSERVATION_IDENTITY_MISMATCH",
                    message: "Published raster identity does not match the requested observation.",
                    observationDate: item.observationDate,
                    sceneId: item.sceneId
                });
            }

            observations.push(observation);
        }

        if (!hasMatchingWindowGrid(observations, commonFootprint)) {
            return res.status(409).json({
                success: false,
                code: "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT",
                message: "Windowed observations do not share an identical spatial grid."
            });
        }

        const firstDate =
            observations[0].observation.observationDate;

        const lastDate =
            observations[observations.length - 1].observation.observationDate;

        const compositionId =
            `CROP-CONDITION-${indexCode}-${firstDate}-${lastDate}`;

        const comparisonMethod =
            "first_to_last_common_footprint_scene_mean";

        const comparisonScope =
            "common_footprint_scene_wide_mean";

        const compositionRequest =
            createTemporalCompositionWorkflowRequest({
                contractVersion: "1.0",
                compositionId,
                indexCode,
                observations,
                temporalContext: {
                    startDate: firstDate,
                    endDate: lastDate,
                    observationCount: observations.length
                },
                spatialContext: observations[0].spatialContext,
                processingContext: {
                    source: "published_index_temporal_comparison",
                    comparisonMethod,
                    observationCount: observations.length,
                    comparisonScope,
                    commonFootprint: {
                        boundingBox: commonFootprint.boundingBox,
                        width: commonFootprint.width,
                        height: commonFootprint.height
                    }
                },
                metadata: {
                    calibrationStatus: "not_calibrated"
                }
            });

        const compositionWorkflowResult =
            await processTemporalCompositionWorkflow(compositionRequest);

        const analysisRequest =
            createTemporalAnalysisWorkflowRequest({
                contractVersion: "1.0",
                analysisId: `CHANGE-${compositionId}`,
                analysisType: "CHANGE",
                composition: compositionWorkflowResult.composition,
                parameters: {
                    comparison: "first-last",
                    statistic: comparisonScope
                },
                metadata: {
                    source: "published_index_temporal_comparison",
                    comparisonMethod
                }
            });

        const analysisWorkflowResult =
            await processTemporalAnalysisWorkflow(analysisRequest);

        const temporalChange = analysisWorkflowResult.result;
        let pixelWiseChangeProduct = null;

        if (indexCode === "NDVI") {
            const firstProduct = resolvedProducts[0];
            const lastProduct = resolvedProducts[resolvedProducts.length - 1];

            const baseline = {
                sceneId: firstProduct.sceneId,
                date: firstProduct.observationDate,
                indexCode
            };

            const comparison = {
                sceneId: lastProduct.sceneId,
                date: lastProduct.observationDate,
                indexCode
            };

            const comparisonId = buildCropConditionComparisonId({
                indexCode,
                baseline,
                comparison
            });

            const identity = buildCropConditionEvidenceIdentity({
                indexCode,
                baseline,
                comparison,
                commonFootprint,
                spatialContext: observations[0].spatialContext
            });

            const paths = buildCropConditionEvidencePaths({
                comparisonId
            });

            const cachedEvidence =
                await checkReusableCropConditionEvidence({
                    outputDirectory: paths.outputDirectory,
                    expectedIdentity: identity
                });

            let rasterMetadata;
            let changeEvidence;
            let cacheStatus;

            if (cachedEvidence.reusable) {
                rasterMetadata = cachedEvidence.rasterMetadata;
                changeEvidence = cachedEvidence.evidence;
                cacheStatus = "reused";
            } else {
                const result =
                    await calculateCropConditionTemporalChangeStreaming({
                        baselinePath: path.join(
                            firstProduct.product.productionDirectory,
                            firstProduct.product.outputs.continuous
                        ),
                        comparisonPath: path.join(
                            lastProduct.product.productionDirectory,
                            lastProduct.product.outputs.continuous
                        ),
                        commonFootprint,
                        outputPath: paths.rasterPath,
                        baseline,
                        comparison
                    });

                await saveCropConditionEvidence({
                    outputDirectory: paths.outputDirectory,
                    rasterPath: paths.rasterPath,
                    identity,
                    result
                });

                rasterMetadata = result;
                changeEvidence = result;
                cacheStatus = "generated";
            }

            pixelWiseChangeProduct = {
                comparisonId,
                productCode: "NDVI_TEMPORAL_CHANGE",
                fileName: "NDVI_CHANGE.tif",
                relativePath: path.relative(
                    process.cwd(),
                    paths.rasterPath
                ).split(path.sep).join("/"),
                format: rasterMetadata.format,
                dataType: rasterMetadata.dataType,
                noData: rasterMetadata.noData,
                width: rasterMetadata.width,
                height: rasterMetadata.height,
                pixelCount: rasterMetadata.pixelCount,
                byteLength: rasterMetadata.byteLength,
                statistics: changeEvidence.statistics,
                baseline,
                comparison,
                method: "comparison_minus_baseline",
                calibrationStatus: "not_calibrated",
                processingVersion: PROCESSING_VERSION,
                cacheStatus
            };
        }
        const evidence = createCropConditionEvidence({
            indexObservations: observations,
            classifications: [],
            rasterReferences,
            temporalChanges: [temporalChange],
            spatialContext: observations[0].spatialContext,
            processingContext: {
                source: "published_index_temporal_comparison",
                indexCode,
                comparisonMethod,
                comparisonScope,
                spatialChangeDetected: false,
                observationCount: observations.length,
                commonFootprint: {
                    boundingBox: commonFootprint.boundingBox,
                    width: commonFootprint.width,
                    height: commonFootprint.height,
                    pixelCount:
                        commonFootprint.width * commonFootprint.height,
                    windows: commonFootprint.windows
                },
                observations: observations.map((observation, index) => ({
                    observationDate:
                        observation.observation.observationDate,
                    sceneId: observation.observation.sceneId,
                    validPixelCount:
                        observation.statistics.validPixelCount,
                    noDataPixelCount:
                        observation.statistics.noDataPixelCount,
                    pixelWindow: commonFootprint.windows[index]
                }))
            },
            metadata: {
                calibrationStatus: "not_calibrated",
                temporalComparisonScope: comparisonScope,
                pixelWiseChangeCalculated: Boolean(pixelWiseChangeProduct),
                pixelWiseChangeStatus: pixelWiseChangeProduct
                    ? pixelWiseChangeProduct.cacheStatus
                    : "not_applicable"
            }
        });

        const interpretation =
            processCropConditionInterpretation(evidence);

        return res.status(200).json({
            success: true,
            interpretation,
            cropConditionProducts: {
                temporalChange: pixelWiseChangeProduct
            }
        });
    } catch (error) {
        console.error(
            "Crop condition temporal interpretation error:",
            error
        );

        const spatialConflictCodes = [
            "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT",
            "NO_COMMON_TEMPORAL_FOOTPRINT"
        ];

        const status = spatialConflictCodes.includes(error.code)
            ? 409
            : 500;

        return res.status(status).json({
            success: false,
            code: error.code ||
                "CROP_CONDITION_TEMPORAL_INTERPRETATION_ERROR",
            message: error.message ||
                "Unable to interpret temporal crop-condition evidence."
        });
    }
}

module.exports = {
    postCropConditionTemporalInterpretation
};