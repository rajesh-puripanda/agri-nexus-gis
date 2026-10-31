"use strict";

const {
    findAvailableProduct
} = require("../services/remoteSensing/catalog/sentinel2IndexAvailabilityService");

const {
    createPublishedIndexObservation
} = require("../services/remoteSensing/temporal/publishedIndexObservationAdapterService");

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

async function postCropConditionInterpretation(req, res) {
    try {
        const observationDate = req.body?.observationDate;
        const sceneId = req.body?.sceneId;
        const indexCode = String(req.body?.indexCode || "").trim().toUpperCase();

        if (
            typeof observationDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(observationDate) ||
            typeof sceneId !== "string" ||
            !sceneId.trim() ||
            !indexCode
        ) {
            return res.status(400).json({
                success: false,
                code: "INVALID_CROP_INTERPRETATION_REQUEST",
                message: "observationDate (YYYY-MM-DD), sceneId, and indexCode are required."
            });
        }

        const product = await findAvailableProduct({
            productionRoots: DEFAULT_PRODUCTION_ROOTS,
            acquisitionDate: observationDate,
            indexCode,
            sceneId: sceneId.trim()
        });

        if (!product?.availability?.continuous) {
            return res.status(404).json({
                success: false,
                code: "PUBLISHED_INDEX_UNAVAILABLE",
                message: "No published continuous index raster is available for this observation."
            });
        }

        const observation = await createPublishedIndexObservation({
            sceneDirectory: product.productionDirectory,
            indexCode
        });

        if (
            observation.observation.observationDate !== observationDate ||
            observation.observation.sceneId !== sceneId.trim()
        ) {
            return res.status(409).json({
                success: false,
                code: "OBSERVATION_IDENTITY_MISMATCH",
                message: "Published raster identity does not match the requested observation."
            });
        }

        const evidence = createCropConditionEvidence({
            indexObservations: [observation],
            classifications: [],
            rasterReferences: product.availability.classification
                ? [{
                    indexCode: product.indexCode,
                    sceneId: product.sceneId,
                    acquisitionDate: product.acquisitionDate,
                    productType: "index_classification",
                    fileName: product.outputs.classification,
                    targetResolution: product.targetResolution
                }]
                : [],
            temporalChanges: [],
            spatialContext: observation.spatialContext,
            processingContext: {
                source: "published_index_observation",
                indexCode,
                observationDate,
                sceneId: sceneId.trim()
            },
            metadata: {
                calibrationStatus: "not_calibrated"
            }
        });

        const interpretation = processCropConditionInterpretation(evidence);

        return res.status(200).json({
            success: true,
            interpretation
        });
    } catch (error) {
        console.error("Crop condition interpretation error:", error);

        return res.status(500).json({
            success: false,
            code: error.code || "CROP_CONDITION_INTERPRETATION_ERROR",
            message: error.message || "Unable to interpret crop-condition evidence."
        });
    }
}

module.exports = {
    postCropConditionInterpretation
};
