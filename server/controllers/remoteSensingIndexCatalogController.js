"use strict";

const {
    INDEX_REGISTRY_VERSION,
    getAllIndexDefinitions
} = require(
    "../scientific/remoteSensing/indices/indexRegistry"
);

function getRemoteSensingIndexCatalog(req, res) {
    return res.json({
        success: true,
        registryVersion:
            INDEX_REGISTRY_VERSION,
        count:
            getAllIndexDefinitions().length,
        indices:
            getAllIndexDefinitions()
    });
}

module.exports = {
    getRemoteSensingIndexCatalog
};
