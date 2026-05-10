/**
 * Replicate 의 다양한 응답 형식을 통일된 buffer 로 변환.
 *
 * Replicate SDK 응답 형식 (모델·SDK 버전에 따라):
 *   1) string                        — public URL (대부분의 모델)
 *   2) string[]                      — multiple URLs (예: 여러 이미지 generated)
 *   3) ReadableStream                — newer FileOutput format (버전 0.30+)
 *   4) { url(): string, blob(): Blob, [Symbol.asyncIterator] }  — FileOutput class
 *
 * 이 헬퍼는 모든 형식을 처리하고 buffer 또는 URL string 반환.
 */

import { fetchAsBuffer } from '../storage/r2';

/**
 * Replicate 응답 → buffer.
 * URL 이면 fetch, stream/FileOutput 이면 직접 read.
 */
export async function replicateOutputToBuffer(output: any): Promise<Buffer> {
    // 1) FileOutput class — blob() method 우선 (CDN fetch 한 번 절약 — Replicate 가 이미 갖고 있는 데이터)
    if (output && typeof output.blob === 'function') {
        const blob = await output.blob();
        const ab = await blob.arrayBuffer();
        return Buffer.from(ab);
    }

    // 2) string URL
    if (typeof output === 'string') {
        return fetchAsBuffer(output);
    }

    // 3) string[] (첫 번째)
    if (Array.isArray(output) && typeof output[0] === 'string') {
        return fetchAsBuffer(output[0]);
    }

    // 4) FileOutput class — url() fallback (CDN 한 번 더 fetch)
    if (output && typeof output.url === 'function') {
        try {
            const url = output.url();
            return fetchAsBuffer(typeof url === 'string' ? url : url.toString());
        } catch {
            // url() fail 하면 stream 으로 시도
        }
    }

    // 5) ReadableStream / async iterable
    if (output && typeof output[Symbol.asyncIterator] === 'function') {
        const chunks: Buffer[] = [];
        for await (const chunk of output) {
            if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
            else if (Buffer.isBuffer(chunk)) chunks.push(chunk);
            else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, 'binary'));
        }
        if (chunks.length > 0) return Buffer.concat(chunks);
    }

    // 6) ReadableStream (Web standard, getReader)
    if (output && typeof output.getReader === 'function') {
        const reader = output.getReader();
        const chunks: Buffer[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value instanceof Uint8Array) chunks.push(Buffer.from(value));
        }
        if (chunks.length > 0) return Buffer.concat(chunks);
    }

    // 7) Array of FileOutput / streams (multi-output models)
    if (Array.isArray(output) && output.length > 0) {
        return replicateOutputToBuffer(output[0]);
    }

    throw new Error(
        'Replicate 응답 형식 미지원: ' +
        JSON.stringify({
            type: typeof output,
            isArray: Array.isArray(output),
            hasUrl: !!(output && typeof output.url === 'function'),
            hasBlob: !!(output && typeof output.blob === 'function'),
            hasIterator: !!(output && typeof output[Symbol.asyncIterator] === 'function'),
            keys: output && typeof output === 'object' ? Object.keys(output).slice(0, 10) : [],
        }).slice(0, 500),
    );
}

/**
 * Replicate 응답 → URL string (가능한 경우).
 * URL 못 추출하면 null 반환 — 호출자가 buffer 로 변환해야 함.
 */
export function replicateOutputToUrl(output: any): string | null {
    if (typeof output === 'string') return output;
    if (Array.isArray(output) && typeof output[0] === 'string') return output[0];
    if (output && typeof output.url === 'function') {
        try {
            const url = output.url();
            return typeof url === 'string' ? url : url.toString();
        } catch {
            return null;
        }
    }
    return null;
}
