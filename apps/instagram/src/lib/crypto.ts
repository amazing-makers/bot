/**
 * AES-256-GCM — 인스타 Page Access Token 등 자격증명 암호화.
 *
 * key = process.env.ENCRYPTION_KEY (32 bytes = 64 글자 hex). 마케팅봇과 같은 컨벤션.
 * DB column 형식: `iv(hex):ciphertext(hex):authTag(hex)`.
 *
 * ⚠️ ENCRYPTION_KEY 를 재생성하면 기존에 암호화된 토큰을 모두 복호화할 수 없게 됨 — 운영 시 고정.
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex) {
        throw new Error('ENCRYPTION_KEY 환경변수가 없습니다 — `openssl rand -hex 32` 로 생성 후 .env 에 추가하세요');
    }
    const key = Buffer.from(hex, 'hex');
    if (key.length !== KEY_LENGTH) {
        throw new Error(`ENCRYPTION_KEY 는 ${KEY_LENGTH * 2} 글자 hex 여야 합니다 (현재: ${hex.length})`);
    }
    return key;
}

export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

export function decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('암호화 데이터 형식 오류');
    const [ivHex, ctHex, tagHex] = parts;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
}
