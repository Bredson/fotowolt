# Fotowolt PoC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PoC aplikacji mobilnej łączącej zleceniodawcę (publikuje zlecenia instalacji PV) ze zleceniobiorcami (firmy wykonawcze zgłaszające gotowość realizacji), z zarządzaniem obszarem działania per województwo.

**Architecture:** Monorepo z dwoma pakietami: `server/` (Express + Prisma + SQLite — REST API, pełne TDD) i `mobile/` (Expo / React Native + Expo Router — dwie ścieżki UI zależne od roli). Autoryzacja PoC: logowanie samym e-mailem, tożsamość przekazywana nagłówkiem `x-user-id`. Powiadomienia systemowe = rekordy w tabeli `Notification` czytane w zakładce „Powiadomienia” (bez push); auto-odrzucenie zleceń po 3 dniach realizowane leniwym sweepem przy odczytach API.

**Tech Stack:** Node 20+, TypeScript 7, Express 5 (automatycznie przekazuje odrzucone promisy z handlerów async do error handlera — dlatego brak `try/catch` wokół wywołań Prismy nie powoduje unhandled rejection), Prisma 7 (SQLite przez driver adapter `@prisma/adapter-better-sqlite3`), Vitest + Supertest, Expo SDK 57, Expo Router, AsyncStorage.

> **Nota o toolchainie (ustalona w trakcie realizacji):** zainstalowane wersje major są nowsze niż zakładał pierwotny plan (Express 5 zamiast 4, Prisma 7 zamiast 5, TypeScript 7 zamiast 5). Konsekwencje widoczne w kodzie Tasków 1–2: `datasource` w `schema.prisma` nie zawiera już `url` (przeniesione do `server/prisma.config.ts`), `new PrismaClient()` wymaga jawnego driver adaptera, a skrypt `test` nie używa `--force-reset` (Prisma 7 blokuje destrukcyjne komendy wywołane przez agenta AI, a `resetDb()` i tak czyści tabele przed każdym testem). Prisma 7 rozwiązuje też względne ścieżki `file:` względem `process.cwd()` (czyli `server/`), stąd `file:./prisma/dev.db` i `file:./test.db`. Fragmenty kodu w Taskach 1–2 poniżej zostawiono jako historyczny zapis intencji — obowiązuje stan w repo.

## Global Constraints

- Katalog projektu: `/Users/pibe/dev/fotowolt` (wszystkie ścieżki w planie są względem niego).
- Role użytkowników: `"CLIENT"` (zleceniodawca), `"CONTRACTOR"` (zleceniobiorca) — dokładnie te stringi.
- Statusy użytkownika: `"PENDING" | "APPROVED" | "REJECTED"`; statusy zlecenia: `"OPEN" | "ASSIGNED"`; statusy gotowości (bid): `"PENDING" | "ACCEPTED" | "REJECTED"`.
- 16 województw, dokładnie te nazwy (małe litery, polskie znaki): `dolnośląskie, kujawsko-pomorskie, lubelskie, lubuskie, łódzkie, małopolskie, mazowieckie, opolskie, podkarpackie, podlaskie, pomorskie, śląskie, świętokrzyskie, warmińsko-mazurskie, wielkopolskie, zachodniopomorskie`.
- Auth PoC: brak haseł. `POST /auth/login { email }`; każdy kolejny request z nagłówkiem `x-user-id: <id>`.
- API zawsze zwraca JSON; błędy w formacie `{ "error": "<komunikat>" }`.
- Teksty UI po polsku. Kod, nazwy zmiennych i komunikaty commitów po angielsku poza opisem funkcjonalnym (dotychczasowa konwencja użytkownika: commity `feat: ...` po polsku są OK).
- Serwer: port 4000. Baza dev: `server/prisma/dev.db`, baza testowa: `server/test.db` (przez `DATABASE_URL`).
- Konto zleceniodawcy tworzone seedem: `biuro@fotowolt.pl` (zleceniodawca nie rejestruje się w aplikacji).
- SQLite nie ma typów tablicowych — listy województw przechowujemy jako string JSON w kolumnie `voivodeships`, serializacja wyłącznie przez `serializeUser`.
- Typy powiadomień: `"NEW_ORDER" | "BID_SUBMITTED" | "ORDER_DECLINED" | "ORDER_ASSIGNED"` — dokładnie te stringi.
- Auto-odrzucenie: `AUTO_DECLINE_DAYS = 3` dni od `createdAt` zlecenia. Bez crona — sweep `autoDeclineStaleOrders()` wywoływany na początku `GET /orders` i `GET /orders/:id`.
- Dopasowanie wykonawcy do zlecenia w zapytaniach SQL: `voivodeships: { contains: '"<województwo>"' }` — zawsze z cudzysłowami w środku stringa (inaczej `pomorskie` dopasuje też `kujawsko-pomorskie` i `zachodniopomorskie`).

---

## Struktura plików (docelowa)

```
fotowolt/
├── docs/superpowers/plans/2026-08-11-fotowolt-poc.md   (ten plan)
├── README.md                          (Task 18)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── db.ts                      (PrismaClient singleton)
│   │   ├── voivodeships.ts            (lista 16 województw + walidacja)
│   │   ├── serialize.ts               (serializeUser, serializeOrder)
│   │   ├── notifications.ts           (notify — tworzenie powiadomień systemowych)
│   │   ├── autoDecline.ts             (auto-odrzucanie zleceń po 3 dniach)
│   │   ├── app.ts                     (createApp — składa middleware i routery)
│   │   ├── index.ts                   (bootstrap: listen na 4000)
│   │   ├── middleware/currentUser.ts  (x-user-id → req.user + guardy ról)
│   │   └── routes/
│   │       ├── auth.ts                (login, me)
│   │       ├── contractors.ts         (rejestracja, lista, approve/reject, województwa)
│   │       ├── orders.ts              (CRUD zleceń + zgłoszenia gotowości + odrzucenia)
│   │       ├── bids.ts                (moje zgłoszenia, akceptacja przez klienta)
│   │       └── notifications.ts       (powiadomienia bieżącego użytkownika)
│   └── tests/
│       ├── helpers.ts                 (resetDb + fabryki)
│       ├── app.test.ts
│       ├── auth.test.ts
│       ├── contractors.test.ts
│       ├── orders.test.ts
│       ├── bids.test.ts
│       ├── notifications.test.ts
│       └── autoDecline.test.ts
└── mobile/
    ├── package.json                   (z create-expo-app)
    ├── app/
    │   ├── _layout.tsx                (SessionProvider + Stack)
    │   ├── index.tsx                  (logowanie e-mailem)
    │   ├── register.tsx               (rejestracja zleceniobiorcy)
    │   ├── client/
    │   │   ├── _layout.tsx            (guard roli CLIENT, Stack)
    │   │   ├── (tabs)/_layout.tsx     (taby: Zlecenia / Nowe / Wykonawcy)
    │   │   ├── (tabs)/orders.tsx
    │   │   ├── (tabs)/new-order.tsx
    │   │   ├── (tabs)/contractors.tsx
    │   │   ├── (tabs)/notifications.tsx
    │   │   ├── order/[id].tsx         (szczegóły: gotowości/odrzucenia + przycisk „Zleć”)
    │   │   └── contractor/[id].tsx    (approve/reject + województwa)
    │   └── contractor/
    │       ├── _layout.tsx            (guard roli CONTRACTOR + ekran oczekiwania)
    │       ├── (tabs)/_layout.tsx     (taby: Zlecenia / Moje zgłoszenia)
    │       ├── (tabs)/orders.tsx
    │       ├── (tabs)/my-bids.tsx
    │       ├── (tabs)/notifications.tsx
    │       └── order/[id].tsx         (szczegóły + Zgłoś gotowość / Odrzuć)
    └── src/
        ├── api.ts                     (typy + klient fetch)
        ├── session.tsx                (kontekst sesji + AsyncStorage)
        ├── voivodeships.ts            (lista + toggleVoivodeship)
        ├── voivodeships.test.ts
        ├── components/VoivodeshipPicker.tsx
        └── components/NotificationList.tsx
```

---

