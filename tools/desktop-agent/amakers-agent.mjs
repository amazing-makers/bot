#!/usr/bin/env node
/**
 * Amakers 데스크톱 에이전트 — 지정한 로컬 폴더를 감시해 새 이미지를 허브에 업로드한다.
 * 업로드된 이미지는 'local' 소스 자동화가 채널에 자동 발행한다.
 *
 * 요구: Node 18 이상 (전역 fetch/FormData/Blob 사용, 추가 설치 불필요).
 * 설정: 같은 폴더의 config.json (config.example.json 참고).
 * 실행: node amakers-agent.mjs
 *
 * 동작: FOLDER 안의 jpg/png/webp 를 5초마다 확인 → 업로드 성공 시 _uploaded/ 로 이동.
 *       같은 이름의 .txt 가 있으면 그 내용을 캡션으로 사용(없으면 파일명).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = path.join(__dirname, 'config.json');

if (!fs.existsSync(CFG_PATH)) {
  console.error('config.json 이 없습니다. config.example.json 을 복사해 값을 채우세요.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
const HUB = (cfg.hubUrl || 'https://app.amakers.co.kr').replace(/\/$/, '');
const TOKEN = cfg.token;
const FOLDER = cfg.folder;
const INTERVAL = (cfg.intervalSeconds || 5) * 1000;

if (!TOKEN || !TOKEN.startsWith('dsk_')) { console.error('config.json 의 token 이 올바르지 않습니다 (dsk_ 로 시작).'); process.exit(1); }
if (!FOLDER || !fs.existsSync(FOLDER)) { console.error('config.json 의 folder 경로가 존재하지 않습니다: ' + FOLDER); process.exit(1); }

const DONE_DIR = path.join(FOLDER, '_uploaded');
if (!fs.existsSync(DONE_DIR)) fs.mkdirSync(DONE_DIR, { recursive: true });

const IMG_RE = /\.(jpe?g|png|webp)$/i;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function captionFor(file) {
  const txt = file.replace(IMG_RE, '') + '.txt';
  const p = path.join(FOLDER, txt);
  if (fs.existsSync(p)) { try { return fs.readFileSync(p, 'utf8').trim(); } catch {} }
  return path.basename(file).replace(IMG_RE, '');
}

async function uploadOne(file) {
  const full = path.join(FOLDER, file);
  const buf = fs.readFileSync(full);
  const ext = path.extname(file).toLowerCase();
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: MIME[ext] || 'application/octet-stream' }), file);
  fd.append('caption', captionFor(file));
  fd.append('filename', file);
  const res = await fetch(`${HUB}/api/agent/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

async function tick() {
  let files;
  try { files = fs.readdirSync(FOLDER).filter((f) => IMG_RE.test(f) && fs.statSync(path.join(FOLDER, f)).isFile()); }
  catch (e) { console.error('폴더 읽기 오류:', e.message); return; }
  for (const file of files) {
    try {
      const j = await uploadOne(file);
      fs.renameSync(path.join(FOLDER, file), path.join(DONE_DIR, file));
      const txt = path.join(FOLDER, file.replace(IMG_RE, '') + '.txt');
      if (fs.existsSync(txt)) { try { fs.renameSync(txt, path.join(DONE_DIR, path.basename(txt))); } catch {} }
      console.log(`✓ 업로드: ${file} (대기열 ${j.pending}개)`);
    } catch (e) {
      console.error(`✗ 실패: ${file} — ${e.message}`);
    }
  }
}

console.log(`Amakers 에이전트 시작`);
console.log(`  허브: ${HUB}`);
console.log(`  감시 폴더: ${FOLDER}`);
console.log(`  ${INTERVAL / 1000}초마다 확인. 종료: Ctrl+C\n`);
tick();
setInterval(tick, INTERVAL);
