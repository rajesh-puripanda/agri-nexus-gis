"use strict";

const path = require("node:path");

const {
    validateSoilVegetationSeparationRequest
} = require("../../../scientific/remoteSensing/soilVegetation/soilVegetationSeparationContract");

const {
    classifyPairedEvidence
} = require("./soilVegetationSeparationService");

const {
    writeAnalysisClassificationRaster
} = require("../raster/analysisClassificationRasterWriter");

async function processAndWriteSoilVegetationClassification({
    request,
    outputPath
}) {
    if (typeof outputPath !== "string" || outputPath.trim() === "") {
        throw new Error("outputPath must be a non-empty path");
    }

    const validation =
        validateSoilVegetationSeparationRequest(request);

    if (!validation.valid) {
        throw new Error(
            "Invalid soil/vegetation separation request: " +
            validation.errors.join("; ")
        );
    }

    const ndviRaster = request.inputs.ndvi.raster;
    const bsiRaster = request.inputs.bsi.raster;

    const classification = classifyPairedEvidence({
        ndviRaster,
        bsiRaster
    });

    const raster = {
        width: ndviRaster.width,
        height: ndviRaster.height,
        pixelCount: ndviRaster.pixelCount,
        data: classification.data,
        noData: 0,
        spatialReference: ndviRaster.spatialReference,
        metadata: {
            sourceType: "paired_ndvi_bsi_evidence"
        }
    };

    const writerResult = await writeAnalysisClassificationRaster({
        request: {
            raster,
            classification: classification.statistics,
            outputMetadata: {
                timestamp: new Date().toISOString()
            }
        },
        outputPath: path.resolve(outputPath)
    });

    return {
        ...writerResult,
        statistics: classification.statistics
    };
}

module.exports = {
    processAndWriteSoilVegetationClassification
};
