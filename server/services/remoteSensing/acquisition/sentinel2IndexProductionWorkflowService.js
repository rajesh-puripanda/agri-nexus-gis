"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");


// AgriNexus GIS
// Sentinel-2 Generic Index Production Workflow
//
// Responsibilities:
//   1. Resolve the scientific index definition and required bands.
//   2. Prepare Sentinel-2 bands at their native resolutions.
//   3. Resolve source-band positions from actual prepared outputs.
//   4. Execute the generic raster-index workflow.
//   5. Validate the calculated raster before post-processing.
//   6. Validate output declarations before writing metadata.
//
// Scientific formulas, resampling, classification and raster writing
// remain delegated to their authoritative services.

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
} = require("./sentinel2NativeResolutionPreparationWorkflowService");

const {
    processMultiSourceRasterIndex,
} = require("../raster/multiSourceRasterIndexWorkflowService");

const {
    processAndWriteRasterIndexOutputs,
} = require("../raster/rasterIndexPostProcessingService");

const {
    writeProductionMetadata,
} = require("../catalog/sentinel2IndexProductionMetadataService");

const SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION = "1.0";

function assertNonEmptyString(value, name) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty string.`);
    }
}

function assertRequest(request) {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
        throw new TypeError("request must be an object.");
    }
}

function assertOutputDirectory(outputDirectory, name) {
    assertNonEmptyString(outputDirectory, name);
}

function assertTargetResolution(targetResolution) {
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
function resolveSceneProductionDirectory(
    productionDirectory,
    sceneId
) {
    assertNonEmptyString(
        productionDirectory,
        "productionDirectory"
    );
    assertNonEmptyString(sceneId, "sceneId");

    if (!/^[A-Za-z0-9_-]+$/.test(sceneId)) {
        throw new Error(
            "Scene ID contains unsupported characters for a production directory."
        );
    }

    const root = path.resolve(productionDirectory);
    const sceneDirectory = path.resolve(root, sceneId);
    const relative = path.relative(root, sceneDirectory);

    if (
        relative === "" ||
        relative === "." ||
        relative.startsWith("..") ||
        path.isAbsolute(relative)
    ) {
        throw new Error(
            "Resolved scene production directory is outside the production root."
        );
    }

    return sceneDirectory;
}

async function publishProductionOutputs({
    outputProcessing,
    indexCode,
    analyticalOutputDirectory,
}) {
    const paths = outputProcessing &&
        outputProcessing.outputPaths;

    assertNonEmptyString(
        paths && paths.continuous,
        `${indexCode} continuous production output path`
    );
    assertNonEmptyString(
        paths && paths.classification,
        `${indexCode} classification production output path`
    );
    assertNonEmptyString(
        analyticalOutputDirectory,
        "analyticalOutputDirectory"
    );

    const fsPromises = require("node:fs/promises");
    const pathModule = require("node:path");
    const { randomUUID } = require("node:crypto");

    const outputs = [
        {
            source: pathModule.resolve(paths.continuous),
            destination: pathModule.join(
                pathModule.resolve(analyticalOutputDirectory),
                `${indexCode}_index.tif`
            ),
        },
        {
            source: pathModule.resolve(paths.classification),
            destination: pathModule.join(
                pathModule.resolve(analyticalOutputDirectory),
                `${indexCode}_classification.tif`
            ),
        },
    ];

    // Preflight every source before staging or replacing stable files.
    for (const output of outputs) {
        const stat = await fsPromises.stat(output.source);

        if (!stat.isFile()) {
            throw new Error(
                `Production output source is not a file: ${output.source}`
            );
        }
    }

    await fsPromises.mkdir(
        pathModule.resolve(analyticalOutputDirectory),
        { recursive: true }
    );

    // Stage both outputs before replacing either stable destination.
    for (const output of outputs) {
        output.temporary = `${output.destination}.tmp-${process.pid}-${randomUUID()}`;
    }

    try {
        for (const output of outputs) {
            await fsPromises.copyFile(
                output.source,
                output.temporary
            );
        }

        // These are separate renames, not a two-file transaction.
        for (const output of outputs) {
            await fsPromises.rename(
                output.temporary,
                output.destination
            );
        }
    } finally {
        await Promise.all(
            outputs.map((output) =>
                fsPromises.rm(output.temporary, { force: true })
                    .catch(() => {})
            )
        );
    }
}

function resolveRequiredSentinel2Bands(indexDefinition) {
    if (
        !indexDefinition ||
        !Array.isArray(indexDefinition.requiredBands) ||
        indexDefinition.requiredBands.length === 0
    ) {
        throw new Error("Index definition has no required bands.");
    }

    return indexDefinition.requiredBands.map((canonicalBandName) => {
        const resolved = resolveSentinel2PreparedRasterSource(
            canonicalBandName
        );

        if (
            !resolved ||
            typeof resolved.canonicalBandName !== "string" ||
            typeof resolved.sentinel2BandName !== "string" ||
            !Number.isFinite(resolved.nativeResolution)
        ) {
            throw new Error(
                `Unable to resolve Sentinel-2 source for band "${canonicalBandName}".`
            );
        }

        return resolved;
    });
}

function getUniqueSentinel2BandNames(resolvedBands) {
    return [...new Set(
        resolvedBands.map((band) => band.sentinel2BandName)
    )];
}

function buildPreparedOutputByResolution(preparation) {
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
    return resolvedBands.map((resolvedBand) => {
        const resolution = resolvedBand.nativeResolution;
        const preparedOutput = preparationOutputs[resolution];

        if (!preparedOutput || typeof preparedOutput !== "object") {
            throw new Error(
                `Prepared Sentinel-2 ${resolution}m raster is unavailable ` +
                `for canonical band "${resolvedBand.canonicalBandName}".`
            );
        }

        assertNonEmptyString(
            preparedOutput.outputPath,
            `Prepared Sentinel-2 ${resolution}m outputPath`
        );

        if (
            !Array.isArray(preparedOutput.bands) ||
            preparedOutput.bands.length === 0
        ) {
            throw new Error(
                `Prepared Sentinel-2 ${resolution}m raster has no band-order metadata.`
            );
        }

        const positions = [];

        for (
            let index = 0;
            index < preparedOutput.bands.length;
            index++
        ) {
            if (
                preparedOutput.bands[index] ===
                resolvedBand.sentinel2BandName
            ) {
                positions.push(index + 1);
            }
        }

        if (positions.length !== 1) {
            throw new Error(
                `Prepared Sentinel-2 ${resolution}m raster must contain ` +
                `exactly one "${resolvedBand.sentinel2BandName}" band; ` +
                `found ${positions.length}.`
            );
        }

        return {
            band: resolvedBand.canonicalBandName,
            inputPath: preparedOutput.outputPath,
            sourceBand: positions[0],
        };
    });
}

function validatePreparationIdentity(preparation) {
    if (!preparation || typeof preparation !== "object") {
        throw new Error("Sentinel-2 preparation returned no result.");
    }

    assertNonEmptyString(preparation.sceneId, "preparation.sceneId");
    assertNonEmptyString(
        preparation.acquisitionDate,
        "preparation.acquisitionDate"
    );

    const match = /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(
        preparation.acquisitionDate
    );

    if (!match) {
        throw new Error(
            "preparation.acquisitionDate must use YYYY-MM-DD " +
            "or an ISO 8601 timestamp."
        );
    }

    const acquisitionDate = match[1];
    const parsedCalendarDate = new Date(
        `${acquisitionDate}T00:00:00.000Z`
    );

    if (
        Number.isNaN(parsedCalendarDate.getTime()) ||
        parsedCalendarDate.toISOString().slice(0, 10) !== acquisitionDate
    ) {
        throw new Error(
            "preparation.acquisitionDate contains an invalid calendar date."
        );
    }

    if (
        preparation.acquisitionDate !== acquisitionDate &&
        !Number.isFinite(Date.parse(preparation.acquisitionDate))
    ) {
        throw new Error(
            "preparation.acquisitionDate contains an invalid timestamp."
        );
    }

    return acquisitionDate;
}

function validateCalculatedRaster({
    rasterWorkflow,
    indexCode,
    outputNoData,
}) {
    const raster = rasterWorkflow?.result?.results?.raster;

    if (!raster || typeof raster !== "object") {
        throw new Error(
            `Index workflow did not return a raster for ${indexCode}.`
        );
    }

    const { width, height, bands } = raster;

    if (
        !Number.isSafeInteger(width) ||
        width <= 0 ||
        !Number.isSafeInteger(height) ||
        height <= 0
    ) {
        throw new Error(
            `${indexCode} raster has invalid width or height.`
        );
    }

    const expectedPixelCount = width * height;

    if (!Number.isSafeInteger(expectedPixelCount)) {
        throw new Error(`${indexCode} raster dimensions exceed safe limits.`);
    }

    if (
        raster.pixelCount !== undefined &&
        raster.pixelCount !== expectedPixelCount
    ) {
        throw new Error(
            `${indexCode} raster pixelCount does not match its dimensions.`
        );
    }

    const band = bands?.[indexCode];
    const data = band?.data;

    if (
        !data ||
        typeof data.length !== "number" ||
        !Number.isSafeInteger(data.length) ||
        data.length !== expectedPixelCount
    ) {
        throw new Error(
            `${indexCode} raster data length does not match its dimensions.`
        );
    }

    let validCount = 0;
    let noDataCount = 0;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        const value = data[i];

        if (
            !Number.isFinite(value) ||
            value === outputNoData
        ) {
            noDataCount++;
            continue;
        }

        validCount++;
        min = Math.min(min, value);
        max = Math.max(max, value);
        sum += value;
    }

    if (validCount === 0) {
        throw new Error(
            `${indexCode} raster contains no valid pixels; ` +
            "post-processing and metadata publication were stopped."
        );
    }

    return {
        width,
        height,
        pixelCount: expectedPixelCount,
        validCount,
        noDataCount,
        min,
        max,
        mean: sum / validCount,
    };
}

function validateOutputProcessing(outputProcessing, indexCode) {
    if (!outputProcessing || typeof outputProcessing !== "object") {
        throw new Error(
            `${indexCode} post-processing returned no output result.`
        );
    }

    const paths = outputProcessing.outputPaths;

    if (!paths || typeof paths !== "object") {
        throw new Error(
            `${indexCode} post-processing returned no outputPaths.`
        );
    }

    assertNonEmptyString(
        paths.continuous,
        `${indexCode} continuous output path`
    );

    assertNonEmptyString(
        paths.classification,
        `${indexCode} classification output path`
    );
}

async function processSentinel2IndexProductionWorkflow({
    request,
    outputDirectory,
    analyticalOutputDirectory = outputDirectory,
    productionDirectory,
    targetResolution,
    outputNoData = -9999,
    preparationImpl = prepareSentinel2NativeResolutionRasters,
    indexWorkflowImpl = processMultiSourceRasterIndex,
    postProcessingImpl = processAndWriteRasterIndexOutputs,
    onProgress = null,
} = {}) {
    assertRequest(request);

    assertNonEmptyString(request.indexCode, "request.indexCode");
    assertOutputDirectory(outputDirectory, "outputDirectory");
    assertOutputDirectory(
        analyticalOutputDirectory,
        "analyticalOutputDirectory"
    );
    assertTargetResolution(targetResolution);

    if (!Number.isFinite(outputNoData)) {
        throw new TypeError("outputNoData must be a finite number.");
    }

    const indexCode = request.indexCode.trim().toUpperCase();
    const indexDefinition = getIndexDefinition(indexCode);

    if (!indexDefinition) {
        throw new Error(`Unknown remote sensing index: ${indexCode}`);
    }

    const resolvedBands = resolveRequiredSentinel2Bands(indexDefinition);
    const sentinel2BandNames = getUniqueSentinel2BandNames(resolvedBands);

    if (typeof preparationImpl !== "function") {
        throw new TypeError("preparationImpl must be a function.");
    }

    if (typeof indexWorkflowImpl !== "function") {
        throw new TypeError("indexWorkflowImpl must be a function.");
    }

    if (typeof postProcessingImpl !== "function") {
        throw new TypeError("postProcessingImpl must be a function.");
    }

    if (typeof onProgress === "function") {
        onProgress({
            stage: "preparing",
            percent: 10,
            message: "Preparing Sentinel-2 imagery.",
        });
    }

    const preparation = await preparationImpl({
        request,
        outputDirectory,
        bandNames: sentinel2BandNames,
        outputNoData,
    });

    const acquisitionDate = validatePreparationIdentity(preparation);



    const productionOutputDirectory =
        productionDirectory !== undefined &&
        productionDirectory !== null
            ? resolveSceneProductionDirectory(
                productionDirectory,
                preparation.sceneId
            )
            : analyticalOutputDirectory;


    const preparationOutputs = buildPreparedOutputByResolution(preparation);

    const sources = buildMultiSourceInputs({
        resolvedBands,
        preparationOutputs,
    });

    if (typeof onProgress === "function") {
        onProgress({
            stage: "processing",
            percent: 40,
            message: `Processing ${indexDefinition.name}.`,
        });
    }

    const rasterWorkflow = await indexWorkflowImpl({
        indexCode,
        sources,
        targetResolution,
        noData: outputNoData,
        parameters: request.parameters,
    });

    // Validate before handing the result to any output writer.
    const rasterStatistics = validateCalculatedRaster({
        rasterWorkflow,
        indexCode,
        outputNoData,
    });

    if (typeof onProgress === "function") {
        onProgress({
            stage: "writing",
            percent: 70,
            message: `Writing ${indexDefinition.name} raster.`,
        });
    }

    const outputProcessing = await postProcessingImpl({
        indexCode,
        indexName: indexDefinition.name,
        calculationResult: rasterWorkflow.result,
        outputDirectory: productionOutputDirectory,
    });

    validateOutputProcessing(outputProcessing, indexCode);

    if (typeof onProgress === "function") {
        onProgress({
            stage: "finalizing",
            percent: 90,
            message: `${indexDefinition.name}: Finalizing outputs and metadata.`,
        });
    }

    await writeProductionMetadata({
        workflowResult: {
            workflowVersion: SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION,
            indexCode: indexDefinition.code,
            indexName: indexDefinition.name,
            sceneId: preparation.sceneId,
            acquisitionDate,
            targetResolution,
            requiredBands: resolvedBands.map((band) => ({
                canonicalBandName: band.canonicalBandName,
                sentinel2BandName: band.sentinel2BandName,
            })),
            outputProcessing,
        },
        outputDirectory: productionOutputDirectory,
    });
    if (productionDirectory !== undefined && productionDirectory !== null) {
        await publishProductionOutputs({
            outputProcessing,
            indexCode,
            analyticalOutputDirectory,
        });
    }


    if (typeof onProgress === "function") {
        onProgress({
            stage: "complete",
            percent: 100,
            message: `${indexDefinition.name} processing complete.`,
        });
    }

    return {
        workflowVersion: SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION,
        indexCode: indexDefinition.code,
        indexName: indexDefinition.name,
        sceneId: preparation.sceneId,
        acquisitionDate,
        targetResolution,
        requiredBands: resolvedBands.map((band) => ({
            canonicalBandName: band.canonicalBandName,
            sentinel2BandName: band.sentinel2BandName,
            bandId: band.bandId,
            assetKey: band.assetKey,
            nativeResolution: band.nativeResolution,
            sourceBand: band.sourceBand,
        })),
        preparation,
        sources,
        rasterWorkflow,
        rasterStatistics,
        outputProcessing,
    };
}

module.exports = {
    SENTINEL2_INDEX_PRODUCTION_WORKFLOW_VERSION,
    processSentinel2IndexProductionWorkflow,
};