### Task 1: Scaffold repo + serwer Express z endpointem health

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/.gitignore`, `.gitignore`
- Test: `server/tests/app.test.ts`

**Interfaces:**
- Produces: `createApp(): express.Express` z `server/src/app.ts` — każdy kolejny task serwerowy montuje w nim swój router; `GET /health` → `200 { ok: true }`.

- [ ] **Step 1: Inicjalizacja repo i katalogu serwera**

```bash
cd /Users/pibe/dev/fotowolt
git init
mkdir -p server/src server/tests
```

Utwórz `.gitignore` w korzeniu repo:

```gitignore
node_modules/
.DS_Store
```

oraz `server/.gitignore`:

```gitignore
node_modules/
prisma/dev.db
test.db
*.db-journal
```

- [ ] **Step 2: Pliki konfiguracyjne serwera**

`server/package.json`:

```json
{
  "name": "fotowolt-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "DATABASE_URL=file:./test.db prisma db push && DATABASE_URL=file:./test.db vitest run",
    "typecheck": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

(Uwaga: w Prismie 7 `DATABASE_URL` jest względny wobec `process.cwd()`, czyli katalogu `server/` — `file:./test.db` ląduje w `server/test.db`. Skrypt `test` zadziała dopiero po Task 2, gdy powstanie schema; do tego czasu uruchamiaj `npx vitest run` bezpośrednio.)

`server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src", "tests", "prisma"]
}
```

`server/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
  },
});
```

(`fileParallelism: false` — testy współdzielą jeden plik SQLite, nie mogą biec równolegle.)

- [ ] **Step 3: Instalacja zależności**

```bash
cd /Users/pibe/dev/fotowolt/server
npm install express cors @prisma/client
npm install -D typescript tsx vitest supertest @types/express @types/cors @types/supertest @types/node prisma
```

- [ ] **Step 4: Napisz failing test**

`server/tests/app.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 5: Uruchom test — ma failować**

Run: `cd /Users/pibe/dev/fotowolt/server && npx vitest run tests/app.test.ts`
Expected: FAIL — `Cannot find module '../src/app'` (lub podobny błąd importu).

- [ ] **Step 6: Minimalna implementacja**

`server/src/app.ts`:

```ts
import express from "express";
import cors from "cors";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
```

`server/src/index.ts`:

```ts
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
```

- [ ] **Step 7: Testy zielone + typecheck**

Run: `cd /Users/pibe/dev/fotowolt/server && npx vitest run tests/app.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: szkielet serwera Express z endpointem /health"
```

---

### Task 2: Schema Prisma, województwa, serializacja, helpery testowe, seed

**Files:**
- Create: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/src/db.ts`, `server/src/voivodeships.ts`, `server/src/serialize.ts`, `server/tests/helpers.ts`
- Test: `server/tests/voivodeships.test.ts` (nowy plik testowy dla walidacji)

**Interfaces:**
- Produces:
  - `prisma` (singleton `PrismaClient`) z `server/src/db.ts`
  - `VOIVODESHIPS: readonly string[]`, `isValidVoivodeships(value: unknown): boolean` z `server/src/voivodeships.ts`
  - `serializeUser(user: User)` → `{ id, email, role, status, companyName, contactName, phone, voivodeships: string[] }` oraz `serializeOrder(order: Order)` → `{ id, kw, description, address, voivodeship, status, createdAt }` z `server/src/serialize.ts`
  - Z `server/tests/helpers.ts`: `resetDb(): Promise<void>`, `createClient(email?: string): Promise<User>`, `createContractor(email?: string, opts?: { status?: string; voivodeships?: string[] }): Promise<User>`, `createOrder(ownerId: string, opts?: { voivodeship?: string; status?: string }): Promise<Order>`
  - Modele Prisma: `User`, `Order`, `Bid`, `OrderDecline`, `Notification`

- [ ] **Step 1: Schema Prisma**

`server/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique
  role         String // "CLIENT" | "CONTRACTOR"
  status       String         @default("APPROVED") // contractors start as "PENDING"
  companyName  String?
  contactName  String?
  phone        String?
  voivodeships String         @default("[]") // JSON array of voivodeship names
  orders        Order[]
  bids          Bid[]
  declines      OrderDecline[]
  notifications Notification[]
}

model Order {
  id          String         @id @default(cuid())
  ownerId     String
  owner       User           @relation(fields: [ownerId], references: [id])
  kw          Float
  description String
  address     String
  voivodeship String
  status      String         @default("OPEN") // "OPEN" | "ASSIGNED"
  createdAt   DateTime       @default(now())
  bids        Bid[]
  declines    OrderDecline[]
}

model Bid {
  id           String   @id @default(cuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])
  contractorId String
  contractor   User     @relation(fields: [contractorId], references: [id])
  status       String   @default("PENDING") // "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt    DateTime @default(now())

  @@unique([orderId, contractorId])
}

model OrderDecline {
  id           String @id @default(cuid())
  orderId      String
  order        Order  @relation(fields: [orderId], references: [id])
  contractorId String
  contractor   User   @relation(fields: [contractorId], references: [id])

  @@unique([orderId, contractorId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String // "NEW_ORDER" | "BID_SUBMITTED" | "ORDER_DECLINED" | "ORDER_ASSIGNED"
  message   String
  orderId   String? // celowo bez relacji — samo id do nawigacji
  createdAt DateTime @default(now())
}
```

Utwórz też `server/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

i dopisz `.env` do `server/.gitignore`.

- [ ] **Step 2: Wygeneruj klienta i bazę dev**

```bash
cd /Users/pibe/dev/fotowolt/server
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Napisz failing test walidacji województw**

`server/tests/voivodeships.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VOIVODESHIPS, isValidVoivodeships } from "../src/voivodeships";

describe("voivodeships", () => {
  it("contains all 16 voivodeships", () => {
    expect(VOIVODESHIPS).toHaveLength(16);
    expect(VOIVODESHIPS).toContain("mazowieckie");
    expect(VOIVODESHIPS).toContain("warmińsko-mazurskie");
  });

  it("accepts a non-empty list of valid names", () => {
    expect(isValidVoivodeships(["mazowieckie", "łódzkie"])).toBe(true);
  });

  it("rejects empty list, non-arrays and unknown names", () => {
    expect(isValidVoivodeships([])).toBe(false);
    expect(isValidVoivodeships("mazowieckie")).toBe(false);
    expect(isValidVoivodeships(["mazowieckie", "atlantyda"])).toBe(false);
  });
});
```

- [ ] **Step 4: Uruchom test — ma failować**

Run: `npx vitest run tests/voivodeships.test.ts`
Expected: FAIL — brak modułu `../src/voivodeships`.

- [ ] **Step 5: Implementacja**

`server/src/voivodeships.ts`:

```ts
export const VOIVODESHIPS = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];

export function isValidVoivodeships(value: unknown): value is Voivodeship[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => (VOIVODESHIPS as readonly string[]).includes(v))
  );
}

export function isValidVoivodeship(value: unknown): value is Voivodeship {
  return typeof value === "string" && (VOIVODESHIPS as readonly string[]).includes(value);
}
```

`server/src/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

`server/src/serialize.ts`:

```ts
import type { Order, User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    companyName: user.companyName,
    contactName: user.contactName,
    phone: user.phone,
    voivodeships: JSON.parse(user.voivodeships) as string[],
  };
}

export function serializeOrder(order: Order) {
  return {
    id: order.id,
    kw: order.kw,
    description: order.description,
    address: order.address,
    voivodeship: order.voivodeship,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
}
```

`server/tests/helpers.ts`:

```ts
import { prisma } from "../src/db";

export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.orderDecline.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
}

export async function createClient(email = "client@test.pl") {
  return prisma.user.create({
    data: { email, role: "CLIENT", status: "APPROVED" },
  });
}

export async function createContractor(
  email = "contractor@test.pl",
  opts: { status?: string; voivodeships?: string[] } = {},
) {
  return prisma.user.create({
    data: {
      email,
      role: "CONTRACTOR",
      status: opts.status ?? "APPROVED",
      companyName: "Solar Instal sp. z o.o.",
      contactName: "Jan Kowalski",
      phone: "600100200",
      voivodeships: JSON.stringify(opts.voivodeships ?? ["mazowieckie"]),
    },
  });
}

export async function createOrder(
  ownerId: string,
  opts: { voivodeship?: string; status?: string } = {},
) {
  return prisma.order.create({
    data: {
      ownerId,
      kw: 9.9,
      description: "Instalacja PV na dachu skośnym",
      address: "ul. Słoneczna 1, 00-001 Warszawa",
      voivodeship: opts.voivodeship ?? "mazowieckie",
      status: opts.status ?? "OPEN",
    },
  });
}
```

`server/prisma/seed.ts`:

```ts
import { prisma } from "../src/db";

async function main() {
  await prisma.user.upsert({
    where: { email: "biuro@fotowolt.pl" },
    update: {},
    create: {
      email: "biuro@fotowolt.pl",
      role: "CLIENT",
      status: "APPROVED",
      companyName: "Fotowolt",
      contactName: "Biuro Fotowolt",
    },
  });
  console.log("Seeded client account biuro@fotowolt.pl");
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Testy zielone (pełny cykl z bazą testową)**

Run: `cd /Users/pibe/dev/fotowolt/server && npm test && npm run typecheck && npm run db:seed`
Expected: wszystkie testy PASS; seed wypisuje `Seeded client account biuro@fotowolt.pl`.

- [ ] **Step 7: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: model danych Prisma (User/Order/Bid/OrderDecline), województwa, seed"
```

---

### Task 3: Auth — login e-mailem, /auth/me i middleware tożsamości

**Files:**
- Create: `server/src/routes/auth.ts`, `server/src/middleware/currentUser.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/auth.test.ts`

**Interfaces:**
- Consumes: `prisma`, `serializeUser`, helpery testowe z Task 2.
- Produces:
  - `POST /auth/login { email }` → `200 serializeUser` | `400 { error }` | `404 { error }`
  - `GET /auth/me` (nagłówek `x-user-id`) → `200 serializeUser` | `401`
  - Middleware z `server/src/middleware/currentUser.ts`: `currentUser` (ładuje `req.user` z nagłówka `x-user-id`), `requireUser`, `requireClient`, `requireApprovedContractor` — używane przez wszystkie kolejne taski serwerowe. `req.user` ma typ `User` z `@prisma/client`.

- [ ] **Step 1: Napisz failing testy**

`server/tests/auth.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createClient, createContractor, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

describe("POST /auth/login", () => {
  it("logs in an existing user by email", async () => {
    const user = await createClient("biuro@fotowolt.pl");
    const res = await request(app).post("/auth/login").send({ email: "biuro@fotowolt.pl" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, role: "CLIENT", voivodeships: [] });
  });

  it("returns 404 for unknown email", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nikt@nigdzie.pl" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user from x-user-id header", async () => {
    const user = await createContractor("firma@test.pl", { voivodeships: ["łódzkie"] });
    const res = await request(app).get("/auth/me").set("x-user-id", user.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, role: "CONTRACTOR", voivodeships: ["łódzkie"] });
  });

  it("returns 401 without a valid x-user-id", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `cd /Users/pibe/dev/fotowolt/server && npm test`
Expected: FAIL — brak routera `/auth` (404 zamiast oczekiwanych statusów).

- [ ] **Step 3: Implementacja**

`server/src/middleware/currentUser.ts`:

```ts
import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../db";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export async function currentUser(req: Request, _res: Response, next: NextFunction) {
  const id = req.header("x-user-id");
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) req.user = user;
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

export function requireClient(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "CLIENT") return res.status(403).json({ error: "forbidden" });
  next();
}

export function requireApprovedContractor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "CONTRACTOR" || req.user.status !== "APPROVED") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}
```

`server/src/routes/auth.ts`:

```ts
import { Router } from "express";
import { prisma } from "../db";
import { serializeUser } from "../serialize";
import { requireUser } from "../middleware/currentUser";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "email is required" });
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(serializeUser(user));
});

authRouter.get("/me", requireUser, (req, res) => {
  res.json(serializeUser(req.user!));
});
```

W `server/src/app.ts` dodaj middleware i router (całość pliku po zmianie):

```ts
import express from "express";
import cors from "cors";
import { currentUser } from "./middleware/currentUser";
import { authRouter } from "./routes/auth";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(currentUser);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);

  return app;
}
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: logowanie e-mailem i middleware tożsamości x-user-id"
```

---

### Task 4: Rejestracja zleceniobiorcy

**Files:**
- Create: `server/src/routes/contractors.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/contractors.test.ts`

**Interfaces:**
- Consumes: `prisma`, `serializeUser`, `isValidVoivodeships`, guardy z Task 3.
- Produces: `POST /contractors/register { email, companyName, contactName, phone, voivodeships: string[] }` → `201 serializeUser` (status `"PENDING"`) | `400` | `409` (duplikat e-maila). Router `contractorsRouter` — Task 5 dopisze do niego kolejne endpointy.

- [ ] **Step 1: Napisz failing testy**

`server/tests/contractors.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createContractor, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

const validBody = {
  email: "nowa@firma.pl",
  companyName: "Nowa Energia sp. z o.o.",
  contactName: "Anna Nowak",
  phone: "500600700",
  voivodeships: ["mazowieckie", "łódzkie"],
};

describe("POST /contractors/register", () => {
  it("creates a PENDING contractor", async () => {
    const res = await request(app).post("/contractors/register").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      role: "CONTRACTOR",
      status: "PENDING",
      companyName: validBody.companyName,
      voivodeships: ["mazowieckie", "łódzkie"],
    });
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, companyName: "" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid voivodeships", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, voivodeships: ["narnia"] });
    expect(res.status).toBe(400);
  });

  it("rejects an empty voivodeship list (obszar działania is mandatory)", async () => {
    const res = await request(app)
      .post("/contractors/register")
      .send({ ...validBody, voivodeships: [] });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email with 409", async () => {
    await createContractor("nowa@firma.pl");
    const res = await request(app).post("/contractors/register").send(validBody);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `npm test`
Expected: nowe testy FAIL (404 — brak routera), stare PASS.

- [ ] **Step 3: Implementacja**

`server/src/routes/contractors.ts`:

```ts
import { Router } from "express";
import { prisma } from "../db";
import { serializeUser } from "../serialize";
import { isValidVoivodeships } from "../voivodeships";

export const contractorsRouter = Router();

contractorsRouter.post("/register", async (req, res) => {
  const { email, companyName, contactName, phone, voivodeships } = req.body ?? {};
  for (const [name, value] of Object.entries({ email, companyName, contactName, phone })) {
    if (typeof value !== "string" || value.trim() === "") {
      return res.status(400).json({ error: `${name} is required` });
    }
  }
  if (!isValidVoivodeships(voivodeships)) {
    return res.status(400).json({ error: "voivodeships must be a non-empty list of valid names" });
  }
  const normalizedEmail = (email as string).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "email already registered" });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      role: "CONTRACTOR",
      status: "PENDING",
      companyName: (companyName as string).trim(),
      contactName: (contactName as string).trim(),
      phone: (phone as string).trim(),
      voivodeships: JSON.stringify(voivodeships),
    },
  });
  res.status(201).json(serializeUser(user));
});
```

W `server/src/app.ts` dodaj import i montaż (pod `app.use("/auth", authRouter);`):

```ts
import { contractorsRouter } from "./routes/contractors";
// ...w createApp():
app.use("/contractors", contractorsRouter);
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: rejestracja zleceniobiorcy (status PENDING, wymagany obszar działania)"
```

---

### Task 5: Zarządzanie zleceniobiorcami przez zleceniodawcę

**Files:**
- Modify: `server/src/routes/contractors.ts`
- Test: `server/tests/contractors.test.ts` (dopisz opisane niżej `describe`)

**Interfaces:**
- Consumes: `requireClient` z Task 3, `contractorsRouter` z Task 4.
- Produces (wszystkie tylko dla roli CLIENT — inaczej `401/403`):
  - `GET /contractors` i `GET /contractors?status=PENDING` → `200 serializeUser[]`
  - `POST /contractors/:id/approve` → `200 serializeUser` (status `"APPROVED"`) | `404`
  - `POST /contractors/:id/reject` → `200 serializeUser` (status `"REJECTED"`) | `404`
  - `PATCH /contractors/:id/voivodeships { voivodeships: string[] }` → `200 serializeUser` | `400` | `404`

- [ ] **Step 1: Napisz failing testy (dopisz do `server/tests/contractors.test.ts`)**

```ts
import { createClient } from "./helpers"; // dopisz do istniejącego importu z "./helpers"

