import { spawn, execSync, execFile } from "child_process";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import semver from 'semver';
import axios from "axios";

import { fetchIndex, saveToFile, JLinkIndex } from "./common";

const getJLinkExePath = () => {
    switch (os.platform()) {
        case "win32":
            const path = execSync( "reg query HKEY_CURRENT_USER\\Software\\SEGGER\\J-Link /v InstallPath").toString();
            const pathAlternative = execSync( "reg query HKEY_LOCAL_MACHINE\\Software\\SEGGER\\J-Link /v InstallPath").toString();
            if (!path && !pathAlternative) {
                throw new Error('JLink not installed');
            } else if ((path && typeof path !== 'string') || (pathAlternative && typeof pathAlternative !== 'string')) {
                throw new Error('Unable to read JLink install path');
            }
            return (path || pathAlternative) as string;
        case "linux":
            case "darwin":
            return 'JLinkExe';
        default:
            throw new Error("Invalid platform");
    }
}

const getInstalledJLinkVersion = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        const jlinkExeCmd = spawn(getJLinkExePath(), ["-NoGUI", "1"], { shell: true });

        jlinkExeCmd.stdout.on("data", (data: string) => {
            const output = data.toString();
            const versionRegExp = /DLL version (V\d+\.\d+\w*),.*/;
            const versionMatch = output.match(versionRegExp);
            if (versionMatch?.[1]) {
                jlinkExeCmd.kill(9);
                resolve(versionMatch[1])
            } else if (data.toString().includes("Connecting to")) {
                jlinkExeCmd.kill(9);
                return;
            }
        });

        jlinkExeCmd.stderr.on("data", () => {
            reject('Failed to read Jlink Version');
        });
    });
}

interface Update {
    step: "install" | "download",
    percentage: number;
}

const downloadJLink = async ({ jlinkUrls }: JLinkIndex, onUpdate?: (update: Update) => void): Promise<string> => {
    const platform = os.platform();
    const arch = os.arch();
    // @ts-expect-error It is quite literally checked right before
    if (!(platform in jlinkUrls) || !(arch in jlinkUrls[platform])) {
        throw new Error(`JLink not available for ${platform}/${arch}`)
    }
    // @ts-expect-error We know it exists but it is also handled if undefined
    const url = jlinkUrls[platform]?.[arch]
    if (!url) {
        throw new Error(`JLink not available for ${platform}/${arch}`)
    }
    const {
        status,
        data: stream,
    } = await axios.get(
        url,
        {
            responseType: "stream",
            onDownloadProgress: ({loaded, total}) => 
            loaded && total && 
                onUpdate?.({ step: "download", percentage: Number(((loaded / total) * 100).toFixed(2))}),
        }
    );
    if (status !== 200) {
      throw new Error(
        `Unable to download ${jlinkUrls}. Got status code ${status}.`
      );
    }

    const destinationFile = path.join(os.tmpdir(), path.basename(url));
    await mkdir(path.dirname(destinationFile), { recursive: true });
    return await saveToFile(stream, destinationFile);
}


const installJLink = (installerPath: string, onUpdate?: (update: Update) => void): Promise<void> => {;
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
            throw new Error("Invalid platform")
    }

    onUpdate?.({ step: "install", percentage: 0 })

    return new Promise((resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            if (stderr) {
                reject(stderr);
            }
            if (stdout.includes("successful")) {
                onUpdate?.({ step: "install", percentage: 100 })
                return resolve();
            }
        });
    });
}

const convertToSemverVersion = (version: string) => {
    const [, majorMinor, patchLetter] =
        version.match(/V?(\d+\.\d+)(.)?/) ?? [];

    const patch = patchLetter
        ? patchLetter.charCodeAt(0) - 'a'.charCodeAt(0) + 1
        : 0;

        return `${majorMinor}.${patch}`;
}

const isValidVersion = (installedVersion: string, expectedVersion: string) => 
    semver.gte(convertToSemverVersion(installedVersion), convertToSemverVersion(expectedVersion))


interface JLinkState {
    outdated: boolean;
    installed: boolean;
    versionToBeInstalled: string
    installedVersion?: string;
}

export const getVersionToInstall = async (): Promise<JLinkState> => {
    const versionToBeInstalled = (await fetchIndex()).version;
    const installedVersion = await getInstalledJLinkVersion().catch(() => undefined);
    const installed = !!installedVersion;
    const outdated = installed ? isValidVersion(installedVersion, versionToBeInstalled) : true;
    
    return {
        outdated,
        installedVersion,
        installed,
        versionToBeInstalled,
    };
}

export const downloadAndInstallJLink = (onUpdate?: (update: Update) => void) => 
    fetchIndex()
        .then(v => downloadJLink(v, onUpdate))
        .then(v => installJLink(v, onUpdate))
