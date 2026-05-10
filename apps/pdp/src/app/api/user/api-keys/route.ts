/**
 * /api/user/api-keys
 *
 * BYOK 키 관리 — 사용자가 OpenAI/Anthropic/Replicate 키 입력/삭제/조회.
 *
 * GET     → 현재 등록된 provider list (mask 만, plaintext 절대 X)
 * POST    → { provider, key } — 등록 또는 갱신
 * DELETE  → ?provider=openai — 삭제
 *
 * 보안: 모든 endpoint 는 auth() 통과 후 본인 키만 다룰 수 있음.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
    saveUserApiKey,
    deleteUserApiKey,
    listUserApiKeys,
    ALL_PROVIDERS,
    type Provider,
} from '@/lib/api-keys';
import { validateApiKey } from '@/lib/api-key-validation';

function isValidProvider(p: any): p is Provider {
    return (ALL_PROVIDERS as string[]).includes(p);
}

export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const keys = await listUserApiKeys(userId);
    return NextResponse.json({ ok: true, keys });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    let provider: any;
    let key: any;
    try {
        const body = await req.json();
        provider = body?.provider;
        key = body?.key;
    } catch {
        return NextResponse.json({ error: 'JSON body 필요' }, { status: 400 });
    }

    if (!isValidProvider(provider)) {
        return NextResponse.json(
            { error: `provider 는 다음 중 하나여야: ${ALL_PROVIDERS.join(', ')}` },
            { status: 400 },
        );
    }
    if (typeof key !== 'string' || key.trim().length < 10) {
        return NextResponse.json({ error: 'key 가 너무 짧음 (10자 이상)' }, { status: 400 });
    }

    // 저장 전 실제 프로바이더 호출 — 잘못된 키 미리 거르기 (잘못된 키 저장 → 사용 시 fail UX 안 좋음)
    const validation = await validateApiKey(provider, key.trim());
    if (!validation.ok) {
        return NextResponse.json(
            { error: validation.error || '키 검증 실패' },
            { status: 400 },
        );
    }

    try {
        const result = await saveUserApiKey(userId, provider, key.trim());
        return NextResponse.json({
            ok: true,
            provider,
            id: result.id,
            maskedHint: result.maskedHint,
            accountInfo: validation.accountInfo,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || '저장 실패' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const provider = new URL(req.url).searchParams.get('provider');
    if (!isValidProvider(provider)) {
        return NextResponse.json(
            { error: `provider 는 다음 중 하나여야: ${ALL_PROVIDERS.join(', ')}` },
            { status: 400 },
        );
    }

    const ok = await deleteUserApiKey(userId, provider);
    return NextResponse.json({ ok, provider });
}
