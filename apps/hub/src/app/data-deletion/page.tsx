export const metadata = { title: '데이터 삭제 안내 — Amakers' };
export const dynamic = 'force-dynamic';

const COMPANY = '주식회사 어메이커스(amakers)';
const EMAIL = 'help@amakers.co.kr';

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
      <h1>사용자 데이터 삭제 안내</h1>
      <p>Amakers는 이용자가 언제든지 자신의 데이터를 삭제할 수 있도록 지원합니다. 아래 방법으로 연동 해제 및 데이터 삭제를 요청할 수 있습니다.</p>

      <h2>방법 1 — 서비스 내에서 직접 삭제</h2>
      <ol>
        <li><a href="https://app.amakers.co.kr">app.amakers.co.kr</a> 에 로그인</li>
        <li>도구 → 인스타오토 → 계정 화면에서 연결된 계정의 <b>해제</b> 클릭 → 해당 계정 토큰·정보가 즉시 삭제됩니다.</li>
        <li>계정 전체 삭제를 원하시면 아래 이메일로 요청해 주세요.</li>
      </ol>

      <h2>방법 2 — 이메일 요청</h2>
      <p><a href={`mailto:${EMAIL}`}>{EMAIL}</a> 로 가입 이메일과 함께 “데이터 삭제 요청”을 보내주시면, 접수 후 영업일 기준 7일 이내에 계정 및 연동 데이터(토큰·콘텐츠·키 포함)를 완전히 삭제하고 회신드립니다.</p>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <p style={{ color: '#aaa', fontSize: 13 }}>© {COMPANY} · 문의 {EMAIL}</p>
    </main>
  );
}
