"use strict";

const fs = require("fs/promises");
const path = require("path");

const NO_DATA_VALUE = -9999;
const PRODUCT_CODE = "BARE_SOIL_FREQUENCY";
const OUTPUT_BASENAME = "BARE_SOIL_FREQUENCY.tif";

function ascii(value) {
    return Buffer.from(`${value}\0`, "ascii");
}

function buildGeoKeys(geoKeys, citation) {
    const entries = [];
    const strings = [];
    let asciiOffset = 0;

    const values = {
        GTModelTypeGeoKey: geoKeys.GTModelTypeGeoKey ?? 1,
        GTRasterTypeGeoKey: geoKeys.GTRasterTypeGeoKey ?? 1,
        ProjectedCSTypeGeoKey: geoKeys.ProjectedCSTypeGeoKey,
        GeographicTypeGeoKey: geoKeys.GeographicTypeGeoKey,
        GTCitationGeoKey: citation
    };

    const ids = {
        GTModelTypeGeoKey: 1024,
        GTRasterTypeGeoKey: 1025,
        GTCitationGeoKey: 1026,
        GeographicTypeGeoKey: 2048,
        ProjectedCSTypeGeoKey: 3072
    };

    for (const [name, id] of Object.entries(ids).sort((a, b) => a[1] - b[1])) {
        const value = values[name];
        if (value === undefined || value === null) continue;

        if (name.endsWith("CitationGeoKey")) {
            const bytes = ascii(value);
            entries.push([id, 34737, bytes.length, asciiOffset]);
            strings.push(bytes);
            asciiOffset += bytes.length;
        } else {
            entries.push([id, 0, 1, Number(value)]);
        }
    }

    const directory = Buffer.alloc((4 + entries.length * 4) * 2);
    const shorts = new Uint16Array(
        directory.buffer, directory.byteOffset, directory.length / 2
    );
    shorts.set([1, 1, 0, entries.length]);

    let index = 4;
    for (const entry of entries) {
        for (const value of entry) shorts[index++] = value;
    }

    return {
        directory,
        ascii: Buffer.concat(strings)
    };
}

async function writeFully(handle, buffer, position) {
    let offset = 0;
    while (offset < buffer.length) {
        const { bytesWritten } = await handle.write(
            buffer, offset, buffer.length - offset, position + offset
        );
        if (!bytesWritten) throw new Error("Unable to write TIFF data");
        offset += bytesWritten;
    }
}

function entry(tag, type, count, value) {
    return { tag, type, count, value };
}

function encodeIfd(entries, startOffset) {
    entries.sort((a, b) => a.tag - b.tag);
    const count = entries.length;
    const size = 2 + count * 12 + 4;
    let extraOffset = startOffset + size;
    const ifd = Buffer.alloc(size);
    ifd.writeUInt16LE(count, 0);

    const extras = [];
    entries.forEach((item, i) => {
        const p = 2 + i * 12;
        ifd.writeUInt16LE(item.tag, p);
        ifd.writeUInt16LE(item.type, p + 2);
        ifd.writeUInt32LE(item.count, p + 4);

        let data;
        if (item.type === 3) {
            data = Buffer.alloc(item.count * 2);
            item.value.forEach((v, j) => data.writeUInt16LE(v, j * 2));
        } else if (item.type === 4) {
            data = Buffer.alloc(item.count * 4);
            item.value.forEach((v, j) => data.writeUInt32LE(v, j * 4));
        } else if (item.type === 12) {
            data = Buffer.alloc(item.count * 8);
            item.value.forEach((v, j) => data.writeDoubleLE(v, j * 8));
        } else {
            data = Buffer.from(item.value);
        }

        if (data.length <= 4) {
            data.copy(ifd, p + 8);
        } else {
            if (extraOffset % 2) extraOffset++;
            ifd.writeUInt32LE(extraOffset, p + 8);
            extras.push({ offset: extraOffset, data });
            extraOffset += data.length;
        }
    });

    ifd.writeUInt32LE(0, 2 + count * 12);
    return {
        ifd,
        extras,
        byteLength: extraOffset - startOffset
    };
}

