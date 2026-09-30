"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const fs = require("fs");

const {
    downloadAsset
} = require(
    "../services/remoteSensing/acquisition/copernicusAssetDownloadService"
);

const ASSET = {
    alternate: {
        https: {
            href: "https://example.com/test.jp2"
        }
    }
};

test("asset download requires an HTTPS asset URL", async () => {
    await assert.rejects(
        () =>
            downloadAsset({
                asset: {},
                outputPath: "test.jp2",
                accessToken: "TEST"
            }),
        /does not contain an HTTPS download URL/
    );
});

test("asset download requires an access token", async () => {
    await assert.rejects(
        () =>
            downloadAsset({
                asset: ASSET,
                outputPath: "test.jp2"
            }),
        /CDSE access token is required/
    );
});

test("successful asset download writes the response", async () => {
    const outputPath = path.join(
        os.tmpdir(),
        `agrinexus-test-${Date.now()}.jp2`
    );

    const fetchImpl = async (url, options) => {
        assert.equal(
            url,
            ASSET.alternate.https.href
        );

        assert.equal(
            options.headers.Authorization,
            "Bearer TEST_TOKEN"
        );

        const stream =
            new ReadableStream({
                start(controller) {
                    controller.enqueue(
                        new TextEncoder().encode(
                            "TEST_DATA"
                        )
                    );

                    controller.close();
                }
            });

        return {
            ok: true,
            body: stream
        };
    };

    try {
        const result =
            await downloadAsset({
                asset: ASSET,
                outputPath,
                accessToken: "TEST_TOKEN",
                fetchImpl
            });

        assert.equal(
            result.outputPath,
            outputPath
        );

        assert.equal(
            await fs.promises.readFile(
                outputPath,
                "utf8"
            ),
            "TEST_DATA"
        );
    } finally {
        await fs.promises.rm(
            outputPath,
            { force: true }
        );
    }
});

test("download failure is reported", async () => {
    const fetchImpl = async () => ({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
    });

    await assert.rejects(
        () =>
            downloadAsset({
                asset: ASSET,
                outputPath: "test.jp2",
                accessToken: "TEST_TOKEN",
                fetchImpl
            }),
        (error) => {
            assert.equal(
                error.code,
                "CDSE_ASSET_DOWNLOAD_FAILED"
            );

            assert.equal(
                error.status,
                401
            );

            return true;
        }
    );
});