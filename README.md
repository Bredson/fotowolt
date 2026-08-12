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

### Baza danych

Serwer korzysta z Prisma 7 z adapterem `@prisma/adapter-libsql`. Ten sam adapter obsługuje
lokalny plik SQLite (adres `file:`) i zdalną bazę Turso (adres `libsql://`), więc kod jest
identyczny w obu środowiskach. Adres bazy ustawiany jest przez `DATABASE_URL`:

- środowisko deweloperskie: `server/.env` wskazuje na `file:./prisma/dev.db`
  (plik `server/prisma/dev.db`),
- testy: skrypt `test` w `server/package.json` ustawia `DATABASE_URL=file:./test.db`
  inline, więc testy działają na osobnym pliku `server/test.db` i nie ruszają bazy deweloperskiej.

`npx prisma db push` zakłada/aktualizuje schemat w bazie wskazanej przez `DATABASE_URL`
z `server/.env`.

## Konta

- Zleceniodawca (seed): `biuro@fotowolt.pl`
- Zleceniobiorcy rejestrują się w aplikacji („Nie masz konta? Zarejestruj firmę wykonawczą” na
  ekranie logowania); konto wymaga akceptacji zleceniodawcy (zakładka „Wykonawcy” →
  szczegóły firmy → „Zaakceptuj”).

## Scenariusz demo

**Kolejność kroków ma znaczenie.** Powiadomienie o nowym zleceniu trafia tylko do firm, które
są już zaakceptowane w momencie jego publikacji. Jeśli najpierw dodasz zlecenie, a dopiero
potem zaakceptujesz firmę, firma zobaczy zlecenie na liście, ale **nie dostanie o nim
powiadomienia**. Dlatego w scenariuszu demo firma rejestruje się i jest akceptowana najpierw.

1. Zarejestruj firmę wykonawczą („Nie masz konta? Zarejestruj firmę wykonawczą”), podaj dane
   i zaznacz województwo. Spróbuj się zalogować — ponieważ zgłoszenie czeka na akceptację,
   zobaczysz ekran oczekiwania „Twoje zgłoszenie czeka na akceptację zleceniodawcy”
   (z przyciskiem „Sprawdź ponownie”).
2. Zaloguj się jako `biuro@fotowolt.pl`, w zakładce „Wykonawcy” otwórz nowo zarejestrowaną
   firmę i wciśnij „Zaakceptuj”.
3. Wciąż jako zleceniodawca, w zakładce „Nowe zlecenie” dodaj zlecenie (kW, opis, adres,
   województwo — to samo, które zaznaczyła firma).
4. Zaloguj się jako firma — w zakładce „Powiadomienia” pojawi się powiadomienie o nowym
   zleceniu, samo zlecenie widoczne jest na liście w zakładce „Zlecenia”; otwórz je i wciśnij
   „Zgłoś gotowość” (albo „Odrzuć”, jeśli firma nie jest zainteresowana).
5. Jako zleceniodawca: w „Powiadomieniach” pojawi się wpis o zgłoszeniu gotowości, a w
   szczegółach zlecenia — sekcje „Potwierdzili gotowość” / „Odrzucili”; przy wybranej firmie
   wciśnij „Zleć” (po potwierdzeniu w oknie dialogowym pozostałe zgłoszenia zostają odrzucone).
6. Jako firma sprawdź zakładkę „Moje zgłoszenia” (status zmienia się na „Wybrano Cię do
   realizacji”) oraz „Powiadomienia” (wpis o przydzieleniu zlecenia).

Uwaga: jeśli zaakceptowany wykonawca nie zgłosi gotowości ani nie odrzuci zlecenia w ciągu
3 dni od jego publikacji, system odrzuci je za niego automatycznie i powiadomi zleceniodawcę
(powiadomienie typu „wykonawca nie podjął zlecenia w ciągu 3 dni”). Nie ma osobnego crona —
sweep uruchamia się przy każdym odczycie listy zleceń (`GET /orders`) lub szczegółów zlecenia
(`GET /orders/:id`).

## Testy

    cd server && npm test        # prisma db push na server/test.db + vitest run
    cd mobile && npm run typecheck && npm test

## Wdrożenie publiczne (Vercel + Turso)

Aplikacja działa też jako strona web — ta sama baza kodu, bez Expo Go i bez sklepów.
Tester otwiera link w dowolnej przeglądarce.

### 1. Baza w Turso

Prisma CLI **nie obsługuje** adresów `libsql://` (błąd P1013), więc `prisma db push` nie
założy tabel w Turso. Służy do tego `npm run db:setup-remote`: generuje SQL z tego samego
`prisma/schema.prisma` i wykonuje go klientem libSQL. Skrypt jest idempotentny — pomija
obiekty, które już istnieją.

    cd server
    DATABASE_URL="libsql://<twoja-baza>.turso.io" TURSO_AUTH_TOKEN="<token>" npm run db:setup-remote
    DATABASE_URL="libsql://<twoja-baza>.turso.io" TURSO_AUTH_TOKEN="<token>" npm run db:seed

### 2. API na Vercelu

Osobny projekt Vercel z katalogiem głównym **`server`**. Konfiguracja jest w
`server/vercel.json`, a `server/api/index.ts` eksportuje aplikację Express jako funkcję
serverless (`src/index.ts` pozostaje wejściem lokalnym i nie jest używany na Vercelu).

Zmienne środowiskowe do ustawienia w panelu Vercela:

- `DATABASE_URL` — `libsql://<twoja-baza>.turso.io`
- `TURSO_AUTH_TOKEN` — token z Turso

Turso komunikuje się po HTTP, więc nie wymaga puli połączeń — to dobrze pasuje do funkcji
serverless, gdzie każde wywołanie może otworzyć własne połączenie.

### 3. Front na Vercelu

Drugi projekt Vercel z katalogiem głównym **`mobile`**. Konfiguracja w `mobile/vercel.json`
buduje statyczny eksport (`npx expo export --platform web`) do katalogu `dist` i dodaje
przekierowanie zwrotne wszystkich ścieżek na `index.html`. To przekierowanie jest konieczne:
bez niego wejście wprost pod adres dynamiczny (np. `/client/order/<id>`) albo odświeżenie
takiej strony kończy się błędem 404.

Zmienna środowiskowa:

- `EXPO_PUBLIC_API_URL` — publiczny adres API z punktu 2

Uwaga: `EXPO_PUBLIC_*` jest **wkompilowywane w paczkę podczas budowania**, a nie czytane przy
starcie. Zmiana adresu API wymaga ponownego zbudowania frontu.

### Bezpieczeństwo — przeczytaj przed udostępnieniem

PoC **nie ma uwierzytelniania**: logowanie polega na podaniu samego adresu e-mail, a tożsamość
w kolejnych żądaniach to nagłówek `x-user-id`. Po wystawieniu publicznie **każdy, kto zna
adres, może zalogować się jako zleceniodawca i działać jako dowolny użytkownik**. CORS jest
otwarty na wszystkie domeny. Nie umieszczaj tam żadnych prawdziwych danych klientów ani firm
i nie publikuj adresu szerzej, niż to konieczne.