describe("contractor management (client only)", () => {
  it("lists contractors filtered by status", async () => {
    const client = await createClient();
    await createContractor("a@firma.pl", { status: "PENDING" });
    await createContractor("b@firma.pl", { status: "APPROVED" });

    const res = await request(app)
      .get("/contractors?status=PENDING")
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe("a@firma.pl");
  });

  it("forbids contractors from listing", async () => {
    const contractor = await createContractor();
    const res = await request(app).get("/contractors").set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });

  it("approves a pending contractor", async () => {
    const client = await createClient();
    const pending = await createContractor("a@firma.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/contractors/${pending.id}/approve`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("rejects a pending contractor", async () => {
    const client = await createClient();
    const pending = await createContractor("a@firma.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/contractors/${pending.id}/reject`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
  });

  it("updates a contractor's voivodeships", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const res = await request(app)
      .patch(`/contractors/${contractor.id}/voivodeships`)
      .set("x-user-id", client.id)
      .send({ voivodeships: ["śląskie", "opolskie"] });
    expect(res.status).toBe(200);
    expect(res.body.voivodeships).toEqual(["śląskie", "opolskie"]);
  });

  it("rejects invalid voivodeship update", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const res = await request(app)
      .patch(`/contractors/${contractor.id}/voivodeships`)
      .set("x-user-id", client.id)
      .send({ voivodeships: [] });
    expect(res.status).toBe(400);
  });

  it("returns 404 when approving a non-contractor id", async () => {
    const client = await createClient();
    const res = await request(app)
      .post(`/contractors/${client.id}/approve`)
      .set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `npm test`
Expected: nowe testy FAIL (404).

- [ ] **Step 3: Implementacja — dopisz do `server/src/routes/contractors.ts`**

Dodaj importy: `import type { Response } from "express";` oraz `import { requireClient } from "../middleware/currentUser";`, potem pod endpointem `register`:

```ts
contractorsRouter.get("/", requireClient, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const contractors = await prisma.user.findMany({
    where: { role: "CONTRACTOR", ...(status ? { status } : {}) },
    orderBy: { email: "asc" },
  });
  res.json(contractors.map(serializeUser));
});

async function setContractorStatus(id: string, status: string, res: Response) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "CONTRACTOR") {
    return res.status(404).json({ error: "contractor not found" });
  }
  const updated = await prisma.user.update({ where: { id }, data: { status } });
  res.json(serializeUser(updated));
}

contractorsRouter.post("/:id/approve", requireClient, (req, res) =>
  setContractorStatus(req.params.id, "APPROVED", res),
);

contractorsRouter.post("/:id/reject", requireClient, (req, res) =>
  setContractorStatus(req.params.id, "REJECTED", res),
);

contractorsRouter.patch("/:id/voivodeships", requireClient, async (req, res) => {
  const { voivodeships } = req.body ?? {};
  if (!isValidVoivodeships(voivodeships)) {
    return res.status(400).json({ error: "voivodeships must be a non-empty list of valid names" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== "CONTRACTOR") {
    return res.status(404).json({ error: "contractor not found" });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { voivodeships: JSON.stringify(voivodeships) },
  });
  res.json(serializeUser(updated));
});
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: akceptacja/odrzucanie zleceniobiorców i edycja województw przez zleceniodawcę"
```

---

### Task 6: Zlecenia — tworzenie, listy per rola, szczegóły

**Files:**
- Create: `server/src/routes/orders.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/orders.test.ts`

**Interfaces:**
- Consumes: `prisma`, `serializeOrder`, `serializeUser`, `isValidVoivodeship`, guardy z Task 3, fabryki z Task 2.
- Produces:
  - `POST /orders { kw: number, description, address, voivodeship }` (CLIENT) → `201 serializeOrder` | `400`
  - `GET /orders` (CLIENT) → `200 (serializeOrder & { pendingBidCount: number })[]` — własne zlecenia, najnowsze pierwsze
  - `GET /orders` (APPROVED CONTRACTOR) → `200 serializeOrder[]` — tylko `OPEN`, w województwach wykonawcy, bez odrzuconych i bez tych, na które już złożył gotowość
  - `GET /orders/:id` (CLIENT, właściciel) → `200 serializeOrder & { bids: { id, status, contractor: serializeUser }[], declines: { id, contractor: serializeUser }[] }` | `403 | 404`
  - `GET /orders/:id` (CONTRACTOR) → `200 serializeOrder & { myBid: { id, status } | null }` | `404`
  - Router `ordersRouter` — Task 7 dopisze do niego endpointy gotowości.

- [ ] **Step 1: Napisz failing testy**

`server/tests/orders.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

describe("POST /orders", () => {
  it("creates an order as client", async () => {
    const client = await createClient();
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", client.id)
      .send({
        kw: 12.5,
        description: "Instalacja PV 12,5 kW",
        address: "ul. Polna 5, Płock",
        voivodeship: "mazowieckie",
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kw: 12.5, status: "OPEN", voivodeship: "mazowieckie" });
  });

  it("rejects invalid payloads", async () => {
    const client = await createClient();
    const base = { kw: 10, description: "x", address: "y", voivodeship: "mazowieckie" };
    for (const bad of [
      { ...base, kw: 0 },
      { ...base, kw: "dziesięć" },
      { ...base, description: "" },
      { ...base, address: "" },
      { ...base, voivodeship: "narnia" },
    ]) {
      const res = await request(app).post("/orders").set("x-user-id", client.id).send(bad);
      expect(res.status).toBe(400);
    }
  });

  it("forbids contractors from creating orders", async () => {
    const contractor = await createContractor();
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", contractor.id)
      .send({ kw: 10, description: "x", address: "y", voivodeship: "mazowieckie" });
    expect(res.status).toBe(403);
  });
});

describe("GET /orders", () => {
  it("client sees own orders with pending bid count", async () => {
    const client = await createClient();
    await createOrder(client.id);
    const res = await request(app).get("/orders").set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].pendingBidCount).toBe(0);
  });

  it("approved contractor sees only OPEN orders in own voivodeships", async () => {
    const client = await createClient();
    await createOrder(client.id, { voivodeship: "mazowieckie" });
    await createOrder(client.id, { voivodeship: "śląskie" });
    await createOrder(client.id, { voivodeship: "mazowieckie", status: "ASSIGNED" });
    const contractor = await createContractor("f@test.pl", { voivodeships: ["mazowieckie"] });

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].voivodeship).toBe("mazowieckie");
    expect(res.body[0].status).toBe("OPEN");
  });

  it("forbids a PENDING contractor", async () => {
    const contractor = await createContractor("f@test.pl", { status: "PENDING" });
    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });
});

describe("GET /orders/:id", () => {
  it("owner gets order with bids and declines arrays", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", client.id);
    expect(res.status).toBe(200);
    expect(res.body.bids).toEqual([]);
    expect(res.body.declines).toEqual([]);
  });

  it("contractor gets order with myBid: null", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const res = await request(app).get(`/orders/${order.id}`).set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body.myBid).toBeNull();
  });

  it("returns 404 for unknown order", async () => {
    const client = await createClient();
    const res = await request(app).get("/orders/nie-ma").set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `npm test`
Expected: nowe testy FAIL (404 — brak routera).

- [ ] **Step 3: Implementacja**

`server/src/routes/orders.ts`:

```ts
import { Router } from "express";
import { prisma } from "../db";
import { serializeOrder, serializeUser } from "../serialize";
import { isValidVoivodeship } from "../voivodeships";
import { requireClient, requireUser } from "../middleware/currentUser";

export const ordersRouter = Router();

ordersRouter.post("/", requireClient, async (req, res) => {
  const { kw, description, address, voivodeship } = req.body ?? {};
  if (typeof kw !== "number" || !Number.isFinite(kw) || kw <= 0) {
    return res.status(400).json({ error: "kw must be a positive number" });
  }
  for (const [name, value] of Object.entries({ description, address })) {
    if (typeof value !== "string" || value.trim() === "") {
      return res.status(400).json({ error: `${name} is required` });
    }
  }
  if (!isValidVoivodeship(voivodeship)) {
    return res.status(400).json({ error: "voivodeship must be a valid voivodeship name" });
  }
  const order = await prisma.order.create({
    data: {
      ownerId: req.user!.id,
      kw,
      description: (description as string).trim(),
      address: (address as string).trim(),
      voivodeship,
    },
  });
  res.status(201).json(serializeOrder(order));
});

ordersRouter.get("/", requireUser, async (req, res) => {
  const user = req.user!;
  if (user.role === "CLIENT") {
    const orders = await prisma.order.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bids: { where: { status: "PENDING" } } } } },
    });
    return res.json(
      orders.map((o) => ({ ...serializeOrder(o), pendingBidCount: o._count.bids })),
    );
  }
  if (user.status !== "APPROVED") return res.status(403).json({ error: "forbidden" });
  const voivodeships = JSON.parse(user.voivodeships) as string[];
  const orders = await prisma.order.findMany({
    where: {
      status: "OPEN",
      voivodeship: { in: voivodeships },
      declines: { none: { contractorId: user.id } },
      bids: { none: { contractorId: user.id } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders.map(serializeOrder));
});

ordersRouter.get("/:id", requireUser, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "order not found" });
  const user = req.user!;
  if (user.role === "CLIENT") {
    if (order.ownerId !== user.id) return res.status(403).json({ error: "forbidden" });
    const bids = await prisma.bid.findMany({
      where: { orderId: order.id },
      include: { contractor: true },
      orderBy: { createdAt: "asc" },
    });
    const declines = await prisma.orderDecline.findMany({
      where: { orderId: order.id },
      include: { contractor: true },
    });
    return res.json({
      ...serializeOrder(order),
      bids: bids.map((b) => ({ id: b.id, status: b.status, contractor: serializeUser(b.contractor) })),
      declines: declines.map((d) => ({ id: d.id, contractor: serializeUser(d.contractor) })),
    });
  }
  if (user.status !== "APPROVED") return res.status(403).json({ error: "forbidden" });
  const myBid = await prisma.bid.findUnique({
    where: { orderId_contractorId: { orderId: order.id, contractorId: user.id } },
  });
  res.json({
    ...serializeOrder(order),
    myBid: myBid ? { id: myBid.id, status: myBid.status } : null,
  });
});
```

W `server/src/app.ts` dodaj:

```ts
import { ordersRouter } from "./routes/orders";
// ...w createApp():
app.use("/orders", ordersRouter);
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: zlecenia — tworzenie, listy per rola z dopasowaniem po województwie, szczegóły"
```

---

### Task 7: Gotowości — zgłoszenie i odrzucenie zlecenia przez zleceniobiorcę

**Files:**
- Modify: `server/src/routes/orders.ts`
- Create: `server/src/routes/bids.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/bids.test.ts`

**Interfaces:**
- Consumes: `ordersRouter` z Task 6, `requireApprovedContractor` z Task 3, model `Bid`/`OrderDecline` z Task 2 (unikat `orderId_contractorId`).
- Produces:
  - `POST /orders/:id/bids` (APPROVED CONTRACTOR) → `201 { id, status: "PENDING", orderId }` | `404` | `409` (zlecenie nie-OPEN albo gotowość już istnieje)
  - `POST /orders/:id/decline` (APPROVED CONTRACTOR) → `200 { ok: true }` (idempotentne) | `404`
  - `GET /bids/mine` (CONTRACTOR) → `200 { id, status, order: serializeOrder }[]`
  - Router `bidsRouter` — Task 8 dopisze `POST /bids/:id/accept`.

- [ ] **Step 1: Napisz failing testy**

`server/tests/bids.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

