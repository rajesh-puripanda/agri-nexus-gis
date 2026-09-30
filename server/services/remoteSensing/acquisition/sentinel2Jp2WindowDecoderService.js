"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const DEFAULT_OPENJPEG_EXECUTABLE = path.resolve(
    __dirname,
    "../../../../tools/openjpeg/2.5.4/bin/opj_decompress.exe"
);

function assertNonEmptyString(value, fieldName) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${fieldName} must be a non-empty string.`
        );
    }
}

function assertNonNegativeInteger(value, fieldName) {
    if (
        !Number.isInteger(value) ||
        value < 0
    ) {
        throw new TypeError(
            `${fieldName} must be a non-negative integer.`
        );
    }
}

function validateWindow({
    x0,
    y0,
    x1,
    y1
}) {
    assertNonNegativeInteger(x0, "x0");
    assertNonNegativeInteger(y0, "y0");
    assertNonNegativeInteger(x1, "x1");
    assertNonNegativeInteger(y1, "y1");

    if (x1 <= x0) {
        throw new RangeError(
            "x1 must be greater than x0."
        );
    }

    if (y1 <= y0) {
        throw new RangeError(
            "y1 must be greater than y0."
        );
    }
}

function buildDecodeArguments({
    inputPath,
    outputPath,
    x0,
    y0,
    x1,
    y1
}) {
    return [
        "-i",
        inputPath,
        "-o",
        outputPath,
        "-d",
        `${x0},${y0},${x1},${y1}`
    ];
}

function buildGeneratedPgxPath(outputPath) {
    const extension =
        path.extname(outputPath);

    const basePath =
        extension.length > 0
            ? outputPath.slice(
                0,
                -extension.length
            )
            : outputPath;

    return `${basePath}_0.pgx`;
}

function parsePgxHeader(buffer) {
    if (!(buffer instanceof Buffer)) {
        throw new TypeError(
            "PGX input must be a Buffer."
        );
    }

    const headerEnd =
        buffer.indexOf(0x0A);

    if (headerEnd < 0) {
        throw new Error(
            "PGX header is missing a newline terminator."
        );
    }

    const header =
        buffer
            .subarray(0, headerEnd)
            .toString("ascii")
            .trim();

    const match =
        /^PG\s+(ML|LM)\s+([+-])\s+(\d+)\s+(\d+)\s+(\d+)$/
            .exec(header);

    if (!match) {
        throw new Error(
            `Invalid PGX header: ${header}`
        );
    }

    const byteOrder = match[1];
    const sign = match[2];

    const bitsPerSample =
        Number.parseInt(match[3], 10);

    const width =
        Number.parseInt(match[4], 10);

    const height =
        Number.parseInt(match[5], 10);

    if (
        !Number.isInteger(bitsPerSample) ||
        bitsPerSample <= 0
    ) {
        throw new Error(
            "PGX bitsPerSample must be positive."
        );
    }

    if (
        !Number.isInteger(width) ||
        width <= 0
    ) {
        throw new Error(
            "PGX width must be positive."
        );
    }

    if (
        !Number.isInteger(height) ||
        height <= 0
    ) {
        throw new Error(
            "PGX height must be positive."
        );
    }

    return {
        header,
        byteOrder,
        sign,
        bitsPerSample,
        width,
        height,
        headerByteLength:
            headerEnd + 1
    };
}

function decodePgxSamples(buffer) {
    const header =
        parsePgxHeader(buffer);

    if (header.byteOrder !== "ML") {
        throw new Error(
            `Unsupported PGX byte order: ${header.byteOrder}.`
        );
    }

    if (header.sign !== "+") {
        throw new Error(
            `Unsupported PGX sample sign: ${header.sign}.`
        );
    }

    if (header.bitsPerSample > 16) {
        throw new Error(
            "PGX sample depth above 16 bits is not supported."
        );
    }

    const bytesPerSample =
        header.bitsPerSample <= 8
            ? 1
            : 2;

    const pixelCount =
        header.width *
        header.height;

    const expectedDataBytes =
        pixelCount *
        bytesPerSample;

    const actualDataBytes =
        buffer.length -
        header.headerByteLength;

    if (
        actualDataBytes !==
        expectedDataBytes
    ) {
        throw new Error(
            "PGX data length does not match " +
            "the declared image dimensions."
        );
    }

    const samples =
        new Uint16Array(pixelCount);

    if (bytesPerSample === 1) {
        for (
            let index = 0;
            index < pixelCount;
            index += 1
        ) {
            samples[index] =
                buffer[
                    header.headerByteLength +
                    index
                ];
        }
    } else {
        for (
            let index = 0;
            index < pixelCount;
            index += 1
        ) {
            const offset =
                header.headerByteLength +
                index * 2;

            samples[index] =
                (
                    buffer[offset] << 8
                ) |
                buffer[offset + 1];
        }
    }

    const maxRepresentable =
        header.bitsPerSample === 16
            ? 65535
            : (2 ** header.bitsPerSample) - 1;

    for (
        let index = 0;
        index < samples.length;
        index += 1
    ) {
        if (
            samples[index] >
            maxRepresentable
        ) {
            throw new Error(
                `PGX sample ${index} exceeds ` +
                `${header.bitsPerSample}-bit range.`
            );
        }
    }

    return {
        width: header.width,
        height: header.height,
        dataType: "UINT16",
        bitsPerSample:
            header.bitsPerSample,
        samples
    };
}

async function readDecodedWindow(outputPath) {
    const buffer =
        await fs.promises.readFile(
            outputPath
        );

    return decodePgxSamples(buffer);
}

async function decodeSentinel2Jp2Window({
    inputPath,
    x0,
    y0,
    x1,
    y1,
    executablePath =
        DEFAULT_OPENJPEG_EXECUTABLE
} = {}) {
    assertNonEmptyString(
        inputPath,
        "inputPath"
    );

    assertNonEmptyString(
        executablePath,
        "executablePath"
    );

    validateWindow({
        x0,
        y0,
        x1,
        y1
    });

    await fs.promises.access(
        inputPath,
        fs.constants.R_OK
    );

    await fs.promises.access(
        executablePath,
        fs.constants.X_OK
    );

    const temporaryName =
        `sentinel2-window-${crypto.randomUUID()}.pgx`;

    const outputPath =
        path.join(
            os.tmpdir(),
            temporaryName
        );

    const generatedPgxPath = outputPath;

    const legacyPgxPath =
        buildGeneratedPgxPath(
            outputPath
        );

    try {
        const args =
            buildDecodeArguments({
                inputPath,
                outputPath,
                x0,
                y0,
                x1,
                y1
            });

        await execFileAsync(
            executablePath,
            args,
            {
                windowsHide: true,
                maxBuffer: 1024 * 1024
            }
        );

        let decoded;

        try {
            decoded =
                await readDecodedWindow(
                    generatedPgxPath
                );
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }

            decoded =
                await readDecodedWindow(
                    legacyPgxPath
                );
        }

        const expectedWidth =
            x1 - x0;

        const expectedHeight =
            y1 - y0;

        if (
            decoded.width !==
            expectedWidth
        ) {
            throw new Error(
                `Decoded PGX width ${decoded.width} ` +
                `does not match requested width ` +
                `${expectedWidth}.`
            );
        }

        if (
            decoded.height !==
            expectedHeight
        ) {
            throw new Error(
                `Decoded PGX height ${decoded.height} ` +
                `does not match requested height ` +
                `${expectedHeight}.`
            );
        }

        return {
            inputPath,
            window: {
                x0,
                y0,
                x1,
                y1,
                width: decoded.width,
                height: decoded.height
            },
            dataType: decoded.dataType,
            bitsPerSample:
                decoded.bitsPerSample,
            samples: decoded.samples
        };
    } finally {
        await Promise.all([
            fs.promises.rm(
                outputPath,
                {
                    force: true
                }
            ),
            fs.promises.rm(
                legacyPgxPath,
                {
                    force: true
                }
            )
        ]);
    }
}

module.exports = {
    DEFAULT_OPENJPEG_EXECUTABLE,
    buildDecodeArguments,
    buildGeneratedPgxPath,
    decodePgxSamples,
    decodeSentinel2Jp2Window,
    parsePgxHeader,
    readDecodedWindow,
    validateWindow
};
