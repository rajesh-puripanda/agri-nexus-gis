
"use strict";

const {
    findPublishedCropConditionEvidence
} = require("../services/cropIntelligence/cropConditionEvidencePersistenceService");

async function getCropConditionTemporalChangeRaster(req, res) {
    try {
        const { comparisonId } = req.params;

        const result = await findPublishedCropConditionEvidence({
            comparisonId
        });

        if (!result.published) {
            return res.status(404).json({
                success: false,
                code: "CROP_CONDITION_RASTER_NOT_FOUND",
                message: "Published crop-condition raster was not found."
            });
        }

        res.type("image/tiff");

        return res.sendFile(result.rasterPath);
    } catch (error) {
        console.error(
            "Crop condition raster delivery error:",
            error
        );

        return res.status(500).json({
            success: false,
            code: "CROP_CONDITION_RASTER_DELIVERY_ERROR",
            message: "Unable to deliver crop-condition raster."
        });
    }
}

module.exports = {
    getCropConditionTemporalChangeRaster
};
