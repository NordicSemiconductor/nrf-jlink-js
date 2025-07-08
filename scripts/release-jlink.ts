#!/usr/bin/env ts-node

import path from 'path';
import axios from 'axios';
import os from 'os';
import fs from 'fs';

import {
    fetchIndex,
    JLinkIndex,
    JLinkVariant,
    saveToFile,
    ArchUrl,
} from '../src/common';

const SEGGER_DOWNLOAD_BASE_URL = 'https://www.segger.com/downloads/jlink';
const ARTIFACTORY_UPLOAD_BASE_URL = `https://files.nordicsemi.com/artifactory/swtools/external/ncd/jlink`;

const platformToJlinkPlatform = (variant: keyof JLinkVariant) => {
    switch (variant) {
        case 'win32':
            return 'Windows';
        case 'linux':
            return 'Linux';
        case 'darwin':
            return 'MacOSX';
        default:
            throw new Error(`Unknown variant ${variant}`);
    }
};

const doPerVariant = async (
    variants: JLinkVariant,
    action: (value: string) => Promise<string> | string | void,
): Promise<JLinkVariant> => {
    const ret = {};
    for (let platform in variants) {
        ret[platform] = {};
        for (let arch in variants[platform]) {
            const val = await action(variants[platform][arch]);
            if (val) {
                ret[platform][arch] = val;
            } else {
                ret[platform][arch] = variants[platform][arch];
            }
        }
    }
    return ret as JLinkVariant;
};

const downloadInstallers = async (
    fileNames: JLinkVariant,
): Promise<JLinkVariant> => {
    console.log('Started downloading all JLink variants.');

    const incorrectFiles: string[] = [];

    const ret = await doPerVariant(fileNames, async fileName => {
        const url = `${SEGGER_DOWNLOAD_BASE_URL}/${fileName}`;

        console.log('Started download:', url);

        const { status, data: stream } = await axios.postForm(
            url,
            { accept_license_agreement: 'accepted' },
            {
                responseType: 'stream',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
        if (status !== 200) {
            throw new Error(
                `Unable to download ${url}. Got status code ${status}.`,
            );
        }

        if (stream.statusMessage === 'OK') {
            console.log('Finished download:', url);

            return await saveToFile(stream, path.join(os.tmpdir(), fileName));
        } else {
            incorrectFiles.push(fileName);
            console.log('Failed to download (check if file exists):', url);
            return 'Incorrect';
        }
    });

    if (incorrectFiles.length > 0) {
        throw new Error(`Failed to download: ${incorrectFiles.join(', ')}`);
    }

    console.log('Finished downloading all JLink variants.');

    return ret;
};

const getStandardisedVersion = (
    rawVersion: string,
): { major: string; minor: string; patch?: string } => {
    const regex = /[vV]?(\d+)\.(\d\d)(.{0,1})/;
    const [parsedVersion, major, minor, patch] = rawVersion.match(regex) ?? [];
    if (!parsedVersion || !major || !minor) {
        throw new Error(
            `Unable to parse version ${rawVersion}. Valid formats: v12.34, v1.23a, V1.23a, 12.34, 1.23a`,
        );
    }
    return {
        major,
        minor,
        patch: patch?.toLowerCase(),
    };
};

const getFileFormat = (platform: string) => {
    switch (platform) {
        case 'win32':
            return 'exe';
        case 'darwin':
            return 'pkg';
        case 'linux':
            return 'deb';
        default:
            throw new Error(`Unknown platform ${process.platform}`);
    }
};

const getFileNames = (rawVersion: string): JLinkVariant => {
    const version = getStandardisedVersion(rawVersion);
    const platforms = ['darwin', 'linux', 'win32'] as (keyof JLinkVariant)[];
    const archs = ['arm64', 'x64'] as (keyof ArchUrl)[];

    let fileNames = {};
    for (let platform of platforms) {
        fileNames[platform] = {};
        for (let arch of archs) {
            fileNames[platform][arch] = `JLink_${platformToJlinkPlatform(
                platform,
            )}_V${version.major}${version.minor}${version.patch ?? ''}_${
                arch == 'x64' ? 'x86_64' : arch
            }.${getFileFormat(platform)}`;
        }
    }

    return fileNames as JLinkVariant;
};

const getUpdatedSourceJson = async (
    version: string,
    jlinkUrls: JLinkVariant,
): Promise<JLinkIndex> =>
    fetchIndex().then(index => ({ ...index, version, jlinkUrls }));

const uploadFile = async (url: string, data: Buffer) => {
    const res = await fetch(url, {
        method: 'PUT',
        body: data,
        headers: {
            Authorization: `Bearer ${process.env.NORDIC_ARTIFACTORY_TOKEN}`,
        },
    });

    if (!res.ok) {
        throw new Error(
            `Unable to upload to ${url}. Status code: ${
                res.status
            }. Body: ${await res.text()}`,
        );
    }
};

const upload = (version: string, files: JLinkVariant) => {
    if (!process.env.NORDIC_ARTIFACTORY_TOKEN) {
        throw new Error(
            'NORDIC_ARTIFACTORY_TOKEN environment variable not set',
        );
    }

    console.log('Started uploading all JLink variants.');

    return new Promise(async resolve => {
        // JLink installers
        const jlinkUrls = await doPerVariant(files, async filePath => {
            const fileName = path.basename(filePath);
            console.log('Started upload:', fileName);
            const targetUrl = `${ARTIFACTORY_UPLOAD_BASE_URL}/${fileName}`;
            await uploadFile(targetUrl, fs.readFileSync(filePath));
            fs.rmSync(filePath);
            console.log('Finished upload:', fileName);
            return targetUrl;
        });

        // Index
        console.log('Started uploading Index');
        const targetUrl = `${ARTIFACTORY_UPLOAD_BASE_URL}/index.json`;
        const versionObject = getStandardisedVersion(version);
        const updatedIndexJSON = await getUpdatedSourceJson(
            `v${versionObject.major}.${versionObject.minor}${
                versionObject.patch || ''
            }`,
            jlinkUrls,
        );
        await uploadFile(
            targetUrl,
            Buffer.from(JSON.stringify(updatedIndexJSON, null, 2)),
        );
        console.log('Finished uploading Index');

        return resolve(targetUrl);
    });
};

const main = (version: string) =>
    downloadInstallers(getFileNames(version)).then(files =>
        upload(version, files),
    );

const runAsScript = require.main === module;
if (runAsScript) {
    const versionIndex =
        process.argv.findIndex(arg => arg === '--version' || arg === '-v') + 1;
    const version = versionIndex > 0 ? process.argv[versionIndex] : undefined;
    if (!version) {
        console.error('No version passed with --version or -v');
        process.exit(1);
    }

    main(version);
}
