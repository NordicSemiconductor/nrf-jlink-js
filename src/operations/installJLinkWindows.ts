/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { EOL } from 'os';
import { execFile } from 'child_process';
import { getJLinkState } from './getJLinkState';
import { promisify } from 'util';

interface Process {
    name: string;
    pid: number;
}

export const installJLinkWindows = async (cmd: string, args: string[]) => {
    const installedJLink = await getInstalledJLinkVersion();
    const processesBefore = await findJLinkProcesses();

    // InitialInstaller
    execFile(cmd, args);
    const initialInstallerProcess = await poll(() => findProcess(/JLink_Windows_V\d+[a-z]?_/, processesBefore), 10000)
    if (!initialInstallerProcess) {
        throw new Error('JLink installer process not found after executing it.');
    }
    await poll(async () => !(await isProcessStillRunning(initialInstallerProcess)))



    // Elevated installer
    const res = await poll(async () => {
        const process = await findProcess(/JLink_Windows.exe/, processesBefore);
        if (process) return process;
        // If process is not found but JLink version is updated, it likely is due to single user installation
        if (await isJLinkVersionUpdated(installedJLink)) return true;
    }, 10000)
    if (!res) {
        throw new Error('Elevated JLink installer process not found after executing it.');
    } else if (typeof res === 'boolean' && !!res) {
        // JLink version updated without elevated installer, likely due to user already having admin privileges
        return;
    }
    await waitForProcessToFinish(res);

    // Check if JLink version is updated after installation
    const currentInstalledJLink = await getInstalledJLinkVersion();
    if (!currentInstalledJLink && currentInstalledJLink === installedJLink) {
        throw new Error('JLink installation failed, version not updated after installer finished.');
    }
}

const getInstalledJLinkVersion = (): Promise<string | undefined> => getJLinkState({ checkOnline: false }).then(state => state.status === 'up to date' ? state.installedVersion : undefined);

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForProcessToFinish = async (installerProcess: Process): Promise<void> => {
    let installerProcessRunning = true;
    let interval = 500;
    while (installerProcessRunning) {
        await wait(interval);
        const processes = await findJLinkProcesses();
        installerProcessRunning = processes.some(p => p.pid === installerProcess.pid);
    }
}

const findProcess = async (processRegex: RegExp, knownProcesses: Process[]): Promise<Process | undefined> => {
    const otherProcesses = await findJLinkProcesses();
    return otherProcesses.filter(p => !knownProcesses.some(kb => kb.pid === p.pid)).find(p => processRegex.test(p.name));
}

const isProcessStillRunning = async (process: Process): Promise<boolean> => {
    const processes = await findJLinkProcesses();
    return !!processes.some(p => p.pid === process.pid);
}

const isJLinkVersionUpdated = async (previousVersion: string | undefined): Promise<boolean> => {
    const currentInstalledJLink = await getInstalledJLinkVersion();
    return !!(currentInstalledJLink && currentInstalledJLink !== previousVersion);
}

const poll = async <T>(condition: () => Promise<T>, timeout?: number, checkInterval = 500): Promise<T | undefined> => {
    const start = Date.now();
    while (true) {
        const result = await condition();
        if (!!result) {
            return result;
        }
        await wait(checkInterval);
        if (timeout && Date.now() - start >= timeout) {
            break;
        }
    }
}

const findJLinkProcesses = async (): Promise<Process[]> => {
    const { stdout } = await promisify(execFile)('tasklist', [ '/NH', '/FI', 'IMAGENAME eq JLink*', ]);
    if (stdout.startsWith('INFO: No tasks are running')) {
        return [];
    }
    return stdout
        .split(EOL)
        .filter(Boolean)
        .map(line => {
            const parts = line.trim().split(/\s+/).slice(0, 2); // [processName, pid]
            if (parts.length !== 2 && !parts[0] && !isNaN(Number(parts[1]))) {
                throw new Error(`Unexpected tasklist output: ${line}`);
            }
            return { name: parts[0], pid: Number(parts[1]) } as Process;
        });
}
