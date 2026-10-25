"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
    getTemporalProductEligibility
} = require(
    "../services/remoteSensing/catalog/" +
    "temporalProductEligibilityService"
);

async function createObservation(root, date, options = {}) {
    const directory = path.join(root, `scene-${date}`);
    await fs.mkdir(directory, { recursive: true });

    const products = [];

    for (const code of ["NDVI", "BSI"]) {
        const available = options[code] !== false;
        const filename = `${code}_index.tif`;

        if (available) {
            await fs.writeFile(
                path.join(directory, filename),
                Buffer.from("test-raster")
            );
        }

        products.push({
            indexCode: code,
            acquisitionDate: date,
            outputs: { continuous: filename },
            availability: { continuous: available }
        });
    }

    await fs.writeFile(
        path.join(directory, "production_metadata.json"),
        JSON.stringify({
            manifestType: "SENTINEL2_INDEX_PRODUCTION",
            observation: { acquisitionDate: date },
            products
        })
    );
}

async function withTempRoot(run) {
    const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-temporal-")
    );

    try {
        await run(root);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
}

test("one complete date is insufficient", async () => {
    await withTempRoot(async root => {
        await createObservation(root, "2026-09-08");

        const result = await getTemporalProductEligibility({
            productionRoots: [root]
        });

        assert.deepEqual(result.availableDates, ["2026-09-08"]);
        assert.equal(result.observationCount, 1);
        assert.ok(result.products.every(
            product => product.status === "INSUFFICIENT_OBSERVATIONS"
        ));
    });
});

test("two complete distinct dates are eligible", async () => {
    await withTempRoot(async root => {
        await createObservation(root, "2026-09-08");
        await createObservation(root, "2026-10-03");

        const result = await getTemporalProductEligibility({
            productionRoots: [root]
        });

        assert.deepEqual(
            result.availableDates,
            ["2026-09-08", "2026-10-03"]
        );
        assert.equal(result.observationCount, 2);
        assert.ok(result.products.every(
            product => product.status === "ELIGIBLE_FOR_PROCESSING"
        ));
    });
});

test("date missing BSI is excluded", async () => {
    await withTempRoot(async root => {
        await createObservation(root, "2026-09-08", { BSI: false });
        await createObservation(root, "2026-10-03");

        const result = await getTemporalProductEligibility({
            productionRoots: [root]
        });

        assert.deepEqual(result.availableDates, ["2026-10-03"]);
        assert.equal(result.observationCount, 1);
    });
});