describe("POST /orders/:id/bids", () => {
  it("creates a PENDING bid", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "PENDING", orderId: order.id });
  });

  it("rejects a duplicate bid with 409", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(409);
  });

  it("rejects bidding on a non-open order with 409", async () => {
    const client = await createClient();
    const order = await createOrder(client.id, { status: "ASSIGNED" });
    const contractor = await createContractor();
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(409);
  });

  it("forbids a PENDING contractor", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor("p@test.pl", { status: "PENDING" });
    const res = await request(app)
      .post(`/orders/${order.id}/bids`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(403);
  });
});

describe("POST /orders/:id/decline", () => {
  it("hides the order from the contractor's list", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const declineRes = await request(app)
      .post(`/orders/${order.id}/decline`)
      .set("x-user-id", contractor.id);
    expect(declineRes.status).toBe(200);

    const listRes = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(listRes.body).toHaveLength(0);
  });

  it("is idempotent", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    const res = await request(app)
      .post(`/orders/${order.id}/decline`)
      .set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
  });
});

describe("GET /bids/mine", () => {
  it("lists the contractor's bids with orders", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);

    const res = await request(app).get("/bids/mine").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].order.id).toBe(order.id);
  });

  it("forbids clients", async () => {
    const client = await createClient();
    const res = await request(app).get("/bids/mine").set("x-user-id", client.id);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `npm test`
Expected: nowe testy FAIL (404).

- [ ] **Step 3: Implementacja**

Dopisz do `server/src/routes/orders.ts` (dodaj `requireApprovedContractor` do importu z `../middleware/currentUser`):

```ts
ordersRouter.post("/:id/bids", requireApprovedContractor, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "order not found" });
  if (order.status !== "OPEN") return res.status(409).json({ error: "order is not open" });
  const existing = await prisma.bid.findUnique({
    where: { orderId_contractorId: { orderId: order.id, contractorId: req.user!.id } },
  });
  if (existing) return res.status(409).json({ error: "bid already submitted" });
  const bid = await prisma.bid.create({
    data: { orderId: order.id, contractorId: req.user!.id },
  });
  res.status(201).json({ id: bid.id, status: bid.status, orderId: bid.orderId });
});

ordersRouter.post("/:id/decline", requireApprovedContractor, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "order not found" });
  await prisma.orderDecline.upsert({
    where: { orderId_contractorId: { orderId: order.id, contractorId: req.user!.id } },
    update: {},
    create: { orderId: order.id, contractorId: req.user!.id },
  });
  res.json({ ok: true });
});
```

`server/src/routes/bids.ts`:

```ts
import { Router } from "express";
import { prisma } from "../db";
import { serializeOrder } from "../serialize";
import { requireUser } from "../middleware/currentUser";

export const bidsRouter = Router();

bidsRouter.get("/mine", requireUser, async (req, res) => {
  if (req.user!.role !== "CONTRACTOR") return res.status(403).json({ error: "forbidden" });
  const bids = await prisma.bid.findMany({
    where: { contractorId: req.user!.id },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bids.map((b) => ({ id: b.id, status: b.status, order: serializeOrder(b.order) })));
});
```

W `server/src/app.ts` dodaj:

```ts
import { bidsRouter } from "./routes/bids";
// ...w createApp():
app.use("/bids", bidsRouter);
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: zgłaszanie gotowości i odrzucanie zleceń przez zleceniobiorcę"
```

---

### Task 8: Akceptacja gotowości przez zleceniodawcę

**Files:**
- Modify: `server/src/routes/bids.ts`
- Test: `server/tests/bids.test.ts` (dopisz `describe`)

**Interfaces:**
- Consumes: `bidsRouter` z Task 7, `requireClient` z Task 3.
- Produces: `POST /bids/:id/accept` (CLIENT, właściciel zlecenia) → `200 { ok: true }`; transakcyjnie: wybrany bid → `"ACCEPTED"`, pozostałe bidy zlecenia → `"REJECTED"`, zlecenie → `"ASSIGNED"`. Błędy: `404` (brak bidu), `403` (nie właściciel), `409` (zlecenie nie-OPEN).

- [ ] **Step 1: Napisz failing testy (dopisz do `server/tests/bids.test.ts`)**

```ts
describe("POST /bids/:id/accept", () => {
  it("accepts one bid, rejects the rest and assigns the order", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const c1 = await createContractor("c1@test.pl");
    const c2 = await createContractor("c2@test.pl");
    const bid1 = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });
    const bid2 = await prisma.bid.create({ data: { orderId: order.id, contractorId: c2.id } });

    const res = await request(app).post(`/bids/${bid1.id}/accept`).set("x-user-id", client.id);
    expect(res.status).toBe(200);

    const updated1 = await prisma.bid.findUniqueOrThrow({ where: { id: bid1.id } });
    const updated2 = await prisma.bid.findUniqueOrThrow({ where: { id: bid2.id } });
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated1.status).toBe("ACCEPTED");
    expect(updated2.status).toBe("REJECTED");
    expect(updatedOrder.status).toBe("ASSIGNED");
  });

  it("forbids a client who does not own the order", async () => {
    const owner = await createClient("owner@test.pl");
    const other = await createClient("other@test.pl");
    const order = await createOrder(owner.id);
    const c1 = await createContractor("c1@test.pl");
    const bid = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });

    const res = await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", other.id);
    expect(res.status).toBe(403);
  });

  it("returns 409 when the order is already assigned", async () => {
    const client = await createClient();
    const order = await createOrder(client.id, { status: "ASSIGNED" });
    const c1 = await createContractor("c1@test.pl");
    const bid = await prisma.bid.create({ data: { orderId: order.id, contractorId: c1.id } });

    const res = await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", client.id);
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown bid", async () => {
    const client = await createClient();
    const res = await request(app).post("/bids/nie-ma/accept").set("x-user-id", client.id);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `npm test`
Expected: nowe testy FAIL (404).

- [ ] **Step 3: Implementacja — dopisz do `server/src/routes/bids.ts`**

Dodaj `requireClient` do importu z `../middleware/currentUser`, potem:

```ts
bidsRouter.post("/:id/accept", requireClient, async (req, res) => {
  const bid = await prisma.bid.findUnique({
    where: { id: req.params.id },
    include: { order: true },
  });
  if (!bid) return res.status(404).json({ error: "bid not found" });
  if (bid.order.ownerId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
  if (bid.order.status !== "OPEN") return res.status(409).json({ error: "order is not open" });

  await prisma.$transaction([
    prisma.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } }),
    prisma.bid.updateMany({
      where: { orderId: bid.orderId, id: { not: bid.id } },
      data: { status: "REJECTED" },
    }),
    prisma.order.update({ where: { id: bid.orderId }, data: { status: "ASSIGNED" } }),
  ]);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS — komplet testów serwera.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: wybór wykonawcy — akceptacja jednej gotowości, odrzucenie pozostałych"
```

---

### Task 9: Powiadomienia systemowe (serwer)

**Files:**
- Create: `server/src/notifications.ts`, `server/src/routes/notifications.ts`
- Modify: `server/src/routes/orders.ts`, `server/src/routes/bids.ts`, `server/src/app.ts`
- Test: `server/tests/notifications.test.ts`

**Interfaces:**
- Consumes: model `Notification` (Task 2), routery z Tasków 6–8, `requireUser` z Task 3.
- Produces:
  - `notify(userId: string, type: NotificationType, message: string, orderId?: string): Promise<void>` oraz `type NotificationType = "NEW_ORDER" | "BID_SUBMITTED" | "ORDER_DECLINED" | "ORDER_ASSIGNED"` z `server/src/notifications.ts` (Task 10 też ich używa)
  - `GET /notifications` → `200 { id, type, message, orderId, createdAt }[]` — tylko własne, najnowsze pierwsze | `401`
  - Zdarzenia systemowe: utworzenie zlecenia → `NEW_ORDER` do każdego APPROVED wykonawcy z pasującym województwem; zgłoszenie gotowości → `BID_SUBMITTED` do właściciela zlecenia; odrzucenie (tylko pierwsze — idempotencja bez duplikatów) → `ORDER_DECLINED` do właściciela; akceptacja gotowości → `ORDER_ASSIGNED` do wykonawcy.

- [ ] **Step 1: Napisz failing testy**

`server/tests/notifications.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

function notificationsFor(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

const orderBody = {
  kw: 10,
  description: "Instalacja PV",
  address: "Warszawa",
  voivodeship: "mazowieckie",
};

describe("system notifications", () => {
  it("notifies matching APPROVED contractors about a new order", async () => {
    const client = await createClient();
    const matching = await createContractor("a@x.pl", { voivodeships: ["mazowieckie"] });
    const otherArea = await createContractor("b@x.pl", { voivodeships: ["śląskie"] });
    const pending = await createContractor("c@x.pl", {
      status: "PENDING",
      voivodeships: ["mazowieckie"],
    });

    await request(app).post("/orders").set("x-user-id", client.id).send(orderBody);

    const forMatching = await notificationsFor(matching.id);
    expect(forMatching).toHaveLength(1);
    expect(forMatching[0].type).toBe("NEW_ORDER");
    expect(await notificationsFor(otherArea.id)).toHaveLength(0);
    expect(await notificationsFor(pending.id)).toHaveLength(0);
  });

  it("does not match partial voivodeship names (pomorskie vs kujawsko-pomorskie)", async () => {
    const client = await createClient();
    const kp = await createContractor("kp@x.pl", { voivodeships: ["kujawsko-pomorskie"] });
    await request(app)
      .post("/orders")
      .set("x-user-id", client.id)
      .send({ ...orderBody, voivodeship: "pomorskie" });
    expect(await notificationsFor(kp.id)).toHaveLength(0);
  });

  it("notifies the client when a contractor submits readiness", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);

    const forClient = await notificationsFor(client.id);
    expect(forClient).toHaveLength(1);
    expect(forClient[0].type).toBe("BID_SUBMITTED");
    expect(forClient[0].orderId).toBe(order.id);
  });

  it("notifies the client exactly once when a contractor declines", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);

    const forClient = await notificationsFor(client.id);
    expect(forClient).toHaveLength(1);
    expect(forClient[0].type).toBe("ORDER_DECLINED");
  });

  it("notifies the contractor when their bid is accepted", async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    const contractor = await createContractor();
    const bid = await prisma.bid.create({
      data: { orderId: order.id, contractorId: contractor.id },
    });
    await request(app).post(`/bids/${bid.id}/accept`).set("x-user-id", client.id);

    const forContractor = await notificationsFor(contractor.id);
    expect(forContractor).toHaveLength(1);
    expect(forContractor[0].type).toBe("ORDER_ASSIGNED");
  });
});

