/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

export const saveToFile = (
    destinationFile: string,
    data: string | NodeJS.ArrayBufferView
) => {
    try {
        mkdirSync(path.dirname(destinationFile), { recursive: true });
        writeFileSync(destinationFile, data);
    } catch (e) {
        throw new Error(
            `Unable to write file to ${destinationFile}. Error: ${e}`
        );
    }

    return destinationFile;
};

export const createTemporaryScriptFile = (content: string) => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'jlink-'));

    const filePath = path.join(tmpDir, 'script');

    writeFileSync(filePath, content);

    return {
        filePath,
        [Symbol.dispose]: () => {
            rmSync(tmpDir, { recursive: true, force: true });
        },
    };
};
