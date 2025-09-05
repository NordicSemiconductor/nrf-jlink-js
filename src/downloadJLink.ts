/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import os from 'os';
import path from 'path';
import { saveToFile } from './fs';
import { JLinkVariant, JLinkIndex } from './jlinkIndex';
import { download } from './net';
import { OnUpdate } from './update';

const getDownloadJLinkUrl = (jlinkUrls: JLinkVariant) => {
    const platform = os.platform();
    const arch = os.arch();

    // @ts-expect-error It is quite literally checked right before
    if (!(platform in jlinkUrls) || !(arch in jlinkUrls[platform])) {
        throw new Error(`JLink not available for ${platform}/${arch}`);
    }
    // @ts-expect-error We know it exists but it is also handled if undefined
    const url = jlinkUrls[platform]?.[arch];

    if (!url) {
        throw new Error(`JLink not available for ${platform}/${arch}`);
    }
    return url;
};

export const downloadJLink = async (
    { jlinkUrls }: JLinkIndex,
    onUpdate?: OnUpdate,
    destinationDir: string = os.tmpdir(),
    destinationFileName?: string
): Promise<string> => {
    const url = getDownloadJLinkUrl(jlinkUrls);
    const jlink = await download(url, onUpdate);

    return saveToFile(
        path.join(destinationDir, destinationFileName || path.basename(url)),
        jlink
    );
};
