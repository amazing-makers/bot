/**
 * Cloudflare R2 storage helper (S3-compatible).
 *
 * 마케팅봇과 같은 패턴 — 사용자 이미지 / 결과 PNG 를 R2 에 저장하고 public URL 반환.
 * R2 사용 안 할 시 (env 미설정) 호출 측에서 dataUrl 폴백.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export function isR2Configured(): boolean {
    return !!(
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET
    );
}

function getClient(): S3Client {
    if (s3Client) return s3Client;
    const endpoint = process.env.R2_ENDPOINT;
    if (!endpoint) throw new Error('R2_ENDPOINT 환경변수가 없습니다');
    s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
    return s3Client;
}

/**
 * Buffer 를 R2 에 업로드 후 public URL 반환.
 * key 는 unique 권장 (예: `mockup/{userId}/{mockupId}/{uuid}.png`).
 */
export async function uploadToR2(
    key: string,
    buffer: Buffer,
    contentType: string = 'image/png',
): Promise<string> {
    if (!isR2Configured()) {
        throw new Error('R2 가 설정되지 않았습니다 — env 변수 확인');
    }
    const bucket = process.env.R2_BUCKET!;
    const publicUrl = process.env.R2_PUBLIC_URL || '';

    const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // R2 의 'public' bucket policy 또는 Custom Domain 으로 직접 접근 (CDN URL).
    });
    await getClient().send(cmd);

    if (publicUrl) {
        return `${publicUrl.replace(/\/$/, '')}/${key}`;
    }
    // R2_PUBLIC_URL 미설정 → r2.dev 폴백 (dev/test 용도)
    const account = (process.env.R2_ENDPOINT || '').match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1];
    return account ? `https://pub-${account}.r2.dev/${bucket}/${key}` : key;
}

/**
 * URL → buffer fetch (외부 사이트 이미지 R2 에 백업하려고 다운).
 */
export async function fetchAsBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; mockupbot/1.0)',
        },
    });
    if (!res.ok) throw new Error(`이미지 fetch 실패 ${res.status}: ${url.slice(0, 80)}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}
