export type HelpSection = { title: string; body: string[] };

export const CLIENT_HELP: HelpSection[] = [
  {
    title: "1. Zaakceptuj firmę wykonawczą",
    body: [
      "Firmy zgłaszają się same, ale nie widzą żadnych zleceń, dopóki ich nie zaakceptujesz.",
      "Wejdź w zakładkę „Wykonawcy”, dotknij firmy ze statusem „Oczekuje na akceptację” i naciśnij „Zaakceptuj” albo „Odrzuć”.",
      "Na tym samym ekranie możesz zaznaczać i odznaczać województwa, w których firma pracuje, a potem nacisnąć „Zapisz województwa”. Firma musi mieć co najmniej jedno województwo.",
    ],
  },
  {
    title: "2. Dodaj zlecenie",
    body: [
      "W zakładce „Nowe zlecenie” podaj wielkość instalacji w kW (przecinek jest w porządku, np. 12,5), opis i adres.",
      "Zaznacz jedno województwo — to ono decyduje, które firmy zobaczą zlecenie.",
      "Naciśnij „Dodaj zlecenie”. Powiadomienie trafi od razu do wszystkich zaakceptowanych firm działających w tym województwie.",
    ],
  },
  {
    title: "3. Wybierz wykonawcę",
    body: [
      "W zakładce „Zlecenia” przy każdym zleceniu widzisz liczbę zgłoszeń, np. „Otwarte · zgłoszenia: 3”.",
      "Dotknij zlecenia. Zobaczysz sekcję „Potwierdzili gotowość” z danymi kontaktowymi firm, a pod nią „Odrzucili”.",
      "Przy wybranej firmie naciśnij „Zleć” i potwierdź. Firma dostanie powiadomienie, pozostałe zgłoszenia zostaną odrzucone.",
      "Uwaga: tej decyzji nie da się cofnąć — zlecenie można przydzielić tylko raz.",
    ],
  },
  {
    title: "Dobrze wiedzieć",
    body: [
      "Powiadomienie o zleceniu dostają tylko firmy zaakceptowane w chwili jego publikacji. Firma zaakceptowana później zobaczy zlecenie na liście, ale bez powiadomienia.",
      "Jeśli firma nie zareaguje na zlecenie w ciągu 3 dni, system odrzuci je za nią automatycznie i Cię o tym powiadomi.",
      "Zakładka „Powiadomienia” pokazuje wszystko, co dzieje się w Twoich zleceniach.",
    ],
  },
];

export const CONTRACTOR_HELP: HelpSection[] = [
  {
    title: "1. Zarejestruj firmę",
    body: [
      "Na ekranie logowania naciśnij „Nie masz konta? Zarejestruj firmę wykonawczą”.",
      "Podaj adres e-mail, nazwę firmy, osobę kontaktową i telefon.",
      "Zaznacz województwa, w których pracujesz — co najmniej jedno. To one decydują, jakie zlecenia będziesz dostawać.",
      "Naciśnij „Wyślij zgłoszenie”.",
    ],
  },
  {
    title: "2. Poczekaj na akceptację",
    body: [
      "Zaloguj się swoim adresem e-mail. Dopóki zleceniodawca nie zaakceptuje firmy, zobaczysz ekran oczekiwania.",
      "Przyciskiem „Sprawdź ponownie” odświeżysz status bez wylogowywania.",
    ],
  },
  {
    title: "3. Odpowiedz na zlecenie",
    body: [
      "W zakładce „Zlecenia” widzisz zlecenia z Twoich województw, na które jeszcze nie odpowiedziałeś. O każdym nowym dostajesz powiadomienie.",
      "Dotknij zlecenia, żeby zobaczyć wielkość instalacji, opis i adres.",
      "Naciśnij „Zgłoś gotowość” albo „Odrzuć”. Po każdej z tych akcji zlecenie znika z listy.",
      "Uwaga na termin: brak reakcji przez 3 dni od publikacji oznacza automatyczne odrzucenie zlecenia.",
    ],
  },
  {
    title: "4. Sprawdź wynik",
    body: [
      "Zakładka „Moje zgłoszenia” pokazuje status każdej zgłoszonej gotowości:",
      "• „Oczekuje na decyzję” — zleceniodawca jeszcze nie wybrał wykonawcy.",
      "• „Wybrano Cię do realizacji” — zlecenie jest Twoje.",
      "• „Wybrano innego wykonawcę” — zlecenie trafiło do innej firmy.",
      "O przydzieleniu zlecenia dowiesz się także z zakładki „Powiadomienia”.",
    ],
  },
];
