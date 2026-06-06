export const metadata = { title: '서비스 이용약관 — Amakers' };
export const dynamic = 'force-dynamic';

const COMPANY = '주식회사 어메이커스(amakers)';
const BIZNO = '501-86-02053';
const CEO = '백승화';
const ADDR = '경기도 부천시 원미구 송내대로73번길 41, 지하1층(상동, 황소빌딩)';
const EMAIL = 'help@amakers.co.kr';
const UPDATED = '2026-06-06';

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
      <h1>서비스 이용약관</h1>
      <p style={{ color: '#888' }}>시행일: {UPDATED}</p>

      <h2>제1조 (목적)</h2>
      <p>본 약관은 {COMPANY}(이하 “회사”)가 제공하는 Amakers 서비스(SNS·블로그 콘텐츠 작성 및 자동 발행 도구, 이하 “서비스”)의 이용에 관한 회사와 이용자 간의 권리·의무 및 책임사항을 규정합니다.</p>

      <h2>제2조 (서비스 내용)</h2>
      <ul>
        <li>AI 기반 글·이미지 생성 및 편집</li>
        <li>이용자가 연결한 소셜/블로그 계정에 대한 콘텐츠 게시·예약·자동 발행</li>
        <li>반복 자동화(주기/정시 발행, 소스 연동 등)</li>
      </ul>

      <h2>제3조 (계정 연결 및 이용자 책임)</h2>
      <ul>
        <li>이용자는 본인이 적법한 권한을 가진 계정만 연결해야 합니다.</li>
        <li>서비스를 통해 발행되는 콘텐츠의 내용과 적법성에 대한 책임은 이용자에게 있습니다.</li>
        <li>이용자는 연결한 각 플랫폼(예: Meta/Instagram, 워드프레스, 티스토리)의 정책과 약관을 준수해야 합니다.</li>
      </ul>

      <h2>제4조 (금지행위)</h2>
      <p>스팸·불법·타인의 권리를 침해하는 콘텐츠 발행, 플랫폼 정책 위반, 서비스의 비정상적 이용을 금지합니다.</p>

      <h2>제5조 (요금)</h2>
      <p>서비스는 기본 무료로 제공되며, AI 기능은 이용자가 등록한 본인 API 키로 동작합니다. 유료 기능 도입 시 별도 고지합니다.</p>

      <h2>제6조 (책임의 제한)</h2>
      <p>회사는 천재지변, 외부 플랫폼(Meta 등)·AI 제공자의 정책·장애·사용량 한도 등 회사의 통제를 벗어난 사유로 인한 서비스 중단·발행 실패에 대해 책임을 지지 않습니다. 서비스는 “있는 그대로” 제공됩니다.</p>

      <h2>제7조 (해지)</h2>
      <p>이용자는 언제든지 연동 해제 및 계정 삭제로 이용을 종료할 수 있습니다.</p>

      <h2>제8조 (회사 정보·문의)</h2>
      <ul>
        <li>{COMPANY} (사업자등록번호 {BIZNO})</li>
        <li>대표자: {CEO}</li>
        <li>주소: {ADDR}</li>
        <li>문의: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
      </ul>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <p style={{ color: '#aaa', fontSize: 13 }}>© {COMPANY}</p>
    </main>
  );
}
