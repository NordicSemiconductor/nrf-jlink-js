#!/usr/bin/env ts-node

import path from 'path';
import os from 'os';
import fs from 'fs';

import {
    fetchIndex,
    JLinkIndex,
    JLinkVariant,
    saveToFile,
    ArchUrl,
    platforms,
    archs,
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
    const ret: Partial<JLinkVariant> = {};
    const promises: Promise<void>[] = [];
    for (let platform of platforms) {
        ret[platform] = Object.fromEntries(
            archs.map(arch => [arch, '']),
        ) as ArchUrl;
        promises.push(
            ...archs.map(
                async arch =>
                    new Promise<void>(async (resolve, reject) => {
                        const result = await action(variants[platform][arch]);
                        if (ret[platform]?.[arch] !== undefined) {
                            if (result) {
                                ret[platform][arch] = result;
                            } else {
                                ret[platform][arch] = 'Incorrect';
                            }
                            resolve();
                        }
                        reject();
                    }),
            ),
        );
    }
    await Promise.all(promises);
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

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                accept_license_agreement: 'accepted',
            }).toString(),
            redirect: 'manual',
        });

        if (!response.ok) {
            if (response.status === 302) {
                incorrectFiles.push(fileName);
                console.log('File does not exist:', url);
                return 'Not found';
            } else {
                console.log(response);
                throw new Error(
                    `Unable to download ${url}. Got status code ${response.status}.`,
                );
            }
        }

        const toPath = path.join(os.tmpdir(), fileName);
        console.log('Saving to:', toPath);

        const savedFile = await saveToFile(
            toPath,
            Buffer.from(await response.arrayBuffer()),
        );

        console.log('Finished for file:', fileName);
        return savedFile;
    });

    if (incorrectFiles.length > 0) {
        throw new Error(`Files not found: [${incorrectFiles.join(', ')}]`);
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

    let fileNames: Partial<JLinkVariant> = {};
    for (let platform of platforms) {
        fileNames[platform] = Object.fromEntries(
            archs.map(arch => [
                arch,
                `JLink_${platformToJlinkPlatform(platform)}_V${version.major}${version.minor}${version.patch ?? ''}_${
                    arch == 'x64' ? 'x86_64' : arch
                }.${getFileFormat(platform)}`,
            ]),
        ) as ArchUrl;
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
            Authorization: `Bearer ${process.env.ARTIFACTORY_TOKEN}`,
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

const ARTIFACTORY_BASE_DOWNLOAD_URL =
    'https://files.nordicsemi.com/ui/api/v1/download?isNativeBrowsing=true&repoKey=swtools&path=external/ncd/jlink';
const upload = (version: string, files: JLinkVariant) => {
    if (!process.env.ARTIFACTORY_TOKEN) {
        throw new Error('ARTIFACTORY_TOKEN environment variable not set');
    }

    console.log('Started uploading all JLink variants.');

    return new Promise(async resolve => {
        // JLink installers
        const jlinkUrls = await doPerVariant(files, async filePath => {
            const fileName = path.basename(filePath);
            console.log('Started upload:', fileName);
            await uploadFile(
                `${ARTIFACTORY_UPLOAD_BASE_URL}/${fileName}`,
                fs.readFileSync(filePath),
            );
            fs.rmSync(filePath);
            console.log('Finished upload:', fileName);
            return `${ARTIFACTORY_BASE_DOWNLOAD_URL}/${fileName}`;
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

const main = async (version: string) => {
    await downloadInstallers(getFileNames(version)).then(files =>
        upload(version, files),
    );
};

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
