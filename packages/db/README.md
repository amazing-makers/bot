# @amakers/db

통합 Prisma 데이터 액세스 패키지. **현재는 placeholder** — 실제 스키마는 `c:\marketingbot\prisma\schema.prisma` 가 source-of-truth.

## 현재 상태

- marketingbot이 본인의 prisma client 를 사용 중
- admin 앱은 자체 prisma schema (read-only mirror) 사용
- 같은 `DATABASE_URL` (Supabase) 을 가리킴

## 통합 계획

1. marketingbot → apps/marketing 이전 후
2. `c:\marketingbot\prisma\schema.prisma` → `packages/db/prisma/schema.prisma` 로 이동
3. apps/marketing 과 apps/admin 모두 `@amakers/db` 의존
4. Reseller, ReferralCode, ReferralCommission, Bot, BotUsage 모델은 통합 후에도 그대로 살아남음

## 신규 모델 (다-1에서 marketingbot 스키마에 추가)

```prisma
model Reseller {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  name            String
  contactEmail    String
  taxStatus       String   @default("INDIVIDUAL")  // INDIVIDUAL | BUSINESS
  businessNumber  String?
  bankAccount     String?
  commissionRate  Float    @default(0.10)         // 10% 기본
  status          String   @default("ACTIVE")     // ACTIVE | SUSPENDED
  createdAt       DateTime @default(now())
  referralCodes   ReferralCode[]
  commissions     ReferralCommission[]
}

model ReferralCode {
  id          String     @id @default(cuid())
  code        String     @unique  // ex: "DESIGN-KIM-A1B2"
  resellerId  String
  reseller    Reseller   @relation(fields: [resellerId], references: [id])
  description String?
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  referrals   User[]     @relation("ReferredByCode")
}

model ReferralCommission {
  id              String   @id @default(cuid())
  resellerId      String
  reseller        Reseller @relation(fields: [resellerId], references: [id])
  referredUserId  String
  periodYearMonth String   // "2026-05"
  baseRevenue     Decimal  @db.Decimal(12, 2)  // 해당 사용자 결제액
  commissionRate  Float
  amount          Decimal  @db.Decimal(12, 2)  // base * rate
  status          String   @default("PENDING") // PENDING | PAID | CANCELLED
  paidAt          DateTime?
  createdAt       DateTime @default(now())

  @@unique([resellerId, referredUserId, periodYearMonth])
  @@index([resellerId, status])
}
```

User 모델 확장:
```prisma
model User {
  // ... 기존 필드 ...
  referredByCodeId  String?
  referredByCode    ReferralCode?  @relation("ReferredByCode", fields: [referredByCodeId], references: [id])
  reseller          Reseller?
}
```
