/**
 * region 별 SNS 발행 황금 시간대(prime-time) 추천. (마케팅봇에서 이식)
 * Intl + Date 만 사용 — 서버/클라이언트 양쪽에서 호출 가능.
 */

export type Region =
    | 'korea' | 'usa' | 'japan' | 'china' | 'europe' | 'latam'
    | 'middle_east' | 'africa' | 'india' | 'southeast_asia' | 'russia' | 'oceania';

const REGION_TIMEZONE: Record<Region, string> = {
    korea: 'Asia/Seoul',
    usa: 'America/New_York',
    japan: 'Asia/Tokyo',
    china: 'Asia/Shanghai',
    europe: 'Europe/Berlin',
    latam: 'America/Sao_Paulo',
    middle_east: 'Asia/Riyadh',
    africa: 'Africa/Johannesburg',
    india: 'Asia/Kolkata',
    southeast_asia: 'Asia/Singapore',
    russia: 'Europe/Moscow',
    oceania: 'Australia/Sydney',
};

const PRIME_HOURS: Record<Region, number[]> = {
    korea: [9, 12, 19],
    usa: [8, 12, 17, 20],
    japan: [7, 12, 19, 22],
    china: [9, 12, 20],
    europe: [9, 13, 20],
    latam: [9, 13, 21],
    middle_east: [10, 14, 21],
    africa: [9, 13, 19],
    india: [9, 13, 21],
    southeast_asia: [9, 12, 20],
    russia: [9, 13, 20],
    oceania: [9, 12, 19],
};

/** 다음 황금시간대 1개 (가장 가까운 미래). */
export function suggestPrimeTime(region: Region | string, options?: { minMinutesAhead?: number; from?: Date }): Date {
    const r = (region in REGION_TIMEZONE ? region : 'korea') as Region;
    const tz = REGION_TIMEZONE[r];
    const hours = PRIME_HOURS[r];
    const minAhead = options?.minMinutesAhead ?? 30;
    const from = options?.from ?? new Date();
    const earliest = new Date(from.getTime() + minAhead * 60 * 1000);

    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const dayBase = new Date(earliest.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const parts = fmt.formatToParts(dayBase);
        const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
        const ymd = `${get('year')}-${get('month')}-${get('day')}`;
        for (const h of hours) {
            const candidateUTC = zonedToUTC(ymd, h, 0, tz);
            if (candidateUTC.getTime() >= earliest.getTime()) return candidateUTC;
        }
    }
    return earliest;
}

/** 다음 N개의 황금시간대. */
export function suggestPrimeTimes(region: Region | string, count: number): Date[] {
    const out: Date[] = [];
    let from = new Date();
    for (let i = 0; i < count; i++) {
        const next = suggestPrimeTime(region, { from });
        out.push(next);
        from = new Date(next.getTime() + 60 * 60 * 1000);
    }
    return out;
}

export function getPrimeHourLabels(region: Region | string): string[] {
    const r = (region in REGION_TIMEZONE ? region : 'korea') as Region;
    return PRIME_HOURS[r].map(formatHourKR);
}

function zonedToUTC(ymd: string, hour: number, minute: number, tz: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    const utcGuess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(utcGuess);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || '0');
    const localizedHour = get('hour');
    const localizedDay = get('day');
    let dayDelta = 0;
    if (localizedDay !== d) dayDelta = localizedDay > d ? -1 : 1;
    const hourDelta = hour - localizedHour;
    return new Date(utcGuess.getTime() + hourDelta * 60 * 60 * 1000 + dayDelta * 24 * 60 * 60 * 1000);
}

function formatHourKR(h: number): string {
    if (h === 0) return '자정 0시';
    if (h === 12) return '낮 12시';
    if (h < 12) return `오전 ${h}시`;
    return `저녁 ${h - 12}시`;
}
