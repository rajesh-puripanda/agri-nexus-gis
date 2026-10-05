"use strict";

// ============================================================
// AgriNexus GIS
// server/services/remoteSensing/acquisition/
// sentinel2IndexProductionWorkflowService.js
// ============================================================
//
// Sentinel-2 Generic Index Production Workflow
//
// Responsibilities:
//   1. Resolve the requested scientific index definition.
//   2. Resolve required canonical spectral bands through the
//      Sentinel-2 scientific band resolver.
//   3. Prepare Sentinel-2 bands grouped by native resolution.
//   4. Build multi-source raster inputs using the authoritative
//      prepared-raster source-band positions.
//   5. Delegate explicit resolution alignment and index
//      processing to the generic multi-source workflow.
//
// Scientific authority remains in:
//   - indexRegistry
//   - Sentinel-2 band catalog
//   - Sentinel-2 spectral mapping
//   - Sentinel-2 prepared-raster source resolver
//
// This service contains orchestration only.
// It does not implement spectral formulas, band numbers,
// resampling algorithms, or raster classification.
//
// ============================================================

const {
    getIndexDefinition,
} = require(
    "../../../scientific/remoteSensing/indices/indexRegistry"
);

const {
    resolveSentinel2PreparedRasterSource,
} = require(
    "../../../scientific/remoteSensing/bands/" +
    "sentinel2PreparedRasterSourceResolver"
);

const {
    prepareSentinel2NativeResolutionRasters,
} = require(
    "./sentinel2NativeResolutionPreparationWorkflowService"
);

const {
    processMultiSourceRasterIndex,
} = require(
    "../raster/multiSourceRasterIndexWorkflowService"
);

const {
    processAndWriteRasterIndexOutputs,
} = require(
    "../raster/rasterIndexPostProcessingService"
);

const SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION =
    "1.0";

