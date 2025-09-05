/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { exec, execFile, execSync } from 'child_process';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { promisify } from 'util';
import { fetchIndex, JLinkIndex, type JLinkVariant } from './jlinkIndex';
import { saveToFile } from './fs';
import { download } from './net';
import type { OnUpdate } from './update';

const reg = () => {
    const defaultRegLocation = path.resolve(
        process.env.SystemRoot ?? 'C:\\Windows',
        'System32',
        'reg.exe'
    );

    return existsSync(defaultRegLocation) ? defaultRegLocation : 'reg.exe';
};

const winRegQuery = (key: string): string => {
    if (process.platform !== 'win32') {
        throw new Error('Unsupported platform');
    }

    return execSync(`${reg()} query ${key}`).toString().trim();
};

const getJLinkExePath = (): string => {
    switch (os.platform()) {
        case 'win32':
            let cwd: string | undefined = winRegQuery(
                'HKEY_CURRENT_USER\\Software\\SEGGER\\J-Link /v InstallPath'
            );
            if (!cwd) {
                cwd = winRegQuery(
                    'HKEY_LOCAL_MACHINE\\Software\\SEGGER\\J-Link /v InstallPath'
                );
            }
            cwd = (/InstallPath\s+\w+\s+(.*)/.exec(cwd) ?? [])[1];
            if (!cwd) {
                throw new Error('JLink not installed');
            }
            return `"${path.join(cwd, 'JLink.exe')}"`;
        case 'linux':
        case 'darwin':
            return 'JLinkExe';
        default:
            throw new Error('Invalid platform');
    }
};

const getInstalledJLinkVersion = async (): Promise<string> => {
    const output = await promisify(exec)(
        `${getJLinkExePath()} -CommandFile foo`
    ).catch(e => e);

    const versionRegExp = /^SEGGER J-Link Commander V([0-9a-z.]+) .*$/m;
    const match = output.stdout.match(versionRegExp)?.[1];
    if (!match) {
        throw new Error("Couldn't get jlink version.");
    }
    return `v${match}`;
};

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

const downloadJLink = async (
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

export const installJLink = (
    installerPath: string,
    onUpdate?: OnUpdate
): Promise<void> => {
    let command;
    let args: string[];
    switch (os.platform()) {
        case 'darwin':
            command = 'open';
            args = ['-W', installerPath];
            break;
        case 'linux':
            command = 'pkexec';
            args = ['sh', '-c', `dpkg -i "${installerPath}"`];
            break;
        case 'win32':
            command = installerPath;
            args = ['-InstUSBDriver=1'];
            break;
        default:
            throw new Error('Invalid platform');
    }

    onUpdate?.({ step: 'install', percentage: 0 });

    return new Promise((resolve, reject) => {
        execFile(command, args, (error, _, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(stderr);
            }
            onUpdate?.({ step: 'install', percentage: 100 });
            return resolve();
        });
    });
};

const convertToSemverVersion = (version: string) => {
    const [, majorMinor, patchLetter] = version.match(/V?(\d+\.\d+)(.)?/) ?? [];

    const patch = patchLetter
        ? patchLetter.charCodeAt(0) - 'a'.charCodeAt(0) + 1
        : 0;

    return `${majorMinor}.${patch}`;
};

const isValidVersion = (installedVersion: string, expectedVersion: string) =>
    semver.gte(
        convertToSemverVersion(installedVersion),
        convertToSemverVersion(expectedVersion)
    );

interface JLinkState {
    outdated: boolean;
    installed: boolean;
    versionToBeInstalled?: string;
    installedVersion?: string;
}

export const getVersionToInstall = async ({
    fallbackVersion,
    checkOnline = true,
}: {
    fallbackVersion?: string;
    checkOnline?: boolean;
} = {}): Promise<JLinkState> => {
    const onlineRecommendedVersion = checkOnline
        ? (await fetchIndex().catch(() => undefined))?.version
        : undefined;
    const versionToBeInstalled = onlineRecommendedVersion ?? fallbackVersion;
    const installedVersion = await getInstalledJLinkVersion().catch(
        () => undefined
    );
    const installed = !!installedVersion;
    const outdated =
        !installed ||
        !versionToBeInstalled ||
        !isValidVersion(installedVersion, versionToBeInstalled);

    return {
        outdated,
        installedVersion,
        installed,
        versionToBeInstalled,
    };
};

export const downloadAndSaveJLink = (
    destinationDir: string,
    destinationFileName?: string,
    onUpdate?: OnUpdate
) =>
    fetchIndex().then(v =>
        downloadJLink(v, onUpdate, destinationDir, destinationFileName)
    );

export const downloadAndInstallJLink = (onUpdate?: OnUpdate) =>
    fetchIndex()
        .then(v => downloadJLink(v, onUpdate))
        .then(v => installJLink(v, onUpdate));
