/**
 * 네이버 블로그 발행 에이전트 (Node + Playwright)
 *
 * 네이버는 공개 발행 API 가 없어, 네이버 로그인 세션으로 스마트에디터를 자동 조작해 발행한다.
 * (티스토리 에이전트와 동일한 큐 폴링 구조)
 *
 * 명령:
 *   node agent.mjs login   — 헤드풀 브라우저로 네이버 로그인(수동 1회) → session.json 저장
 *   node agent.mjs once    — 큐 1회 폴링 후 처리 (테스트용)
 *   node agent.mjs start   — 큐 지속 폴링 (운영)
 *
 * 환경(.env): BASE_URL(=https://naverblogauto.amakers.co.kr), AGENT_TOKEN
 *
 * ⚠️ 네이버 스마트에디터(SE ONE) DOM 은 매우 자주 바뀌고 iframe 중첩이 깊습니다.
 *    publishPost() 선택자는 best-effort 이며, 본인 블로그에서
 *    `npx playwright codegen "https://blog.naver.com/<블로그ID>?Redirect=Write"` 로
 *    실제 선택자를 확인해 맞춰야 합니다. (가장 까다로운 부분 — 같이 다듬어요)
 */

import 'dotenv/config';
import fs from 'node:fs';
import { chromium } from 'playwright';

const SESSION_PATH = './session.json';
const BASE_URL = (process.env.BASE_URL || 'https://naverblogauto.amakers.co.kr').replace(/\/$/, '');
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireSession() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`❌ 세션이 없습니다. 먼저 'node agent.mjs login' 으로 네이버 로그인하세요.`);
    process.exit(1);
  }
}
function requireToken() {
  if (!AGENT_TOKEN) {
    console.error('❌ AGENT_TOKEN 미설정 (.env). 네이버블로그오토 데스크톱 연결에서 발급해 넣으세요.');
    process.exit(1);
  }
}

// ─────────────── 로그인 (수동 1회) ───────────────
async function login() {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://nid.naver.com/nidlogin.login');
  console.log('\n👉 브라우저에서 네이버 계정으로 로그인하세요(2단계 인증 포함).');
  console.log('   로그인이 끝나면 이 터미널에서 Enter 를 누르세요...');
  await new Promise((resolve) => process.stdin.once('data', resolve));
  await ctx.storageState({ path: SESSION_PATH });
  console.log(`✅ 세션 저장됨: ${SESSION_PATH} (이제 'npm start' 로 발행 폴링 가능)`);
  await browser.close();
  process.exit(0);
}

// ─────────────── 큐 폴링 ───────────────
async function poll() {
  const r = await fetch(`${BASE_URL}/api/agent/poll`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
  });
  if (!r.ok) { console.error(`poll 실패 ${r.status}`); return []; }
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

// ─────────────── 발행 (스마트에디터 자동화, best-effort) ───────────────
/**
 * ⚠️ 네이버 스마트에디터는 iframe(#mainFrame) 안에 다시 에디터가 있습니다.
 *    실제 선택자는 codegen 으로 확인 필요. 아래는 시작점.
 */
async function publishPost(task) {
  const browser = await chromium.launch({ headless: false }); // 디버깅 위해 headful
  try {
    const ctx = await browser.newContext({ storageState: SESSION_PATH });
    const page = await ctx.newPage();
    const blogId = task.blogId || String(task.siteUrl || '').replace(/^https?:\/\/(blog\.naver\.com\/)?/, '').replace(/\/.*$/, '');
    if (!blogId) throw new Error('blogId 없음 (task.blogId 또는 siteUrl 필요)');

    await page.goto(`https://blog.naver.com/${blogId}?Redirect=Write`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 글쓰기 에디터는 #mainFrame iframe 내부
    const frame = page.frameLocator('#mainFrame');

    // 이전 작성글 복구 팝업 닫기(best-effort)
    await frame.getByRole('button', { name: /취소|닫기/ }).first().click({ timeout: 4000 }).catch(() => {});

    // 제목 — TODO: codegen 으로 실제 선택자 확인 (예: .se-title-text [contenteditable])
    await frame.locator('.se-title-text [contenteditable="true"], textarea[placeholder*="제목"], .se_title [contenteditable="true"]').first()
      .click({ timeout: 15000 });
    await page.keyboard.type(task.title || '');

    // 본문 — 첫 본문 컴포넌트 클릭 후 입력 (TODO: 선택자 확인)
    await frame.locator('.se-component-content [contenteditable="true"], .se-text-paragraph [contenteditable="true"]').first()
      .click({ timeout: 10000 }).catch(() => {});
    // 마크다운 제거된 평문 입력(이미지/서식은 후속)
    await page.keyboard.type((task.content || '').replace(/[#*_>`]/g, ''));

    // 발행 버튼 → 발행 설정 팝업 → 발행 (TODO: 선택자 확인)
    await frame.getByRole('button', { name: /발행/ }).first().click({ timeout: 10000 });
    await frame.getByRole('button', { name: /^발행$|확인/ }).first().click({ timeout: 10000 }).catch(() => {});

    await page.waitForTimeout(4000);
    console.log(`✅ 발행 시도 완료: ${task.title}`);
    await complete(task.postId, true, { link: `https://blog.naver.com/${blogId}` });
  } catch (e) {
    console.error(`❌ 발행 실패 (${task.title}):`, e.message);
    await complete(task.postId, false, { error: `네이버 에이전트 발행 실패: ${e.message}` });
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
  console.log(`▶ 네이버 폴링 시작 (${BASE_URL}, ${POLL_INTERVAL_MS}ms). Ctrl+C 중지.`);
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
