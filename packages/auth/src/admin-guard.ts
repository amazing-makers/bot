/**
 * 슈퍼관리자 권한 체크.
 *
 * 환경변수 ADMIN_EMAILS 에 콤마 구분 화이트리스트를 둠 (예: "help@amakers.co.kr,admin@amakers.co.kr").
 * 추후 RBAC 테이블로 확장 가능.
 */

export function isAdminEmail(email: string | null | undefined, role?: string | null): boolean {
    // DB role 우선 — User.role === 'ADMIN' 이면 즉시 통과 (env var 불필요)
    if (role === 'ADMIN') return true;

    // env var 화이트리스트 (백업/긴급 접근용)
    if (!email) return false;
    const list = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    return list.includes(email.toLowerCase());
}

/**
 * Server Component / Server Action 에서 슈퍼관리자 권한이 없으면 throw.
 * 호출 측에서 try/catch 하거나 redirect 처리.
 */
export function requireAdmin(email: string | null | undefined, role?: string | null): void {
    if (!isAdminEmail(email, role)) {
        throw new Error('FORBIDDEN: 슈퍼관리자 권한이 필요합니다.');
    }
}
