import { spawn, execSync, execFile, ChildProcess, exec } from 'child_process';
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import semver from 'semver';
import { existsSync } from 'fs';

import { fetchIndex, saveToFile, JLinkIndex } from './common';

function winRegQuery(key: string): string {
    if (process.platform !== 'win32') {
        throw new Error('Unsupported platform');
    }

    let reg = path.resolve(
        process.env.SystemRoot ?? 'C:\\Windows',
        'System32',
        'reg.exe'
    );
    if (!existsSync(reg)) {
        reg = 'reg.exe';
    }

    return execSync(`${reg} query ${key}`).toString().trim();
}

const getJLinkExePath = (): string => {
    switch (os.platform()) {
        case 'win32':
            let jlinkDir = winRegQuery(
                'HKEY_CURRENT_USER\\Software\\SEGGER\\J-Link /v InstallPath'
            );
            if (!jlinkDir) {
                jlinkDir = winRegQuery(
                    'HKEY_LOCAL_MACHINE\\Software\\SEGGER\\J-Link /v InstallPath'
                );
            }
            if (!jlinkDir) {
                throw new Error('JLink not installed');
            }
            return path.resolve(jlinkDir, 'JLink.exe');
        case 'linux':
        case 'darwin':
            return 'JLinkExe';
        default:
            throw new Error('Invalid platform');
    }
};

function killProcess(
    childProcess?: ChildProcess | number,
    signal?: number | NodeJS.Signals | undefined
): void {
    const pid =
        typeof childProcess === 'number' ? childProcess : childProcess?.pid;
    if (!pid) {
        return;
    }
    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', `${pid}`, '/f', '/t']);
    } else {
        process.kill(pid, signal);
    }
}

const getInstalledJLinkVersion = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        const jlinkExeCmd = spawn(getJLinkExePath(), ['-NoGUI', '1', '-USB', '0'], {
            shell: true,
        });
        let output = '';
        const timeout = setTimeout(() => {
            killProcess(jlinkExeCmd.pid);
            reject(
                new Error(
                    `Timeout while waiting for J-Link version. Output: ${output}`
                )
            );
        }, 5000);

        const versionRegExp = /^SEGGER J-Link Commander V([0-9a-z.]+) .*$/m;
        jlinkExeCmd.stdout.on('data', (data: string) => {
            output += data.toString();
            const match = output.match(versionRegExp);
            if (match?.[1]) {
                clearTimeout(timeout);
                killProcess(jlinkExeCmd.pid);
                resolve(match[1]);
            }
        });
    });
};

export interface Update {
    step: 'install' | 'download';
    percentage: number;
}

const downloadJLink = async (
    { jlinkUrls }: JLinkIndex,
    onUpdate?: (update: Update) => void,
    destinationDir: string = os.tmpdir(),
    destinationFileName?: string
): Promise<string> => {
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
    const response = await fetch(url, {
        headers: {
            Range: 'bytes=0-',
        },
    });

    if (!response.ok) {
        throw new Error(
            `Unable to download ${url}. Got status code ${status}.`
        );
    }

    const hasContentLength = response.headers.has('content-length');
    let contentLength = hasContentLength
        ? Number(response.headers.get('content-length'))
        : 1;

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    while (reader) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
        receivedLength += value.length;

        onUpdate?.({
            step: 'download',
            percentage: hasContentLength
                ? Number(((receivedLength / contentLength) * 100).toFixed(2))
                : 0,
        });
    }
    let chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    chunks.forEach(chunk => {
        chunksAll.set(chunk, position);
        position += chunk.length;
    });

    return await saveToFile(
        path.join(destinationDir, destinationFileName || path.basename(url)),
        Buffer.from(chunksAll)
    );
};

export const installJLink = (
    installerPath: string,
    onUpdate?: (update: Update) => void
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
            command = `"${installerPath}"`;
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

export const getVersionToInstall = async (
    fallbackVersion?: string
): Promise<JLinkState> => {
    const versionToBeInstalled =
        (await fetchIndex().catch(() => undefined))?.version ?? fallbackVersion;
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
    onUpdate?: (update: Update) => void
) =>
    fetchIndex().then(v =>
        downloadJLink(v, onUpdate, destinationDir, destinationFileName)
    );

export const downloadAndInstallJLink = (onUpdate?: (update: Update) => void) =>
    fetchIndex()
        .then(v => downloadJLink(v, onUpdate))
        .then(v => installJLink(v, onUpdate));
