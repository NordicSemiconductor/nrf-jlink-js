/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { fetchIndex } from './operations/fetchIndex';
import type { OnUpdate } from './shared/update';
import { downloadJLink } from './operations/downloadJLink';
import { installJLink } from './operations/installJLink';

export const downloadAndSaveJLink = async (
    destinationDir: string,
    destinationFileName?: string,
    onUpdate?: OnUpdate
) => {
    const index = await fetchIndex();
    const fileName = await downloadJLink(
        index,
        onUpdate,
        destinationDir,
        destinationFileName
    );

    return { version: index.version, fileName };
};

export const downloadAndInstallJLink = (onUpdate?: OnUpdate) =>
    fetchIndex()
        .then(index => downloadJLink(index, onUpdate))
        .then(fileName => installJLink(fileName, onUpdate));
