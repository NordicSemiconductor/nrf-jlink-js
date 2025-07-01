import axios from 'axios';
import fs from 'fs';

export interface ArchUrl {
    arm64: string;
    x64: string;
}

export interface JLinkVariant {
    linux: ArchUrl;
    darwin: ArchUrl;
    win32: ArchUrl;
}

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
): Promise<string> =>
    new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destinationFile);
        stream.pipe(file);
        stream.on('error', reject);
        stream.on('end', () => {
            file.end(() => {
                return resolve(destinationFile);
            });
        });
    });