describe("GET /notifications", () => {
  it("returns only own notifications", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    await prisma.notification.create({
      data: { userId: client.id, type: "BID_SUBMITTED", message: "dla klienta" },
    });
    await prisma.notification.create({
      data: { userId: contractor.id, type: "NEW_ORDER", message: "dla wykonawcy" },
    });

    const res = await request(app).get("/notifications").set("x-user-id", contractor.id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].message).toBe("dla wykonawcy");
  });

  it("requires auth", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `cd /Users/pibe/dev/fotowolt/server && npm test`
Expected: nowe testy FAIL (brak powiadomień / 404 na `/notifications`), stare PASS.

- [ ] **Step 3: Implementacja**

`server/src/notifications.ts`:

```ts
import { prisma } from "./db";

export type NotificationType =
  | "NEW_ORDER"
  | "BID_SUBMITTED"
  | "ORDER_DECLINED"
  | "ORDER_ASSIGNED";

export async function notify(
  userId: string,
  type: NotificationType,
  message: string,
  orderId?: string,
) {
  await prisma.notification.create({ data: { userId, type, message, orderId } });
}
```

`server/src/routes/notifications.ts`:

```ts
import { Router } from "express";
import { prisma } from "../db";
import { requireUser } from "../middleware/currentUser";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireUser, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      orderId: n.orderId,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});
```

W `server/src/app.ts` dodaj:

```ts
import { notificationsRouter } from "./routes/notifications";
// ...w createApp():
app.use("/notifications", notificationsRouter);
```

W `server/src/routes/orders.ts` dodaj import `import { notify } from "../notifications";` i trzy hooki:

1. W handlerze `POST /` — po `prisma.order.create(...)`, przed `res.status(201)...`:

```ts
  const matchingContractors = await prisma.user.findMany({
    where: {
      role: "CONTRACTOR",
      status: "APPROVED",
      voivodeships: { contains: `"${voivodeship}"` },
    },
  });
  for (const contractor of matchingContractors) {
    await notify(
      contractor.id,
      "NEW_ORDER",
      `Nowe zlecenie: ${order.kw} kW, ${order.voivodeship}.`,
      order.id,
    );
  }
```

2. W handlerze `POST /:id/bids` — po `prisma.bid.create(...)`, przed `res.status(201)...`:

```ts
  await notify(
    order.ownerId,
    "BID_SUBMITTED",
    `${req.user!.companyName} zgłosił gotowość realizacji zlecenia ${order.kw} kW (${order.voivodeship}).`,
    order.id,
  );
```

3. Handler `POST /:id/decline` — zastąp dotychczasowy `upsert` całym poniższym ciałem (powiadomienie tylko przy pierwszym odrzuceniu, endpoint pozostaje idempotentny):

```ts
ordersRouter.post("/:id/decline", requireApprovedContractor, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "order not found" });
  const existing = await prisma.orderDecline.findUnique({
    where: { orderId_contractorId: { orderId: order.id, contractorId: req.user!.id } },
  });
  if (!existing) {
    await prisma.orderDecline.create({
      data: { orderId: order.id, contractorId: req.user!.id },
    });
    await notify(
      order.ownerId,
      "ORDER_DECLINED",
      `${req.user!.companyName} odrzucił zlecenie ${order.kw} kW (${order.voivodeship}).`,
      order.id,
    );
  }
  res.json({ ok: true });
});
```

W `server/src/routes/bids.ts` dodaj import `import { notify } from "../notifications";` i w handlerze `POST /:id/accept` — po `prisma.$transaction(...)`, przed `res.json({ ok: true })`:

```ts
  await notify(
    bid.contractorId,
    "ORDER_ASSIGNED",
    `Przydzielono Ci zlecenie ${bid.order.kw} kW (${bid.order.voivodeship}).`,
    bid.orderId,
  );
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS — w tym niezmienione testy Tasków 6–8 (idempotencja decline zachowana).

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: powiadomienia systemowe — nowe zlecenie, gotowość, odrzucenie, przydzielenie"
```

---

### Task 10: Automatyczne odrzucenie zlecenia po 3 dniach bez reakcji

**Files:**
- Create: `server/src/autoDecline.ts`
- Modify: `server/src/routes/orders.ts`
- Test: `server/tests/autoDecline.test.ts`

**Interfaces:**
- Consumes: `notify` z Task 9, modele `Order`/`OrderDecline` z Task 2.
- Produces: `AUTO_DECLINE_DAYS = 3` i `autoDeclineStaleOrders(): Promise<void>` z `server/src/autoDecline.ts` — dla każdego zlecenia `OPEN` starszego niż 3 dni tworzy `OrderDecline` dla każdego pasującego APPROVED wykonawcy, który nie zgłosił gotowości ani nie odrzucił, i wysyła `ORDER_DECLINED` do właściciela. Sweep wywoływany na początku handlerów `GET /orders` i `GET /orders/:id`.

- [ ] **Step 1: Napisz failing testy**

`server/tests/autoDecline.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createClient, createContractor, createOrder, resetDb } from "./helpers";

const app = createApp();

beforeEach(resetDb);

function backdateOrder(orderId: string, days: number) {
  return prisma.order.update({
    where: { id: orderId },
    data: { createdAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
  });
}

describe("auto-decline after 3 days", () => {
  it("auto-declines a stale order for an inactive contractor and notifies the client", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await backdateOrder(order.id, 4);

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.body).toHaveLength(0);

    const decline = await prisma.orderDecline.findUnique({
      where: { orderId_contractorId: { orderId: order.id, contractorId: contractor.id } },
    });
    expect(decline).not.toBeNull();

    const clientNotifications = await prisma.notification.findMany({
      where: { userId: client.id, type: "ORDER_DECLINED" },
    });
    expect(clientNotifications).toHaveLength(1);
  });

  it("does not touch contractors who already submitted a bid", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await request(app).post(`/orders/${order.id}/bids`).set("x-user-id", contractor.id);
    await backdateOrder(order.id, 4);

    await request(app).get("/orders").set("x-user-id", contractor.id);

    const decline = await prisma.orderDecline.findUnique({
      where: { orderId_contractorId: { orderId: order.id, contractorId: contractor.id } },
    });
    expect(decline).toBeNull();
  });

  it("does not create a second decline for an explicitly declined order", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    const order = await createOrder(client.id);
    await request(app).post(`/orders/${order.id}/decline`).set("x-user-id", contractor.id);
    await backdateOrder(order.id, 4);

    await request(app).get("/orders").set("x-user-id", contractor.id);

    const declines = await prisma.orderDecline.findMany({ where: { orderId: order.id } });
    expect(declines).toHaveLength(1);
  });

  it("leaves fresh orders untouched", async () => {
    const client = await createClient();
    const contractor = await createContractor();
    await createOrder(client.id);

    const res = await request(app).get("/orders").set("x-user-id", contractor.id);
    expect(res.body).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają failować**

Run: `cd /Users/pibe/dev/fotowolt/server && npm test`
Expected: FAIL — brak modułu `../src/autoDecline` / stale zlecenie wciąż widoczne.

- [ ] **Step 3: Implementacja**

`server/src/autoDecline.ts`:

```ts
import { prisma } from "./db";
import { notify } from "./notifications";

export const AUTO_DECLINE_DAYS = 3;

export async function autoDeclineStaleOrders() {
  const cutoff = new Date(Date.now() - AUTO_DECLINE_DAYS * 24 * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: { status: "OPEN", createdAt: { lt: cutoff } },
    include: { bids: true, declines: true },
  });
  for (const order of staleOrders) {
    const matchingContractors = await prisma.user.findMany({
      where: {
        role: "CONTRACTOR",
        status: "APPROVED",
        voivodeships: { contains: `"${order.voivodeship}"` },
      },
    });
    for (const contractor of matchingContractors) {
      const acted =
        order.bids.some((b) => b.contractorId === contractor.id) ||
        order.declines.some((d) => d.contractorId === contractor.id);
      if (acted) continue;
      await prisma.orderDecline.create({
        data: { orderId: order.id, contractorId: contractor.id },
      });
      await notify(
        order.ownerId,
        "ORDER_DECLINED",
        `${contractor.companyName} nie podjął zlecenia ${order.kw} kW (${order.voivodeship}) w ciągu ${AUTO_DECLINE_DAYS} dni — odrzucono automatycznie.`,
        order.id,
      );
    }
  }
}
```

W `server/src/routes/orders.ts` dodaj import `import { autoDeclineStaleOrders } from "../autoDecline";` oraz na samym początku handlerów `GET /` i `GET /:id` (pierwsza linia, przed pobraniem danych):

```ts
  await autoDeclineStaleOrders();
```

- [ ] **Step 4: Testy zielone**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: automatyczne odrzucenie zlecenia po 3 dniach bez reakcji wykonawcy"
```

---

### Task 11: Scaffold Expo, klient API, sesja, ekran logowania

**Files:**
- Create: katalog `mobile/` (create-expo-app), potem `mobile/src/api.ts`, `mobile/src/session.tsx`, `mobile/src/voivodeships.ts`, `mobile/src/voivodeships.test.ts`, `mobile/app/_layout.tsx`, `mobile/app/index.tsx`

**Interfaces:**
- Consumes: endpointy `POST /auth/login` (Task 3).
- Produces (używane przez wszystkie kolejne taski mobilne):
  - Typy z `mobile/src/api.ts`: `Role`, `User`, `Order`, `OrderDetailClient`, `OrderDetailContractor`, `BidForClient`, `DeclineForClient`, `MyBid`, `AppNotification`, klasa `ApiError { status: number }`, funkcja `api<T>(path: string, opts?: { method?: string; body?: unknown; userId?: string }): Promise<T>`
  - `SessionProvider`, `useSession(): { user: User | null; loading: boolean; login(u: User): Promise<void>; logout(): Promise<void> }` z `mobile/src/session.tsx`
  - `VOIVODESHIPS: readonly string[]`, `toggleVoivodeship(selected: string[], code: string): string[]` z `mobile/src/voivodeships.ts`

- [ ] **Step 1: Scaffold aplikacji Expo**

```bash
cd /Users/pibe/dev/fotowolt
npx create-expo-app@latest mobile --yes
cd mobile
npx expo install @react-native-async-storage/async-storage
npm install -D vitest
rm -rf app components constants hooks scripts
mkdir -p app src/components
```

Dodaj do `mobile/package.json` w `scripts`: `"test": "vitest run"` oraz `"typecheck": "tsc --noEmit"`.