async function writeBareSoilFrequencyStreamingRaster({
    width, height, rows, outputPath, spatialReference, productMetadata
}) {
    if (!Number.isSafeInteger(width) || width < 1 ||
        !Number.isSafeInteger(height) || height < 1) {
        throw new Error("Valid width and height are required");
    }
    if (!rows || typeof rows[Symbol.asyncIterator] !== "function") {
        throw new Error("rows must be an async iterable of Float32Array rows");
    }
    if (!spatialReference?.origin || !spatialReference?.resolution ||
        !spatialReference?.geoKeys) {
        throw new Error("Valid spatialReference is required");
    }
    if (productMetadata?.productCode !== PRODUCT_CODE ||
        productMetadata?.units !== "percent" ||
        productMetadata?.calibrationStatus !== "provisional_uncalibrated" ||
        !Array.isArray(productMetadata.observationDates) ||
        productMetadata.observationDates.length < 2) {
        throw new Error("Valid BARE_SOIL_FREQUENCY metadata is required");
    }

    const destination = path.resolve(outputPath);
    if (path.basename(destination).toUpperCase() !== OUTPUT_BASENAME.toUpperCase()) {
        throw new Error("Output filename must be BARE_SOIL_FREQUENCY.tif");
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    const handle = await fs.open(destination, "w+");
    const stripBytes = width * 4;
    const stripOffsets = [];
    let rowNumber = 0;

    try {
        const header = Buffer.alloc(8);
        header.write("II", 0, "ascii");
        header.writeUInt16LE(42, 2);
        header.writeUInt32LE(0, 4);
        await writeFully(handle, header, 0);

        for await (const row of rows) {
            if (!(row instanceof Float32Array) || row.length !== width) {
                throw new Error(`Row ${rowNumber} must be a Float32Array of width ${width}`);
            }
            if (rowNumber >= height) throw new Error("Too many raster rows");

            const buffer = Buffer.from(
                row.buffer, row.byteOffset, row.byteLength
            );
            for (let x = 0; x < width; x++) {
                const value = row[x];
                if (value !== NO_DATA_VALUE &&
                    (!Number.isFinite(value) || value < 0 || value > 100)) {
                    throw new Error(`Invalid frequency value at row ${rowNumber}, column ${x}`);
                }
            }

            stripOffsets.push(8 + rowNumber * stripBytes);
            await writeFully(handle, buffer, 8 + rowNumber * stripBytes);
            rowNumber++;
        }

        if (rowNumber !== height) {
            throw new Error(`Expected ${height} rows, received ${rowNumber}`);
        }

        const citation = `AgriNexus GIS | ${JSON.stringify({
            analysisType: "temporal_bare_soil_frequency",
            productCode: PRODUCT_CODE,
            units: "percent",
            method: productMetadata.method,
            calibrationStatus: productMetadata.calibrationStatus,
            thresholds: productMetadata.thresholds,
            observationDates: productMetadata.observationDates,
            observationCount: productMetadata.observationDates.length,
            noDataValue: NO_DATA_VALUE
        })}`;

        const geo = buildGeoKeys(spatialReference.geoKeys, citation);
        const resolution = spatialReference.resolution;
        const origin = spatialReference.origin;
        const metadataEntries = [
            entry(256, 4, 1, [width]),
            entry(257, 4, 1, [height]),
            entry(258, 3, 1, [32]),
            entry(259, 3, 1, [1]),
            entry(262, 3, 1, [1]),
            entry(273, 4, height, stripOffsets),
            entry(277, 3, 1, [1]),
            entry(278, 4, 1, [1]),
            entry(279, 4, height, Array(height).fill(stripBytes)),
            entry(284, 3, 1, [1]),
            entry(339, 3, 1, [3]),
            entry(33550, 12, 3, [
                Math.abs(resolution[0]), Math.abs(resolution[1]), 0
            ]),
            entry(33922, 12, 6, [0, 0, 0, origin[0], origin[1], origin[2] || 0]),
            entry(34735, 3, geo.directory.length / 2,
                Array.from({ length: geo.directory.length / 2 },
                    (_, i) => geo.directory.readUInt16LE(i * 2))),
            entry(34737, 2, geo.ascii.length, geo.ascii),
            entry(42113, 2, ascii(String(NO_DATA_VALUE)).length, ascii(String(NO_DATA_VALUE))),
            entry(42113, 2, ascii(String(NO_DATA_VALUE)).length, ascii(String(NO_DATA_VALUE)))
        ];

        const ifdOffset = 8 + height * stripBytes;
        const encoded = encodeIfd(metadataEntries, ifdOffset);
        await writeFully(handle, encoded.ifd, ifdOffset);
        for (const extra of encoded.extras) {
            await writeFully(handle, extra.data, extra.offset);
        }

        const patch = Buffer.alloc(4);
        patch.writeUInt32LE(ifdOffset, 0);
        await writeFully(handle, patch, 4);
        await handle.sync();

        return {
            outputPath: destination,
            productCode: PRODUCT_CODE,
            format: "GeoTIFF",
            dataType: "Float32",
            noData: NO_DATA_VALUE,
            width,
            height,
            pixelCount: width * height,
            byteLength: (await handle.stat()).size
        };
    } catch (error) {
        await handle.close();
        await fs.rm(destination, { force: true });
        throw error;
    } finally {
        try { await handle.close(); } catch {}
    }
}

module.exports = { writeBareSoilFrequencyStreamingRaster };
