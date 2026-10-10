"use strict";

const fs = require("fs");
const path = require("path");

const {
    readAcquisitionMetadata
} = require("./sentinel2AcquisitionMetadataService");

const {
    discoverSentinel2Observations
} = require("./sentinel2ObservationDiscoveryService");

const SERVICE_VERSION = "1.1";
const METADATA_SUFFIX = "_acquisition_metadata.json";

const SCENE_ID_PATTERN =
    /^(S2[ABC]_MSIL2A_\d{8}T\d{6}_N\d{4}_R\d{3}_T[A-Z0-9]+_\d{8}T\d{6})/;

const BAND_PATTERN =
    /_B([0-9A-Z]+)_/;

async function collectFiles(
    directory,
    predicate
) {
    const entries =
        await fs.promises.readdir(
            directory,
            { withFileTypes: true }
        );

    const files = [];

    for (const entry of entries) {
        const entryPath =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {
            files.push(
                ...(await collectFiles(
                    entryPath,
                    predicate
                ))
            );
            continue;
        }

        if (
            entry.isFile() &&
            predicate(entry.name)
        ) {
            files.push(entryPath);
        }
    }

    return files;
}

function formatObservationDate(value) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date
        .toISOString()
        .slice(0, 10);
}

function parseSceneId(fileName) {
    const match =
        String(fileName)
            .match(SCENE_ID_PATTERN);

    return match
        ? match[1]
        : null;
}

function parseBandName(fileName) {
    const match =
        String(fileName)
            .match(BAND_PATTERN);

    return match
        ? `B${match[1]}`
        : null;
}

function normalizeBandName(bandName) {
    const value =
        String(bandName || "")
            .trim();

    const aliases = {
        B02: "Blue",
        B03: "Green",
        B04: "Red",
        B05: "RedEdge1",
        B06: "RedEdge2",
        B07: "RedEdge3",
        B08: "NIR",
        B8A: "RedEdge4",
        B09: "WaterVapor",
        B11: "SWIR1",
        B12: "SWIR2"
    };

    return aliases[value] || value;
}

function addBand(
    scene,
    bandName
) {
    if (!bandName) {
        return;
    }

    scene.availableBands.add(
        normalizeBandName(bandName)
    );
}

function sortScenes(a, b) {
    const dateCompare =
        String(b.acquisitionDate)
            .localeCompare(
                String(a.acquisitionDate)
            );

    if (dateCompare !== 0) {
        return dateCompare;
    }

    return String(a.sceneId)
        .localeCompare(
            String(b.sceneId)
        );
}