- [ ] **Step 2: Napisz failing test helpera województw**

`mobile/src/voivodeships.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VOIVODESHIPS, toggleVoivodeship } from "./voivodeships";

describe("toggleVoivodeship", () => {
  it("adds a code that is not selected", () => {
    expect(toggleVoivodeship(["mazowieckie"], "łódzkie")).toEqual(["mazowieckie", "łódzkie"]);
  });

  it("removes a code that is selected", () => {
    expect(toggleVoivodeship(["mazowieckie", "łódzkie"], "łódzkie")).toEqual(["mazowieckie"]);
  });

  it("has 16 voivodeships", () => {
    expect(VOIVODESHIPS).toHaveLength(16);
  });
});
```

- [ ] **Step 3: Uruchom test — ma failować**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npx vitest run`
Expected: FAIL — brak `./voivodeships`.

- [ ] **Step 4: Implementacja modułów bazowych**

`mobile/src/voivodeships.ts`:

```ts
export const VOIVODESHIPS = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export function toggleVoivodeship(selected: string[], code: string): string[] {
  return selected.includes(code)
    ? selected.filter((c) => c !== code)
    : [...selected, code];
}
```

`mobile/src/api.ts`:

```ts
export type Role = "CLIENT" | "CONTRACTOR";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";
export type OrderStatus = "OPEN" | "ASSIGNED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type User = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  voivodeships: string[];
};

export type Order = {
  id: string;
  kw: number;
  description: string;
  address: string;
  voivodeship: string;
  status: OrderStatus;
  createdAt: string;
  pendingBidCount?: number;
};

export type BidForClient = { id: string; status: BidStatus; contractor: User };
export type DeclineForClient = { id: string; contractor: User };
export type OrderDetailClient = Order & { bids: BidForClient[]; declines: DeclineForClient[] };
export type OrderDetailContractor = Order & { myBid: { id: string; status: BidStatus } | null };
export type MyBid = { id: string; status: BidStatus; order: Order };

export type NotificationType = "NEW_ORDER" | "BID_SUBMITTED" | "ORDER_DECLINED" | "ORDER_ASSIGNED";
export type AppNotification = {
  id: string;
  type: NotificationType;
  message: string;
  orderId: string | null;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; userId?: string } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.userId ? { "x-user-id": opts.userId } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}
```

`mobile/src/session.tsx`:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "./api";

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const STORAGE_KEY = "session.user";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as User);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
```

- [ ] **Step 5: Layout główny i ekran logowania**

`mobile/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { SessionProvider } from "../src/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" options={{ headerShown: true, title: "Rejestracja firmy" }} />
      </Stack>
    </SessionProvider>
  );
}
```

`mobile/app/index.tsx`:

```tsx
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, type User } from "../src/api";
import { useSession } from "../src/session";

export default function LoginScreen() {
  const { user, loading, login } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) {
    return <Redirect href={user.role === "CLIENT" ? "/client/(tabs)/orders" : "/contractor/(tabs)/orders"} />;
  }

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const logged = await api<User>("/auth/login", { method: "POST", body: { email } });
      await login(logged);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "Nie znaleziono konta dla tego adresu e-mail."
          : "Błąd logowania. Sprawdź połączenie z serwerem.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fotowolt</Text>
      <Text style={styles.subtitle}>Zaloguj się adresem e-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="adres@email.pl"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Logowanie..." : "Zaloguj się"}</Text>
      </Pressable>
      <Link href="/register" style={styles.link}>
        Nie masz konta? Zarejestruj firmę wykonawczą
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c00" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#1a7a3a", marginTop: 8 },
});
```

Utwórz też pusty placeholder `mobile/app/register.tsx` (pełna implementacja w Task 12):

```tsx
import { Text, View } from "react-native";

export default function RegisterScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Rejestracja — wkrótce</Text>
    </View>
  );
}
```

- [ ] **Step 6: Testy i typecheck zielone**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npx vitest run && npm run typecheck`
Expected: PASS.

(Uwaga: jeśli szablon Expo ma włączone typed routes — `"experiments": { "typedRoutes": true }` w `mobile/app.json` — typecheck będzie failował na `href` do tras, które powstaną dopiero w Taskach 11–14. W takim wypadku usuń wpis `"typedRoutes": true` z `app.json` na czas PoC i uruchom typecheck ponownie.)

- [ ] **Step 7: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: aplikacja Expo — sesja, klient API i ekran logowania"
```

---

### Task 12: Rejestracja zleceniobiorcy (mobile) + VoivodeshipPicker

**Files:**
- Create: `mobile/src/components/VoivodeshipPicker.tsx`
- Modify: `mobile/app/register.tsx` (zastąp placeholder)

**Interfaces:**
- Consumes: `api`, `ApiError`, `VOIVODESHIPS`, `toggleVoivodeship` z Task 11; endpoint `POST /contractors/register` z Task 4.
- Produces: `VoivodeshipPicker({ selected: string[]; onChange: (next: string[]) => void; single?: boolean })` — komponent wielokrotnego użytku (Taski 13 i 15 też go używają; `single: true` = wybór dokładnie jednego województwa).

- [ ] **Step 1: Komponent pickera**

`mobile/src/components/VoivodeshipPicker.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { VOIVODESHIPS, toggleVoivodeship } from "../voivodeships";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
};

export function VoivodeshipPicker({ selected, onChange, single = false }: Props) {
  return (
    <View style={styles.list}>
      {VOIVODESHIPS.map((code) => {
        const isSelected = selected.includes(code);
        return (
          <Pressable
            key={code}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => onChange(single ? [code] : toggleVoivodeship(selected, code))}
          >
            <Text style={styles.rowText}>
              {isSelected ? "☑" : "☐"} {code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { padding: 10, borderRadius: 6, backgroundColor: "#f2f2f2" },
  rowSelected: { backgroundColor: "#d9f0e0" },
  rowText: { fontSize: 15 },
});
```

- [ ] **Step 2: Ekran rejestracji**

Zastąp całość `mobile/app/register.tsx`:

```tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { api, ApiError, type User } from "../src/api";
import { VoivodeshipPicker } from "../src/components/VoivodeshipPicker";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [voivodeships, setVoivodeships] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !companyName || !contactName || !phone) {
      setError("Wypełnij wszystkie pola.");
      return;
    }
    if (voivodeships.length === 0) {
      setError("Zaznacz co najmniej jedno województwo — obszar działania jest wymagany.");
      return;
    }
    setBusy(true);
    try {
      await api<User>("/contractors/register", {
        method: "POST",
        body: { email, companyName, contactName, phone, voivodeships },
      });
      Alert.alert(
        "Zgłoszenie wysłane",
        "Twoje zgłoszenie czeka na akceptację zleceniodawcy. Po akceptacji zaloguj się tym adresem e-mail.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "Ten adres e-mail jest już zarejestrowany."
          : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Adres e-mail</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Nazwa firmy</Text>
      <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} />
      <Text style={styles.label}>Osoba kontaktowa</Text>
      <TextInput style={styles.input} value={contactName} onChangeText={setContactName} />
      <Text style={styles.label}>Telefon</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Obszar działania (województwa)</Text>
      <VoivodeshipPicker selected={voivodeships} onChange={setVoivodeships} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Wysyłanie..." : "Wyślij zgłoszenie"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c00", marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

- [ ] **Step 3: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: ekran rejestracji zleceniobiorcy z wyborem województw"
```

---

### Task 13: Zleceniodawca — lista zleceń i formularz nowego zlecenia

**Files:**
- Create: `mobile/app/client/_layout.tsx`, `mobile/app/client/(tabs)/_layout.tsx`, `mobile/app/client/(tabs)/orders.tsx`, `mobile/app/client/(tabs)/new-order.tsx`, `mobile/app/client/(tabs)/contractors.tsx` (placeholder — pełna wersja w Task 15)

**Interfaces:**
- Consumes: `useSession`, `api`, typy `Order` z Task 11; `VoivodeshipPicker` z Task 12; endpointy `GET /orders`, `POST /orders` z Task 6.
- Produces: nawigacja `/client/(tabs)/orders`, `/client/(tabs)/new-order`, `/client/(tabs)/contractors`; wiersz listy zleceń linkuje do `/client/order/[id]` (ekran powstaje w Task 14).

- [ ] **Step 1: Layouty z guardem roli**

`mobile/app/client/_layout.tsx`:

```tsx
import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";

export default function ClientLayout() {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user || user.role !== "CLIENT") return <Redirect href="/" />;
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: "Szczegóły zlecenia" }} />
      <Stack.Screen name="contractor/[id]" options={{ title: "Wykonawca" }} />
    </Stack>
  );
}
```

`mobile/app/client/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";

export default function ClientTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="new-order" options={{ title: "Nowe zlecenie" }} />
      <Tabs.Screen name="contractors" options={{ title: "Wykonawcy" }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Lista zleceń**

`mobile/app/client/(tabs)/orders.tsx`:

```tsx
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type Order } from "../../../src/api";
import { useSession } from "../../../src/session";

export default function ClientOrdersScreen() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<Order[]>("/orders", { userId: user.id }).then(setOrders).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak zleceń. Dodaj pierwsze w zakładce „Nowe zlecenie”.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/client/order/${item.id}`)}>
            <Text style={styles.cardTitle}>
              {item.kw} kW — {item.voivodeship}
            </Text>
            <Text numberOfLines={1}>{item.description}</Text>
            <Text style={styles.cardMeta}>
              {item.status === "OPEN"
                ? `Otwarte · zgłoszenia: ${item.pendingBidCount ?? 0}`
                : "Wykonawca wybrany"}
            </Text>
          </Pressable>
        )}
      />
      <Pressable onPress={logout}>
        <Text style={styles.logout}>Wyloguj ({user?.email})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { color: "#1a7a3a", fontSize: 13 },
  logout: { textAlign: "center", color: "#c00", padding: 12 },
});
```

- [ ] **Step 3: Formularz nowego zlecenia**

`mobile/app/client/(tabs)/new-order.tsx`:

```tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { api, type Order } from "../../../src/api";
import { VoivodeshipPicker } from "../../../src/components/VoivodeshipPicker";
import { useSession } from "../../../src/session";

export default function NewOrderScreen() {
  const { user } = useSession();
  const router = useRouter();
  const [kw, setKw] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [voivodeship, setVoivodeship] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const kwNumber = Number(kw.replace(",", "."));
    if (!Number.isFinite(kwNumber) || kwNumber <= 0) {
      setError("Podaj wielkość zlecenia w kW (liczba większa od 0).");
      return;
    }
    if (!description.trim() || !address.trim() || voivodeship.length !== 1) {
      setError("Wypełnij opis, adres i zaznacz województwo.");
      return;
    }
    setBusy(true);
    try {
      await api<Order>("/orders", {
        method: "POST",
        userId: user!.id,
        body: { kw: kwNumber, description, address, voivodeship: voivodeship[0] },
      });
      setKw("");
      setDescription("");
      setAddress("");
      setVoivodeship([]);
      router.push("/client/(tabs)/orders");
    } catch {
      setError("Nie udało się dodać zlecenia.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Wielkość zlecenia (kW)</Text>
      <TextInput style={styles.input} value={kw} onChangeText={setKw} keyboardType="decimal-pad" placeholder="np. 9,9" />
      <Text style={styles.label}>Opis</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Adres</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="ulica, kod, miejscowość" />
      <Text style={styles.label}>Województwo</Text>
      <VoivodeshipPicker selected={voivodeship} onChange={setVoivodeship} single />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Dodawanie..." : "Dodaj zlecenie"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#c00", marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

- [ ] **Step 4: Placeholder zakładki wykonawców**

`mobile/app/client/(tabs)/contractors.tsx`:

```tsx
import { Text, View } from "react-native";

