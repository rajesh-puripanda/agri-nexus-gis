"use strict";

const {
    RASTER_LAYERS
} = require("../config/rasterLayers");

function getRasterLayerConfiguration(req, res) {
    return res.json({
        success: true,
        layers: RASTER_LAYERS
    });
}

module.exports = {
    getRasterLayerConfiguration
};
