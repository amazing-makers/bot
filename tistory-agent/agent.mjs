/**
 * 티스토리오토 발행 에이전트 (Node + Playwright)
 *
 * 티스토리는 공개 발행 API 가 없어, 카카오 로그인 세션으로 글쓰기 에디터를 자동 조작해 발행한다.
 *
 * 명령:
 *   node agent.mjs login   — 헤드풀 브라우저로 카카오 로그인(수동 1회) → session.json 저장
 *   node agent.mjs once    — 큐 1회 폴링 후 처리 (테스트용)
 *   node agent.mjs start   — 큐 지속 폴링 (운영)
 *
 * 환경(.env): BASE_URL, AGENT_TOKEN ( /dashboard/agent 에서 발급 )
 *
 * ⚠️ 티스토리 에디터 DOM 선택자는 사이트 변경에 민감합니다. publishPost() 의 선택자는
 *    best-effort 이며, 본인 블로그에서 `npx playwright codegen https://<블로그>/manage/newpost/`
 *    로 실제 선택자를 확인해 맞춰야 합니다.
 */

import 'dotenv/config';
import fs from 'node:fs';
import { chromium } from 'playwright';

const SESSION_PATH = './session.json';
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3700').replace(/\/$/, '');
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireSession() {
    if (!fs.existsSync(SESSION_PATH)) {
        console.error(`❌ 세션이 없습니다. 먼저 'node agent.mjs login' 으로 카카오 로그인하세요.`);
        process.exit(1);
    }
}
function requireToken() {
    if (!AGENT_TOKEN) {
        console.error('❌ AGENT_TOKEN 미설정 (.env). 티스토리오토 /dashboard/agent 에서 발급해 넣으세요.');
        process.exit(1);
    }
}

// ─────────────────────────── 로그인 (수동 1회) ───────────────────────────
async function login() {
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://www.tistory.com/auth/login');
    console.log('\n👉 브라우저에서 카카오 계정으로 로그인하세요.');
    console.log('   로그인이 끝나면 이 터미널에서 Enter 를 누르세요...');
    await new Promise((resolve) => process.stdin.once('data', resolve));
    await ctx.storageState({ path: SESSION_PATH });
    console.log(`✅ 세션 저장됨: ${SESSION_PATH} (이제 'npm start' 로 발행 폴링 가능)`);
    await browser.close();
    process.exit(0);
}

// ─────────────────────────── 큐 폴링 ───────────────────────────
async function poll() {
    const r = await fetch(`${BASE_URL}/api/agent/poll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
    });
    if (!r.ok) {
        console.error(`poll 실패 ${r.status}`);
        return [];
    }
    const data = await r.json().catch(() => ({}));
    return data.tasks || [];
}

async function complete(postId, ok, extra = {}) {
    await fetch(`${BASE_URL}/api/agent/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AGENT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, ok, ...extra }),
    }).catch((e) => console.error('complete 보고 실패', e.message));
}

// ─────────────────────────── 발행 (에디터 자동화) ───────────────────────────
/**
 * ⚠️ best-effort. 실제 티스토리 에디터에서 선택자 확인/수정 필요.
 *    팁: `npx playwright codegen https://<블로그>/manage/newpost/` 로 클릭하며 선택자 추출.
 */
async function publishPost(task) {
    const browser = await chromium.launch({ headless: false }); // 디버깅 위해 headful 권장
    try {
        const ctx = await browser.newContext({ storageState: SESSION_PATH });
        const page = await ctx.newPage();
        const blog = String(task.siteUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');

        await page.goto(`https://${blog}/manage/newpost/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 신규 글 작성 시 '이어서 작성하시겠습니까?' 팝업이 뜨면 '새로 작성' 처리 (best-effort)
        await page.getByRole('button', { name: /새로 작성|취소/ }).click({ timeout: 3000 }).catch(() => {});

        // 제목 — TODO: 실제 선택자 확인 (예: input.textarea_tit, [name="title"])
        await page.locator('input[id*="title"], input[name="title"], .textarea_tit, textarea[placeholder*="제목"]').first()
            .fill(task.title, { timeout: 15000 });

        // 본문 — 티스토리 에디터는 iframe/contenteditable. HTML 모드 전환 후 입력이 가장 안정적.
        // TODO: 에디터 모드 토글 + 본문 입력 선택자 확인.
        // 아래는 contenteditable 본문 영역 best-effort.
        const body = page.frameLocator('iframe#editor-tistory_ifr').locator('body').first();
        await body.click({ timeout: 10000 }).catch(() => {});
        await page.keyboard.type(task.content).catch(() => {});

        // 발행 버튼 → 공개 발행 — TODO: 실제 선택자 확인 (보통 '완료' → '공개 발행')
        await page.getByRole('button', { name: /완료|발행/ }).first().click({ timeout: 10000 });
        await page.getByRole('button', { name: /공개 발행|발행/ }).first().click({ timeout: 10000 }).catch(() => {});

        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        const link = page.url();
        console.log(`✅ 발행 시도 완료: ${task.title} → ${link}`);
        await complete(task.postId, true, { link });
    } catch (e) {
        console.error(`❌ 발행 실패 (${task.title}):`, e.message);
        await complete(task.postId, false, { error: `에이전트 발행 실패: ${e.message}` });
    } finally {
        await browser.close();
    }
}

async function processQueueOnce() {
    const tasks = await poll();
    if (tasks.length === 0) { console.log('대기 중인 글 없음'); return; }
    console.log(`📋 ${tasks.length}개 처리`);
    for (const t of tasks) await publishPost(t);
}

async function start() {
    requireToken(); requireSession();
    console.log(`▶ 폴링 시작 (${BASE_URL}, ${POLL_INTERVAL_MS}ms 간격). Ctrl+C 로 중지.`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try { await processQueueOnce(); } catch (e) { console.error('루프 오류', e.message); }
        await sleep(POLL_INTERVAL_MS);
    }
}

const cmd = process.argv[2];
if (cmd === 'login') login();
else if (cmd === 'once') { requireToken(); requireSession(); processQueueOnce().then(() => process.exit(0)); }
else if (cmd === 'start') start();
else { console.log('사용법: node agent.mjs [login|once|start]'); process.exit(1); }
