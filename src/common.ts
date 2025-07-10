import axios from 'axios';
import { mkdirSync, createWriteStream } from 'fs';
import path from 'path';

export const platforms = ['darwin', 'linux', 'win32'] as const;
export const archs = ['arm64', 'x64'] as const;
export type ArchUrl = Record<(typeof archs)[number], string>;
export type JLinkVariant = Record<(typeof platforms)[number], ArchUrl>;

export interface JLinkIndex {
    version: string;
    jlinkUrls: JLinkVariant;
}

const fetchJSON = async <T>(url: string): Promise<T> => {
    const { status, data } = await axios.get(url, { responseType: 'json' });
    if (status !== 200) {
        throw new Error(
            `Unable to fetch file from ${indexUrl}. Got status code ${status}.`,
        );
    }
    return data;
};

const indexUrl =
    'https://files.nordicsemi.com/artifactory/swtools/external/ncd/jlink/index.json';
export const fetchIndex = async () => {
    const res = await fetchJSON<JLinkIndex>(indexUrl);

    if (
        res == null ||
        typeof res !== 'object' ||
        res.version === undefined ||
        res.jlinkUrls === undefined
    ) {
        throw new Error('`index.json` does not have the expected content.');
    }

    return res;
};

export const saveToFile = (
    stream: NodeJS.ReadableStream,
    destinationFile: string,
): Promise<string> => {
    mkdirSync(path.dirname(destinationFile), { recursive: true });
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destinationFile);
        stream.pipe(file);
        stream.on('error', reject);
        stream.on('end', () => {
            file.end(() => {
                return resolve(destinationFile);
            });
        });
    });
};
