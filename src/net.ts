/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { OnUpdate } from './update';

const handleFailedRequest = (response: Response, url: string) => {
    if (!response.ok) {
        throw new Error(
            `Unable to fetch file from ${url}. Got status code ${response.status}.`
        );
    }
};

export const download = async (url: string, onUpdate?: OnUpdate) => {
    const response = await fetch(url, {
        headers: {
            Range: 'bytes=0-',
        },
    });

    handleFailedRequest(response, url);

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

    return Buffer.from(chunksAll);
};

export const fetchJSON = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            Range: 'bytes=0-',
        },
    });

    handleFailedRequest(response, url);

    return response.json();
};
