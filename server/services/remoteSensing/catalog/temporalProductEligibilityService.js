
"use strict";

const fs = require("fs/promises");
const path = require("path");

const SERVICE_VERSION = "1.0";

async function exists(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile() && stat.size > 0;
    } catch {
        return false;
    }
}

async function readManifest(directory) {
    try {
        const filePath = path.join(
            directory,
            "production_metadata.json"
        );

        const content = await fs.readFile(filePath, "utf8");
        const manifest = JSON.parse(content);

        if (
            manifest.manifestType !==
            "SENTINEL2_INDEX_PRODUCTION"
        ) {
            return null;
        }

        return manifest;
    } catch {
        return null;
    }
}

async function getTemporalProductEligibility({
    productionRoots
}) {
    const observations = new Map();

    for (const configuredRoot of productionRoots || []) {
        const root = path.resolve(configuredRoot);
        let entries;

        try {
            entries = await fs.readdir(root, {
                withFileTypes: true
            });
        } catch {
            continue;
        }

        const directories = [
            root,
            ...entries
                .filter(entry => entry.isDirectory())
                .map(entry => path.join(root, entry.name))
        ];

        for (const directory of directories) {
            const manifest = await readManifest(directory);
            if (!manifest) continue;

            for (const product of manifest.products || []) {
                const date = product.acquisitionDate ||
                    manifest.observation?.acquisitionDate;

                const code = String(
                    product.indexCode || ""
                ).toUpperCase();

                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
                    !["NDVI", "BSI"].includes(code)
                ) {
                    continue;
                }

                const output = product.outputs?.continuous;
                if (
                    typeof output !== "string" ||
                    path.basename(output) !== output
                ) {
                    continue;
                }

                const available =
                    product.availability?.continuous === true &&
                    await exists(path.join(directory, output));

                if (!observations.has(date)) {
                    observations.set(date, {
                        acquisitionDate: date,
                        NDVI: false,
                        BSI: false
                    });
                }

                if (available) {
                    observations.get(date)[code] = true;
                }
            }
        }
    }

    const dates = [...observations.values()]
        .filter(item => item.NDVI && item.BSI)
        .map(item => item.acquisitionDate)
        .sort();

    const sufficient = dates.length >= 2;

    return {
        serviceVersion: SERVICE_VERSION,
        observationCount: dates.length,
        availableDates: dates,
        products: [
            {
                productCode: "BARE_SOIL_FREQUENCY",
                status: sufficient
                    ? "ELIGIBLE_FOR_PROCESSING"
                    : "INSUFFICIENT_OBSERVATIONS",
                minimumObservations: 2,
                reason: sufficient
                    ? "Temporal inputs are available; grid compatibility and analysis criteria must still be validated."
                    : "At least two distinct dates with both valid NDVI and BSI rasters are required."
            },
            {
                productCode: "PERSISTENT_BARE_AREA",
                status: sufficient
                    ? "ELIGIBLE_FOR_PROCESSING"
                    : "INSUFFICIENT_OBSERVATIONS",
                minimumObservations: 2,
                reason: sufficient
                    ? "Temporal inputs are available; validated bare-soil and persistence thresholds are still required."
                    : "At least two distinct dates with both valid NDVI and BSI rasters are required."
            }
        ]
    };
}

module.exports = {
    getTemporalProductEligibility
};
