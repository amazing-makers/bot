/**
 * Phase 32 — Admin 이메일 발송 헬퍼.
 * marketingbot 의 sendEmail 과 동일한 Resend API 사용 (RESEND_API_KEY 환경변수).
 *
 * 브로드캐스트는 Resend 의 batch API 미사용 — 단순 sequential 발송 (분당 ~120건 한도 회피).
 */

interface SendInput {
    to: string;
    subject: string;
    html: string;
    fromName?: string;
}

const FROM_DEFAULT = 'Amakers <noreply@amakers.co.kr>';

export async function sendBroadcastEmail(input: SendInput): Promise<{ ok: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        // 개발 환경 — 콘솔에 출력만
        console.log('[email-dev] would send:', input.subject, '→', input.to);
        return { ok: true };
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: input.fromName ? `${input.fromName} <noreply@amakers.co.kr>` : FROM_DEFAULT,
                to: input.to,
                subject: input.subject,
                html: input.html,
            }),
        });
        if (!res.ok) {
            const t = await res.text();
            return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
        }
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'send failed' };
    }
}

/**
 * 마크다운 비슷한 단순 변환 — **bold**, *italic*, [text](url), 두 줄 줄바꿈 → <p>.
 * 풍부한 이메일은 React Email 템플릿 권장 — 이 함수는 broadcast 의 단순 본문용.
 */
export function simpleMarkdownToHtml(md: string): string {
    let html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#7c3aed">$1</a>');

    const paragraphs = html.split(/\n\n+/).map(p => `<p style="margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, '<br/>')}</p>`).join('');
    return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#212529">${paragraphs}<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/><p style="font-size:12px;color:#9ca3af;text-align:center">주식회사 어메이커스 · help@amakers.co.kr</p></body></html>`;
}
