"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const service = require("../services/cropIntelligence/cropConditionEvidencePersistenceService");

async function createFixture(t) {
    const projectRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-crop-condition-")
    );

    t.after(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    const baseline = {
        sceneId: "SCENE_BASE",
        date: "2026-08-01",
        indexCode: "NDVI"
    };

    const comparison = {
        sceneId: "SCENE_COMPARE",
        date: "2026-09-08",
        indexCode: "NDVI"
    };

    const commonFootprint = {
        boundingBox: [699960, 1900000, 700960, 1901000],
        width: 100,
        height: 100,
        windows: [
            [10, 20, 110, 120],
            [30, 40, 130, 140]
        ]
    };

    const spatialContext = {
        origin: [700060, 1900800, 0],
        resolution: [10, -10, 0],
        projectedCrsCode: 32644,
        rasterType: 1
    };

    const identity = service.buildCropConditionEvidenceIdentity({
        indexCode: "NDVI",
        baseline,
        comparison,
        commonFootprint,
        spatialContext
    });

    const comparisonId = service.buildCropConditionComparisonId({
        indexCode: "NDVI",
        baseline,
        comparison
    });

    const paths = service.buildCropConditionEvidencePaths({
        projectRoot,
        comparisonId
    });

    const result = {
        outputPath: paths.rasterPath,
        productCode: "NDVI_TEMPORAL_CHANGE",
        format: "GeoTIFF",
        dataType: "Float32",
        noData: -9999,
        spatialReference: {
            origin: [700160, 1900600, 0],
            resolution: [10, -10, 0],
            geoKeys: {
                GTModelTypeGeoKey: 1,
                GTRasterTypeGeoKey: 1,
                ProjectedCSTypeGeoKey: 32644
            }
        },
        width: 100,
        height: 100,
        pixelCount: 10000,
        statistics: {
            totalPixelCount: 10000,
            validPixelCount: 9000,
            noDataPixelCount: 1000,
            validCoveragePercent: 90,
            noDataCoveragePercent: 10,
            min: -0.45,
            max: 0.62,
            mean: 0.08
        },
        baseline,
        comparison,
        method: "comparison_minus_baseline",
        calibrationStatus: "not_calibrated"
    };

    return {
        projectRoot,
        baseline,
        comparison,
        commonFootprint,
        spatialContext,
        identity,
        paths,
        result
    };
}

async function saveFixture(fixture) {
    await fs.mkdir(fixture.paths.outputDirectory, {
        recursive: true
    });

    await fs.writeFile(
        fixture.paths.rasterPath,
        Buffer.from("test-raster")
    );

    return service.saveCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        rasterPath: fixture.paths.rasterPath,
        identity: fixture.identity,
        result: fixture.result
    });
}

test("matching manifest and raster are reusable", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: fixture.identity
    });

    assert.equal(cached.reusable, true);
    assert.equal(cached.reason, "identity_and_raster_match");
    assert.equal(cached.evidence.statistics.validPixelCount, 9000);
    assert.equal(cached.rasterMetadata.byteLength, 11);
});

test("missing spatial-temporal contract prevents cache reuse", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const manifest = JSON.parse(
        await fs.readFile(fixture.paths.manifestPath, "utf8")
    );

    delete manifest.spatialTemporalChangeEvidence;

    await fs.writeFile(
        fixture.paths.manifestPath,
        JSON.stringify(manifest)
    );

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: fixture.identity
    });

    assert.equal(cached.reusable, false);
    assert.equal(
        cached.reason,
        "spatial_temporal_change_evidence_invalid"
    );
});

test("same-size raster replacement invalidates cached evidence", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    await fs.writeFile(fixture.paths.rasterPath, "fake-raster");

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: fixture.identity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "raster_checksum_mismatch");
});

test("changed observation identity invalidates cached evidence", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const changedIdentity = {
        ...fixture.identity,
        comparison: {
            ...fixture.identity.comparison,
            sceneId: "DIFFERENT_SCENE"
        }
    };

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: changedIdentity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "identity_mismatch");
});

test("changed common footprint invalidates cached evidence", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const changedIdentity = {
        ...fixture.identity,
        commonFootprint: {
            ...fixture.identity.commonFootprint,
            width: 99
        }
    };

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: changedIdentity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "identity_mismatch");
});