export default function ContractorsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Wykonawcy — wkrótce</Text>
    </View>
  );
}
```

- [ ] **Step 5: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: panel zleceniodawcy — lista zleceń i dodawanie zlecenia"
```

---

### Task 14: Zleceniodawca — szczegóły zlecenia: gotowości, odrzucenia, przycisk „Zleć”

**Files:**
- Create: `mobile/app/client/order/[id].tsx`

**Interfaces:**
- Consumes: `api`, typy `OrderDetailClient`, `BidForClient`, `DeclineForClient` z Task 11; endpointy `GET /orders/:id` (Task 6, z listami `bids` i `declines`) i `POST /bids/:id/accept` (Task 8).
- Produces: ekran `/client/order/[id]` używany przez listę z Task 13 — sekcja „Potwierdzili gotowość” z przyciskiem „Zleć” przy każdym oczekującym zgłoszeniu, pod nią sekcja „Odrzucili”.

- [ ] **Step 1: Implementacja ekranu**

`mobile/app/client/order/[id].tsx`:

```tsx
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type BidForClient, type OrderDetailClient } from "../../../src/api";
import { useSession } from "../../../src/session";

const BID_STATUS_LABEL: Record<string, string> = {
  PENDING: "Oczekuje",
  ACCEPTED: "Wybrany",
  REJECTED: "Odrzucony",
};

export default function ClientOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [order, setOrder] = useState<OrderDetailClient | null>(null);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<OrderDetailClient>(`/orders/${id}`, { userId: user.id }).then(setOrder).catch(() => {});
  }, [user, id]);

  useFocusEffect(useCallback(() => load(), [load]));

  const handleAccept = (bid: BidForClient) => {
    Alert.alert(
      "Przydzielenie zlecenia",
      `Zlecić realizację firmie ${bid.contractor.companyName}? Pozostałe zgłoszenia zostaną odrzucone, a wykonawca dostanie powiadomienie.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Zleć",
          onPress: async () => {
            try {
              await api(`/bids/${bid.id}/accept`, { method: "POST", userId: user!.id });
              load();
            } catch {
              Alert.alert("Błąd", "Nie udało się przydzielić zlecenia.");
            }
          },
        },
      ],
    );
  };

  if (!order) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {order.kw} kW — {order.voivodeship}
      </Text>
      <Text>{order.description}</Text>
      <Text style={styles.meta}>{order.address}</Text>
      <Text style={styles.meta}>
        Status: {order.status === "OPEN" ? "Otwarte" : "Wykonawca wybrany"}
      </Text>

      <Text style={styles.section}>Potwierdzili gotowość ({order.bids.length})</Text>
      {order.bids.length === 0 && <Text style={styles.empty}>Brak zgłoszeń gotowości.</Text>}
      {order.bids.map((bid) => (
        <View key={bid.id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>{bid.contractor.companyName}</Text>
          <Text>
            {bid.contractor.contactName} · {bid.contractor.phone}
          </Text>
          <Text style={styles.meta}>{bid.contractor.email}</Text>
          <Text style={styles.meta}>Status: {BID_STATUS_LABEL[bid.status]}</Text>
          {order.status === "OPEN" && bid.status === "PENDING" && (
            <Pressable style={styles.button} onPress={() => handleAccept(bid)}>
              <Text style={styles.buttonText}>Zleć</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Text style={styles.section}>Odrzucili ({order.declines.length})</Text>
      {order.declines.length === 0 && <Text style={styles.empty}>Nikt nie odrzucił zlecenia.</Text>}
      {order.declines.map((decline) => (
        <View key={decline.id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>{decline.contractor.companyName}</Text>
          <Text style={styles.meta}>
            {decline.contractor.contactName} · {decline.contractor.email}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  empty: { color: "#777" },
  bidCard: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, gap: 4, marginTop: 8 },
  bidTitle: { fontSize: 15, fontWeight: "600" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: szczegóły zlecenia — sekcje gotowości i odrzuceń, przycisk Zleć"
```

---

### Task 15: Zleceniodawca — zarządzanie wykonawcami

**Files:**
- Modify: `mobile/app/client/(tabs)/contractors.tsx` (zastąp placeholder)
- Create: `mobile/app/client/contractor/[id].tsx`

**Interfaces:**
- Consumes: `api`, typ `User` z Task 11; `VoivodeshipPicker` z Task 12; endpointy z Task 5 (`GET /contractors`, `POST /contractors/:id/approve|reject`, `PATCH /contractors/:id/voivodeships`).
- Produces: ekrany `/client/(tabs)/contractors` i `/client/contractor/[id]`.

- [ ] **Step 1: Lista wykonawców**

Zastąp całość `mobile/app/client/(tabs)/contractors.tsx`:

```tsx
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../../src/api";
import { useSession } from "../../../src/session";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Oczekuje na akceptację",
  APPROVED: "Zaakceptowany",
  REJECTED: "Odrzucony",
};

export default function ContractorsScreen() {
  const { user } = useSession();
  const router = useRouter();
  const [contractors, setContractors] = useState<User[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<User[]>("/contractors", { userId: user.id }).then(setContractors).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contractors}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak zarejestrowanych wykonawców.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/client/contractor/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.companyName}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={[styles.status, item.status === "PENDING" && styles.statusPending]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#666", fontSize: 13 },
  status: { fontSize: 13, color: "#1a7a3a" },
  statusPending: { color: "#b8860b" },
});
```

- [ ] **Step 2: Szczegóły wykonawcy (approve/reject + województwa)**

`mobile/app/client/contractor/[id].tsx`:

```tsx
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../../src/api";
import { VoivodeshipPicker } from "../../../src/components/VoivodeshipPicker";
import { useSession } from "../../../src/session";

export default function ContractorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [contractor, setContractor] = useState<User | null>(null);
  const [voivodeships, setVoivodeships] = useState<string[]>([]);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<User[]>("/contractors", { userId: user.id })
      .then((all) => {
        const found = all.find((c) => c.id === id) ?? null;
        setContractor(found);
        if (found) setVoivodeships(found.voivodeships);
      })
      .catch(() => {});
  }, [user, id]);

  useFocusEffect(useCallback(() => load(), [load]));

  const setStatus = async (action: "approve" | "reject") => {
    try {
      await api(`/contractors/${id}/${action}`, { method: "POST", userId: user!.id });
      load();
    } catch {
      Alert.alert("Błąd", "Nie udało się zmienić statusu.");
    }
  };

  const saveVoivodeships = async () => {
    if (voivodeships.length === 0) {
      Alert.alert("Błąd", "Wykonawca musi mieć co najmniej jedno województwo.");
      return;
    }
    try {
      await api(`/contractors/${id}/voivodeships`, {
        method: "PATCH",
        userId: user!.id,
        body: { voivodeships },
      });
      Alert.alert("Zapisano", "Obszar działania zaktualizowany.");
      load();
    } catch {
      Alert.alert("Błąd", "Nie udało się zapisać województw.");
    }
  };

  if (!contractor) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{contractor.companyName}</Text>
      <Text>
        {contractor.contactName} · {contractor.phone}
      </Text>
      <Text style={styles.meta}>{contractor.email}</Text>
      <Text style={styles.meta}>Status: {contractor.status}</Text>

      {contractor.status === "PENDING" && (
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={() => setStatus("approve")}>
            <Text style={styles.buttonText}>Zaakceptuj</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={() => setStatus("reject")}>
            <Text style={styles.buttonText}>Odrzuć</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.section}>Obszar działania</Text>
      <VoivodeshipPicker selected={voivodeships} onChange={setVoivodeships} />
      <Pressable style={styles.button} onPress={saveVoivodeships}>
        <Text style={styles.buttonText}>Zapisz województwa</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 12, alignItems: "center", flexGrow: 1, marginTop: 8 },
  buttonDanger: { backgroundColor: "#c0392b" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 3: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: zarządzanie wykonawcami — akceptacja zgłoszeń i edycja województw"
```

---

### Task 16: Zleceniobiorca — zlecenia, gotowość/odrzucenie, moje zgłoszenia

**Files:**
- Create: `mobile/app/contractor/_layout.tsx`, `mobile/app/contractor/(tabs)/_layout.tsx`, `mobile/app/contractor/(tabs)/orders.tsx`, `mobile/app/contractor/(tabs)/my-bids.tsx`, `mobile/app/contractor/order/[id].tsx`

**Interfaces:**
- Consumes: `useSession`, `api`, typy `Order`, `OrderDetailContractor`, `MyBid` z Task 11; endpointy `GET /orders`, `GET /orders/:id` (Task 6), `POST /orders/:id/bids`, `POST /orders/:id/decline`, `GET /bids/mine` (Task 7), `GET /auth/me` (Task 3 — odświeżenie statusu konta PENDING).
- Produces: nawigacja `/contractor/(tabs)/orders`, `/contractor/(tabs)/my-bids`, `/contractor/order/[id]`.

- [ ] **Step 1: Layout z guardem i ekranem oczekiwania**

`mobile/app/contractor/_layout.tsx`:

```tsx
import { Redirect, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../src/api";
import { useSession } from "../../src/session";

export default function ContractorLayout() {
  const { user, loading, login, logout } = useSession();
  if (loading) return null;
  if (!user || user.role !== "CONTRACTOR") return <Redirect href="/" />;

  if (user.status !== "APPROVED") {
    const refresh = async () => {
      try {
        const fresh = await api<User>("/auth/me", { userId: user.id });
        await login(fresh);
      } catch {
        // ignore — user can retry
      }
    };
    return (
      <View style={styles.pending}>
        <Text style={styles.pendingTitle}>
          {user.status === "PENDING"
            ? "Twoje zgłoszenie czeka na akceptację zleceniodawcy."
            : "Twoje zgłoszenie zostało odrzucone."}
        </Text>
        {user.status === "PENDING" && (
          <Pressable style={styles.button} onPress={refresh}>
            <Text style={styles.buttonText}>Sprawdź ponownie</Text>
          </Pressable>
        )}
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Wyloguj</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: "Szczegóły zlecenia" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  pending: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  pendingTitle: { fontSize: 16, textAlign: "center" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 12, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
  logout: { color: "#c00" },
});
```

`mobile/app/contractor/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";

export default function ContractorTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="my-bids" options={{ title: "Moje zgłoszenia" }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Lista dostępnych zleceń**

`mobile/app/contractor/(tabs)/orders.tsx`:

```tsx
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type Order } from "../../../src/api";
import { useSession } from "../../../src/session";

export default function ContractorOrdersScreen() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<Order[]>("/orders", { userId: user.id }).then(setOrders).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Brak nowych zleceń w Twoim obszarze działania.</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/contractor/order/${item.id}`)}>
            <Text style={styles.cardTitle}>
              {item.kw} kW — {item.voivodeship}
            </Text>
            <Text numberOfLines={1}>{item.description}</Text>
            <Text style={styles.meta}>{item.address}</Text>
          </Pressable>
        )}
      />
      <Pressable onPress={logout}>
        <Text style={styles.logout}>Wyloguj ({user?.email})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#666", fontSize: 13 },
  logout: { textAlign: "center", color: "#c00", padding: 12 },
});
```

- [ ] **Step 3: Szczegóły zlecenia z akcjami**

`mobile/app/contractor/order/[id].tsx`:

```tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type OrderDetailContractor } from "../../../src/api";
import { useSession } from "../../../src/session";

export default function ContractorOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailContractor | null>(null);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<OrderDetailContractor>(`/orders/${id}`, { userId: user.id }).then(setOrder).catch(() => {});
  }, [user, id]);

  useFocusEffect(useCallback(() => load(), [load]));

  const handleBid = async () => {
    try {
      await api(`/orders/${id}/bids`, { method: "POST", userId: user!.id });
      Alert.alert("Wysłano", "Zgłoszono gotowość realizacji zlecenia.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Błąd", "Nie udało się zgłosić gotowości.");
    }
  };

  const handleDecline = async () => {
    try {
      await api(`/orders/${id}/decline`, { method: "POST", userId: user!.id });
      router.back();
    } catch {
      Alert.alert("Błąd", "Nie udało się odrzucić zlecenia.");
    }
  };

  if (!order) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {order.kw} kW — {order.voivodeship}
      </Text>
      <Text>{order.description}</Text>
      <Text style={styles.meta}>{order.address}</Text>

      {order.myBid ? (
        <Text style={styles.info}>
          {order.myBid.status === "PENDING" && "Zgłosiłeś gotowość — czekaj na decyzję zleceniodawcy."}
          {order.myBid.status === "ACCEPTED" && "Gratulacje! Zostałeś wybrany do realizacji tego zlecenia."}
          {order.myBid.status === "REJECTED" && "Zleceniodawca wybrał innego wykonawcę."}
        </Text>
      ) : order.status === "OPEN" ? (
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={handleBid}>
            <Text style={styles.buttonText}>Zgłoś gotowość</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleDecline}>
            <Text style={styles.buttonText}>Odrzuć</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.info}>Zlecenie nie jest już dostępne.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  info: { marginTop: 16, fontSize: 15, color: "#1a7a3a" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", flexGrow: 1 },
  buttonDanger: { backgroundColor: "#c0392b" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 4: Moje zgłoszenia**

`mobile/app/contractor/(tabs)/my-bids.tsx`:

```tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api, type MyBid } from "../../../src/api";
import { useSession } from "../../../src/session";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Oczekuje na decyzję",
  ACCEPTED: "Wybrano Cię do realizacji",
  REJECTED: "Wybrano innego wykonawcę",
};

export default function MyBidsScreen() {
  const { user } = useSession();
  const [bids, setBids] = useState<MyBid[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<MyBid[]>("/bids/mine", { userId: user.id }).then(setBids).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bids}
        keyExtractor={(b) => b.id}
        ListEmptyComponent={<Text style={styles.empty}>Nie zgłosiłeś jeszcze żadnej gotowości.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.order.kw} kW — {item.order.voivodeship}
            </Text>
            <Text numberOfLines={1}>{item.order.description}</Text>
            <Text
              style={[
                styles.status,
                item.status === "ACCEPTED" && styles.statusAccepted,
                item.status === "REJECTED" && styles.statusRejected,
              ]}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  status: { fontSize: 13, color: "#b8860b" },
  statusAccepted: { color: "#1a7a3a" },
  statusRejected: { color: "#c0392b" },
});
```

- [ ] **Step 5: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: panel zleceniobiorcy — zlecenia, gotowość/odrzucenie, moje zgłoszenia"
```

---

### Task 17: Powiadomienia w aplikacji (obie role)

**Files:**
- Create: `mobile/src/components/NotificationList.tsx`, `mobile/app/client/(tabs)/notifications.tsx`, `mobile/app/contractor/(tabs)/notifications.tsx`
- Modify: `mobile/app/client/(tabs)/_layout.tsx` (z Task 13), `mobile/app/contractor/(tabs)/_layout.tsx` (z Task 16)

**Interfaces:**
- Consumes: `api`, typ `AppNotification` z Task 11; `useSession` z Task 11; endpoint `GET /notifications` z Task 9.
- Produces: zakładka „Powiadomienia” w obu rolach, współdzielony komponent `NotificationList()` (bez propsów — sam pobiera dane bieżącego użytkownika).

- [ ] **Step 1: Współdzielony komponent listy**

`mobile/src/components/NotificationList.tsx`:

```tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api, type AppNotification } from "../api";
import { useSession } from "../session";

export function NotificationList() {
  const { user } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<AppNotification[]>("/notifications", { userId: user.id })
        .then(setItems)
        .catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak powiadomień.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.message}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("pl-PL")}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  meta: { color: "#666", fontSize: 12 },
});
```

- [ ] **Step 2: Ekrany-wrappery**

`mobile/app/client/(tabs)/notifications.tsx`:

```tsx
import { NotificationList } from "../../../src/components/NotificationList";

