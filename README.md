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

Serwer korzysta z Prisma 7 z adapterem `@prisma/adapter-better-sqlite3`, skonfigurowanym w
`server/prisma.config.ts`. Adres bazy ustawiany jest przez `DATABASE_URL`:

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

1. Zaloguj się jako `biuro@fotowolt.pl`, w zakładce „Nowe zlecenie” dodaj zlecenie
   (kW, opis, adres, województwo).
2. Wyloguj się, zarejestruj firmę wykonawczą z tym samym województwem, spróbuj się zalogować —
   ponieważ zgłoszenie czeka na akceptację, zobaczysz ekran oczekiwania
   „Twoje zgłoszenie czeka na akceptację zleceniodawcy” (z przyciskiem „Sprawdź ponownie”).
3. Zaloguj się jako zleceniodawca, w zakładce „Wykonawcy” otwórz nowo zarejestrowaną firmę
   i wciśnij „Zaakceptuj”.
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