test("missing manifest prevents reuse", async t => {
    const fixture = await createFixture(t);

    await fs.mkdir(fixture.paths.outputDirectory, {
        recursive: true
    });

    await fs.writeFile(fixture.paths.rasterPath, "fake-raster");

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: fixture.identity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "manifest_missing");
});

test("missing raster prevents reuse", async t => {
    const fixture = await createFixture(t);

    await fs.mkdir(fixture.paths.outputDirectory, {
        recursive: true
    });

    await fs.writeFile(
        fixture.paths.manifestPath,
        JSON.stringify({
            schemaVersion: service.MANIFEST_SCHEMA_VERSION,
            identity: fixture.identity,
            raster: {
                fileName: service.RASTER_FILENAME,
                byteLength: 11
            },
            evidence: fixture.result
        })
    );

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: fixture.identity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "raster_missing");
});

test("changed processing version invalidates cached evidence", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const changedIdentity = {
        ...fixture.identity,
        processingVersion: "different-version"
    };

    const cached = await service.checkReusableCropConditionEvidence({
        outputDirectory: fixture.paths.outputDirectory,
        expectedIdentity: changedIdentity
    });

    assert.equal(cached.reusable, false);
    assert.equal(cached.reason, "identity_mismatch");
});

test("invalid index code is rejected", () => {
    assert.throws(
        () => service.buildCropConditionEvidenceIdentity({
            indexCode: "BSI",
            baseline: {
                sceneId: "A",
                date: "2026-08-01",
                indexCode: "BSI"
            },
            comparison: {
                sceneId: "B",
                date: "2026-09-08",
                indexCode: "BSI"
            },
            commonFootprint: {
                boundingBox: [0, 0, 100, 100],
                width: 100,
                height: 100,
                windows: [
                    [0, 0, 100, 100],
                    [0, 0, 100, 100]
                ]
            }
        }),
        /NDVI only/
    );
});

test("valid manifest and raster are published", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, true);
    assert.equal(published.comparisonId, fixture.paths.comparisonId);
    assert.equal(published.raster.fileName, "NDVI_CHANGE.tif");
    assert.equal(published.raster.width, 100);
    assert.equal(published.evidence.method, "comparison_minus_baseline");
    assert.equal(published.identity.indexCode, "NDVI");
});

test("missing spatial-temporal contract prevents publication", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const manifest = JSON.parse(
        await fs.readFile(fixture.paths.manifestPath, "utf8")
    );

    delete manifest.spatialTemporalChangeEvidence;

    await fs.writeFile(
        fixture.paths.manifestPath,
        JSON.stringify(manifest)
    );

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(
        published.reason,
        "spatial_temporal_change_evidence_invalid"
    );
});

test("invalid comparison ID is rejected", async t => {
    const fixture = await createFixture(t);

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: "../invalid"
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "invalid_comparison_id");
});

test("missing publication manifest is rejected", async t => {
    const fixture = await createFixture(t);

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "manifest_missing");
});

test("missing published raster is rejected", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    await fs.rm(fixture.paths.rasterPath);

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "raster_missing");
});

test("invalid manifest content is rejected", async t => {
    const fixture = await createFixture(t);
    await fs.mkdir(fixture.paths.outputDirectory, {
        recursive: true
    });

    await fs.writeFile(fixture.paths.manifestPath, "null");

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "manifest_invalid");
});

test("changed comparison identity is rejected", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    const manifest = JSON.parse(
        await fs.readFile(fixture.paths.manifestPath, "utf8")
    );

    manifest.identity.comparison.sceneId = "DIFFERENT_SCENE";

    await fs.writeFile(
        fixture.paths.manifestPath,
        JSON.stringify(manifest)
    );

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "comparison_identity_mismatch");
});

test("modified raster fails publication checksum verification", async t => {
    const fixture = await createFixture(t);
    await saveFixture(fixture);

    await fs.writeFile(fixture.paths.rasterPath, "fake-raster");

    const published =
        await service.findPublishedCropConditionEvidence({
            projectRoot: fixture.projectRoot,
            comparisonId: fixture.paths.comparisonId
        });

    assert.equal(published.published, false);
    assert.equal(published.reason, "raster_checksum_mismatch");
});