async function discoverLocalSentinel2Observations({
    outputDirectory,
    discoveryImpl =
        discoverSentinel2Observations
}) {
    if (
        typeof outputDirectory !== "string" ||
        !outputDirectory.trim()
    ) {
        throw new Error(
            "outputDirectory must be a non-empty string."
        );
    }

    const absoluteDirectory =
        path.resolve(
            outputDirectory
        );

    let metadataFiles = [];
    let jp2Files = [];

    try {
        metadataFiles =
            await collectFiles(
                absoluteDirectory,
                fileName =>
                    fileName.endsWith(
                        METADATA_SUFFIX
                    )
            );
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    try {
        jp2Files =
            await collectFiles(
                absoluteDirectory,
                fileName =>
                    fileName.toLowerCase()
                        .endsWith(".jp2")
            );
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    const scenes =
        new Map();

    function getScene(sceneId) {
        if (!scenes.has(sceneId)) {
            scenes.set(
                sceneId,
                {
                    sceneId,
                    acquisitionDate: null,
                    observationDate: null,
                    sourceProvider:
                        "local-cache",
                    spatialCoverage: null,
                    availableBands:
                        new Set()
                }
            );
        }

        return scenes.get(sceneId);
    }

    for (const metadataFile of metadataFiles) {
        const fileName =
            path.basename(
                metadataFile
            );

        const sceneId =
            fileName.slice(
                0,
                -METADATA_SUFFIX.length
            );

        const metadata =
            await readAcquisitionMetadata({
                outputDirectory:
                    path.dirname(
                        metadataFile
                    ),
                sceneId
            });

        if (!metadata) {
            continue;
        }

        const scene =
            getScene(
                metadata.sceneId
            );

        scene.acquisitionDate =
            metadata.acquisitionDate;

        scene.observationDate =
            formatObservationDate(
                metadata.acquisitionDate
            );

        scene.sourceProvider =
            metadata.sourceProvider;

        scene.spatialCoverage =
            Array.isArray(
                metadata.spatialCoverage
            )
                ? metadata.spatialCoverage.slice()
                : null;

        for (
            const bandName of
            Object.keys(
                metadata.bands || {}
            )
        ) {
            addBand(
                scene,
                bandName
            );
        }
    }

    for (const jp2File of jp2Files) {
        const fileName =
            path.basename(
                jp2File
            );

        const sceneId =
            parseSceneId(
                fileName
            );

        const bandName =
            parseBandName(
                fileName
            );

        if (!sceneId || !bandName) {
            continue;
        }

        const scene =
            getScene(
                sceneId
            );

        addBand(
            scene,
            bandName
        );

        if (!scene.acquisitionDate) {
            const match =
                sceneId.match(
                    /^S2[ABC]_MSIL2A_(\d{8}T\d{6})_/
                );

            if (match) {
                const raw =
                    match[1];

                const acquisitionDate =
                    `${raw.slice(0, 4)}-` +
                    `${raw.slice(4, 6)}-` +
                    `${raw.slice(6, 8)}T` +
                    `${raw.slice(9, 11)}:` +
                    `${raw.slice(11, 13)}:` +
                    `${raw.slice(13, 15)}Z`;

                scene.acquisitionDate =
                    acquisitionDate;

                scene.observationDate =
                    formatObservationDate(
                        acquisitionDate
                    );
            }
        }
    }

    const scenesMissingSpatialCoverage =
        Array.from(
            scenes.values()
        )
            .filter(scene =>
                !Array.isArray(
                    scene.spatialCoverage
                ) &&
                scene.sceneId
            );

    if (
        scenesMissingSpatialCoverage.length > 0
    ) {
        const dates =
            scenesMissingSpatialCoverage
                .map(scene =>
                    formatObservationDate(
                        scene.acquisitionDate
                    )
                )
                .filter(Boolean)
                .sort();

        if (dates.length > 0) {
            for (
                const scene
                of scenesMissingSpatialCoverage
            ) {
                const date =
                    formatObservationDate(
                        scene.acquisitionDate
                    );

                if (!date) {
                    continue;
                }

                const catalogueResult =
                    await discoveryImpl({
                        request: {
                            temporalContext: {
                                startDate: date,
                                endDate: date
                            },
                            spatialContext: {
                                bbox: {
                                    west: -180,
                                    south: -90,
                                    east: 180,
                                    north: 90
                                }
                            },
                            acquisitionParameters: {
                                sceneId:
                                    scene.sceneId
                            }
                        },
                        limit: 1
                    });

                const observation =
                    (
                        catalogueResult?.observations ||
                        []
                    ).find(
                        item =>
                            item?.sceneId ===
                            scene.sceneId
                    );

                if (
                    Array.isArray(
                        observation?.spatialCoverage
                    ) &&
                    observation.spatialCoverage.length === 4
                ) {
                    scene.spatialCoverage =
                        observation.spatialCoverage.slice();
                }
            }
        }
    }

    const validScenes =
        Array.from(
            scenes.values()
        )
            .filter(scene =>
                scene.observationDate &&
                scene.availableBands.size > 0
            )
            .sort(sortScenes);

    const grouped =
        new Map();

    for (const scene of validScenes) {
        if (
            !grouped.has(
                scene.observationDate
            )
        ) {
            grouped.set(
                scene.observationDate,
                []
            );
        }

        grouped
            .get(scene.observationDate)
            .push({
                sceneId:
                    scene.sceneId,

                acquisitionDate:
                    scene.acquisitionDate,

                observationDate:
                    scene.observationDate,

                sourceProvider:
                    scene.sourceProvider,

                spatialCoverage:
                    Array.isArray(
                        scene.spatialCoverage
                    )
                        ? scene.spatialCoverage.slice()
                        : null,

                cloudCover:
                    null,

                availableBands:
                    Array.from(
                        scene.availableBands
                    ).sort()
            });
    }

    const observations =
        Array.from(
            grouped.entries()
        )
            .sort((a, b) =>
                b[0].localeCompare(
                    a[0]
                )
            )
            .map(
                ([observationDate, groupedScenes]) => ({
                    observationDate,
                    sceneCount:
                        groupedScenes.length,
                    scenes:
                        groupedScenes
                })
            );

    return {
        serviceVersion:
            SERVICE_VERSION,
        observations
    };
}

module.exports = {
    SERVICE_VERSION,
    discoverLocalSentinel2Observations
};
