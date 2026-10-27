
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
    findAvailableBiophysicalProduct,
} = require(
    "../../../services/remoteSensing/catalog/sentinel2IndexAvailabilityService"
);

async function createFixture({ createRaster = true } = {}) {
    const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "lai-availability-")
    );

    const sceneId = "S2_TEST_SCENE";
    const productionDirectory = path.join(root, sceneId);
    const rasterName = "LAI_index.tif";

    await fs.mkdir(productionDirectory, { recursive: true });

    if (createRaster) {
        await fs.writeFile(
            path.join(productionDirectory, rasterName),
            Buffer.from("test raster")
        );
    }

    await fs.writeFile(
        path.join(productionDirectory, "production_metadata.json"),
        JSON.stringify({
            products: [{
                productCode: "LAI",
                productName: "Leaf Area Index",
                productType: "biophysical",
                sceneId,
                acquisitionDate: "2026-09-08",
                targetResolution: 10,
                workflowVersion: "1.0",
                outputs: {
                    continuous: rasterName,
                },
                model: {
                    calibrationStatus: "provisional_uncalibrated",
                },
            }],
        })
    );

    return { root, sceneId, productionDirectory };
}

test("finds available LAI product with an existing raster", async (t) => {
    const fixture = await createFixture();
    t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

    const result = await findAvailableBiophysicalProduct({
        productionRoot: fixture.root,
        acquisitionDate: "2026-09-08",
        productCode: "LAI",
        sceneId: fixture.sceneId,
    });

    assert.equal(result.status, "AVAILABLE");
    assert.equal(result.productCode, "LAI");
    assert.equal(result.productType, "biophysical");
    assert.equal(result.availability.continuous, true);
    assert.equal(
        result.model.calibrationStatus,
        "provisional_uncalibrated"
    );
});

test("reports LAI as incomplete when its raster is missing", async (t) => {
    const fixture = await createFixture({ createRaster: false });
    t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

    const result = await findAvailableBiophysicalProduct({
        productionRoot: fixture.root,
        acquisitionDate: "2026-09-08",
        productCode: "LAI",
    });

    assert.equal(result.status, "INCOMPLETE");
    assert.equal(result.availability.continuous, false);
});

test("returns null when the requested date does not match", async (t) => {
    const fixture = await createFixture();
    t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

    const result = await findAvailableBiophysicalProduct({
        productionRoot: fixture.root,
        acquisitionDate: "2026-09-09",
        productCode: "LAI",
    });

    assert.equal(result, null);
});

test("returns null when the requested scene does not match", async (t) => {
    const fixture = await createFixture();
    t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

    const result = await findAvailableBiophysicalProduct({
        productionRoot: fixture.root,
        acquisitionDate: "2026-09-08",
        productCode: "LAI",
        sceneId: "OTHER_SCENE",
    });

    assert.equal(result, null);
});
