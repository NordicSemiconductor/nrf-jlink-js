/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import os from 'os';
import path from 'path';
import { saveToFile } from '../shared/fs';
import getInstallerFileName from '../shared/installerFileName';
import { JLinkVariant, JLinkIndex } from './fetchIndex';
import { ARTIFACTORY_BASE_DOWNLOAD_URL, download } from '../shared/net';
import { OnUpdate } from '../shared/update';

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

const downloadJLinkFromUrl = async (
    url: string,
    destinationDir = os.tmpdir(),
    destinationFileName?: string,
    onUpdate?: OnUpdate,
) => {
    const jlink = await download(url, onUpdate);

    return saveToFile(
        path.join(destinationDir, destinationFileName || path.basename(url)),
        jlink,
    );
};

export const downloadJLinkByVersion = (
    version: string,
    destinationDir: string,
) =>
    downloadJLinkFromUrl(
        `${ARTIFACTORY_BASE_DOWNLOAD_URL}/${getInstallerFileName(version)}`,
        destinationDir,
    );

export const downloadCurrentJLink = (
    { jlinkUrls }: JLinkIndex,
    onUpdate?: OnUpdate,
    destinationDir?: string,
    destinationFileName?: string
) =>
    downloadJLinkFromUrl(
        getDownloadJLinkUrl(jlinkUrls),
        destinationDir,
        destinationFileName,
        onUpdate,
    );
