"use strict";

const {
    VECTOR_LAYERS
} = require("../config/vectorLayers");

function getVectorLayerConfiguration(req, res) {
    return res.json({
        success: true,
        layers: VECTOR_LAYERS
    });
}

module.exports = {
    getVectorLayerConfiguration
};
