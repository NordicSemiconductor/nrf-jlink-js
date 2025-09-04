/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const saveToFile = async (
    destinationFile: string,
    data: string | NodeJS.ArrayBufferView
): Promise<string> => {
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