function assertNonEmptyString(
    value,
    name
) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${name} must be a non-empty string.`
        );
    }
}

function assertRequest(
    request
) {
    if (
        !request ||
        typeof request !== "object"
    ) {
        throw new TypeError(
            "request must be an object."
        );
    }
}

function assertOutputDirectory(
    outputDirectory
) {
    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );
}

function assertTargetResolution(
    targetResolution
) {
    if (
        typeof targetResolution !== "number" ||
        !Number.isFinite(targetResolution) ||
        targetResolution <= 0
    ) {
        throw new TypeError(
            "targetResolution must be a positive finite number."
        );
    }
}

function resolveRequiredSentinel2Bands(
    indexDefinition
) {
    return indexDefinition.requiredBands.map(
        (canonicalBandName) =>
            resolveSentinel2PreparedRasterSource(
                canonicalBandName
            )
    );
}

function getUniqueSentinel2BandNames(
    resolvedBands
) {
    return [
        ...new Set(
            resolvedBands.map(
                (band) =>
                    band.sentinel2BandName
            )
        ),
    ];
}

function buildPreparedOutputByResolution(
    preparation
) {
    if (
        !preparation ||
        typeof preparation !== "object" ||
        !preparation.outputs ||
        typeof preparation.outputs !== "object"
    ) {
        throw new Error(
            "Sentinel-2 preparation did not return native-resolution outputs."
        );
    }

    return preparation.outputs;
}

function buildMultiSourceInputs({
    resolvedBands,
    preparationOutputs,
}) {
    return resolvedBands.map(
        (resolvedBand) => {
            const resolution =
                resolvedBand.nativeResolution;

            const preparedOutput =
                preparationOutputs[
                    resolution
                ];

            if (
                !preparedOutput ||
                typeof preparedOutput !== "object"
            ) {
                throw new Error(
                    `Prepared Sentinel-2 ${resolution}m raster is unavailable for canonical band "${resolvedBand.canonicalBandName}".`
                );
            }

            if (
                typeof preparedOutput.outputPath !==
                "string" ||
                preparedOutput.outputPath.trim().length === 0
            ) {
                throw new Error(
                    `Prepared Sentinel-2 ${resolution}m raster has no outputPath for canonical band "${resolvedBand.canonicalBandName}".`
                );
            }

            if (
                !Array.isArray(
                    preparedOutput.bands
                ) ||
                !preparedOutput.bands.includes(
                    resolvedBand.sentinel2BandName
                )
            ) {
                throw new Error(
                    `Prepared Sentinel-2 ${resolution}m raster does not contain band "${resolvedBand.sentinel2BandName}".`
                );
            }

            const resolutionBands =
                resolvedBands.filter(
                    (band) =>
                        band.nativeResolution ===
                        resolution
                );

            const sourceBand =
                resolutionBands.indexOf(
                    resolvedBand
                ) + 1;

            return {
                band:
                    resolvedBand.canonicalBandName,

                inputPath:
                    preparedOutput.outputPath,

                sourceBand,
            };
        }
    );
}

    async function processSentinel2IndexProductionWorkflow({
        request,
        outputDirectory,
        analyticalOutputDirectory = outputDirectory,
        targetResolution,
        outputNoData = -9999,
        preparationImpl = prepareSentinel2NativeResolutionRasters,
        indexWorkflowImpl =
            processMultiSourceRasterIndex,
        postProcessingImpl =
            processAndWriteRasterIndexOutputs,
        onProgress = null,
    } = {}) {
    assertRequest(request);

    assertNonEmptyString(
        request.indexCode,
        "request.indexCode"
    );

    assertOutputDirectory(
        outputDirectory
    );

    assertTargetResolution(
        targetResolution
    );

    const indexCode =
        request.indexCode
            .trim()
            .toUpperCase();

    const indexDefinition =
        getIndexDefinition(
            indexCode
        );

    if (!indexDefinition) {
        throw new Error(
            `Unknown remote sensing index: ${indexCode}`
        );
    }

    const resolvedBands =
        resolveRequiredSentinel2Bands(
            indexDefinition
        );

    const sentinel2BandNames =
        getUniqueSentinel2BandNames(
            resolvedBands
        );

    if (typeof onProgress === "function") {
        onProgress({ stage: "preparing", message: "Preparing Sentinel-2 imagery." });
    }

    const preparation =
        await preparationImpl({
            request,
            outputDirectory,
            bandNames:
                sentinel2BandNames,
            outputNoData,
        });

    const preparationOutputs =
        buildPreparedOutputByResolution(
            preparation
        );

    const sources =
        buildMultiSourceInputs({
            resolvedBands,
            preparationOutputs,
        });

    if (typeof onProgress === "function") {
        onProgress({ stage: "processing", message: `Processing ${indexDefinition.name}.` });
    }

    const rasterWorkflow =
        await indexWorkflowImpl({
            indexCode,
            sources,
            targetResolution,
            noData: outputNoData,
            parameters:
                request.parameters,
        });

    if (typeof onProgress === "function") {
        onProgress({ stage: "writing", message: `Writing ${indexDefinition.name} raster.` });
    }

    const outputProcessing =
        await postProcessingImpl({
            indexCode:
                indexDefinition.code,

            indexName:
                indexDefinition.name,

            calculationResult:
                rasterWorkflow.result,

            outputDirectory:
                analyticalOutputDirectory,
        });

    if (typeof onProgress === "function") {
        onProgress({ stage: "complete", message: `${indexDefinition.name} processing complete.` });
    }

    return {
        workflowVersion:
            SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION,

        indexCode:
            indexDefinition.code,

        indexName:
            indexDefinition.name,

        sceneId:
            preparation.sceneId,

        acquisitionDate:
            preparation.acquisitionDate,

        targetResolution,

        requiredBands:
            resolvedBands.map(
                (band) => ({
                    canonicalBandName:
                        band.canonicalBandName,

                    sentinel2BandName:
                        band.sentinel2BandName,

                    bandId:
                        band.bandId,

                    assetKey:
                        band.assetKey,

                    nativeResolution:
                        band.nativeResolution,

                    sourceBand:
                        band.sourceBand,
                })
            ),

        preparation,

        sources,

        rasterWorkflow,

        outputProcessing,
    };
}

module.exports = {
    SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION,
    processSentinel2IndexProductionWorkflow,
};