export default function ClientNotificationsScreen() {
  return <NotificationList />;
}
```

`mobile/app/contractor/(tabs)/notifications.tsx`:

```tsx
import { NotificationList } from "../../../src/components/NotificationList";

export default function ContractorNotificationsScreen() {
  return <NotificationList />;
}
```

- [ ] **Step 3: Dodaj zakładki w layoutach**

W `mobile/app/client/(tabs)/_layout.tsx` dodaj jako ostatni ekran w `<Tabs>`:

```tsx
      <Tabs.Screen name="notifications" options={{ title: "Powiadomienia" }} />
```

W `mobile/app/contractor/(tabs)/_layout.tsx` dodaj jako ostatni ekran w `<Tabs>`:

```tsx
      <Tabs.Screen name="notifications" options={{ title: "Powiadomienia" }} />
```

- [ ] **Step 4: Weryfikacja**

Run: `cd /Users/pibe/dev/fotowolt/mobile && npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "feat: zakładka Powiadomienia dla obu ról"
```

---

### Task 18: README + smoke test całego przepływu

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: wszystko z Tasków 1–17.

- [ ] **Step 1: README**

`README.md` (w korzeniu repo):

```markdown
# Fotowolt — PoC

Aplikacja mobilna (PoC) łącząca zleceniodawcę instalacji PV z firmami wykonawczymi.

## Uruchomienie

Terminal 1 — API:

    cd server
    npm install
    npx prisma db push
    npm run db:seed
    npm run dev          # http://localhost:4000

Terminal 2 — aplikacja mobilna:

    cd mobile
    npm install
    npx expo start       # zeskanuj QR w Expo Go albo wciśnij i (iOS sim) / a (Android)

Na fizycznym telefonie `localhost` nie zadziała — ustaw adres IP komputera w sieci lokalnej:

    EXPO_PUBLIC_API_URL=http://<IP-komputera>:4000 npx expo start

## Konta

- Zleceniodawca (seed): `biuro@fotowolt.pl`
- Zleceniobiorcy rejestrują się w aplikacji („Zarejestruj firmę wykonawczą”); konto wymaga
  akceptacji zleceniodawcy (zakładka „Wykonawcy”).

## Scenariusz demo

1. Zaloguj się jako `biuro@fotowolt.pl`, dodaj zlecenie (kW, opis, adres, województwo).
2. Wyloguj, zarejestruj firmę wykonawczą z tym samym województwem, spróbuj się zalogować —
   zobaczysz ekran oczekiwania.
3. Zaloguj się jako zleceniodawca, zaakceptuj firmę w zakładce „Wykonawcy”.
4. Zaloguj się jako firma — powiadomienie o nowym zleceniu w zakładce „Powiadomienia”,
   zlecenie widoczne na liście; otwórz i „Zgłoś gotowość”.
5. Jako zleceniodawca: powiadomienie o gotowości, w szczegółach zlecenia sekcje
   „Potwierdzili gotowość” / „Odrzucili”; wciśnij „Zleć” przy wybranej firmie.
6. Jako firma sprawdź „Moje zgłoszenia” (status „Wybrano Cię do realizacji”)
   oraz „Powiadomienia” (wpis o przydzieleniu zlecenia).

Uwaga: jeśli wykonawca nie zareaguje na zlecenie w ciągu 3 dni od publikacji,
system odrzuci je za niego automatycznie i powiadomi zleceniodawcę.

## Testy

    cd server && npm test
    cd mobile && npm test
```

- [ ] **Step 2: Pełny smoke test API (skrypt curl)**

Uruchom serwer (`cd server && npm run dev` w tle), potem wykonaj i sprawdź odpowiedzi:

```bash
# 1. Login zleceniodawcy
CLIENT_ID=$(curl -s -X POST localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"biuro@fotowolt.pl"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 2. Rejestracja wykonawcy
CONTRACTOR_ID=$(curl -s -X POST localhost:4000/contractors/register -H 'Content-Type: application/json' \
  -d '{"email":"demo@solar.pl","companyName":"Demo Solar","contactName":"Jan Demo","phone":"600700800","voivodeships":["mazowieckie"]}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 3. Akceptacja wykonawcy
curl -s -X POST localhost:4000/contractors/$CONTRACTOR_ID/approve -H "x-user-id: $CLIENT_ID"

# 4. Nowe zlecenie
ORDER_ID=$(curl -s -X POST localhost:4000/orders -H 'Content-Type: application/json' -H "x-user-id: $CLIENT_ID" \
  -d '{"kw":9.9,"description":"Dach skośny","address":"Warszawa","voivodeship":"mazowieckie"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 5. Wykonawca widzi zlecenie i zgłasza gotowość
curl -s localhost:4000/orders -H "x-user-id: $CONTRACTOR_ID"
BID_ID=$(curl -s -X POST localhost:4000/orders/$ORDER_ID/bids -H "x-user-id: $CONTRACTOR_ID" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 6. Zleceniodawca akceptuje gotowość
curl -s -X POST localhost:4000/bids/$BID_ID/accept -H "x-user-id: $CLIENT_ID"

# 7. Weryfikacja: zlecenie ASSIGNED, bid ACCEPTED
curl -s localhost:4000/orders/$ORDER_ID -H "x-user-id: $CLIENT_ID"

# 8. Powiadomienia systemowe obu stron
curl -s localhost:4000/notifications -H "x-user-id: $CONTRACTOR_ID"
curl -s localhost:4000/notifications -H "x-user-id: $CLIENT_ID"
```

Expected: krok 7 zwraca `"status":"ASSIGNED"` i bid ze statusem `"ACCEPTED"`; w kroku 8 wykonawca ma powiadomienia `NEW_ORDER` i `ORDER_ASSIGNED`, a zleceniodawca `BID_SUBMITTED`.

- [ ] **Step 3: Smoke test UI**

Uruchom `cd mobile && npx expo start` i przejdź scenariusz demo z README (punkty 1–6) na symulatorze lub w Expo Go. Expected: wszystkie kroki przechodzą bez błędów.

- [ ] **Step 4: Commit**

```bash
cd /Users/pibe/dev/fotowolt
git add -A
git commit -m "docs: README z instrukcją uruchomienia i scenariuszem demo"
```

---

## Poza zakresem PoC (świadomie pominięte)

- Prawdziwe uwierzytelnianie (hasła/tokeny) — tożsamość przez nagłówek `x-user-id`.
- Powiadomienia push — system tworzy powiadomienia w aplikacji (zakładka „Powiadomienia”), bez push.
- Cron/scheduler dla auto-odrzucenia — realizowane leniwym sweepem na początku odczytów `GET /orders` i `GET /orders/:id`.
- Geokodowanie adresu — województwo zlecenia wybierane ręcznie przez zleceniodawcę.
- Edycja/usuwanie zleceń, wielu zleceniodawców, paginacja, i18n, oznaczanie powiadomień jako przeczytane.
