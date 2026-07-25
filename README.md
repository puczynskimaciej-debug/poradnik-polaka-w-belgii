# Polacy w Belgii

Wielojęzyczny serwis Eleventy z własnym statycznym panelem CMS. Treści pozostają w repozytorium GitHub, a każdy zapis z panelu tworzy commit uruchamiający automatyczny build Netlify.

## Architektura

- Eleventy generuje publiczną stronę do `_site/`.
- Artykuły są plikami Markdown w `src/content/articles/`.
- Strona główna jest przechowywana w `src/_data/home.json`.
- Kontakt i SEO są przechowywane w `src/_data/site.json`.
- Obrazy trafiają do `src/Images/uploads/`.
- Panel w `admin-app/` jest statyczną aplikacją ES Modules.
- Operacje CMS wykonuje przeglądarka bezpośrednio przez GitHub Contents API.
- Jedyna Netlify Function wymienia jednorazowy kod OAuth na token GitHub.
- Nie ma bazy danych, VPS-a, własnego API treści ani Node.js działającego jako stały serwer.

Token GitHub jest przechowywany w `sessionStorage` i znika po zamknięciu karty. Panel przed załadowaniem treści sprawdza, czy konto ma uprawnienie `push` do skonfigurowanego repozytorium.

Panel korzysta również z natywnych ról repozytorium:

- `push` — edytor, który zarządza artykułami, stronami, SEO i mediami,
- `admin` — administrator, który dodatkowo zaprasza i usuwa użytkowników oraz zmienia ich role.

Administrator może zarządzać collaboratorami bezpośrednio z CMS. GitHub pozostaje jedynym źródłem kont i uprawnień. Panel zawiera też lokalny podgląd artykułu przed zapisem oraz historię commitów z autorem, datą i odnośnikiem do pełnej zmiany.

## Moduły CMS

- `admin-app/config.js` — repozytorium, gałąź i ścieżki treści,
- `admin-app/modules/auth.js` — GitHub OAuth i sesja przeglądarkowa,
- `admin-app/modules/github-api.js` — niewyspecjalizowany klient GitHub Contents API,
- `admin-app/modules/frontmatter.js` — odczyt i zapis Markdown front matter,
- `admin-app/modules/repository.js` — operacje na artykułach, JSON-ie i mediach,
- `admin-app/app.js` — interfejs konkretnego projektu.

Pierwsze cztery elementy można ponownie wykorzystać w kolejnych projektach, zmieniając głównie `config.js` i warstwę interfejsu.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Publiczna strona działa pod adresem wyświetlonym przez Eleventy. Pełne logowanie OAuth wymaga środowiska Netlify albo lokalnego `netlify dev`, ponieważ callback korzysta z Netlify Function.

## Test responsywności

Automatyczny audyt uruchamia publiczną stronę i CMS w lokalnym Edge/Chrome dla pięciu viewportów: 360×740, 390×844, 768×1024, 1024×768 oraz 1440×900.

```bash
npm run dev -- --port=8088
npm run test:responsive
```

Test sprawdza poziomy overflow, elementy interaktywne poza ekranem, mobilne menu, wszystkie sekcje CMS oraz dialog edycji artykułu, podglądu i użytkownika. Ścieżkę przeglądarki można zmienić przez zmienną `BROWSER_PATH`.

## Konfiguracja GitHub OAuth

1. Na GitHub przejdź do **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Ustaw:
   - Application name: `Polacy w Belgii CMS`
   - Homepage URL: `https://polacywbelgii.eu`
   - Authorization callback URL: `https://polacywbelgii.eu/admin/`
3. Skopiuj Client ID do `admin-app/config.js`, zastępując `UZUPELNIJ_GITHUB_CLIENT_ID`.
4. W Netlify ustaw zmienne środowiskowe:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
5. Nie zapisuj Client Secret w repozytorium ani w kodzie przeglądarkowym.

Repozytorium jest obecnie publiczne, dlatego panel żąda zakresu `public_repo`. Jeżeli stanie się prywatne, zmień `scope` w `admin-app/config.js` na `repo`.

## Konfiguracja Netlify

1. Zaimportuj repozytorium `puczynskimaciej-debug/poradnik-polaka-w-belgii`.
2. Netlify odczyta ustawienia z `netlify.toml`:
   - build: `npm run build`
   - publish: `_site`
   - functions: `netlify/functions`
3. Dodaj zmienne OAuth opisane powyżej.
4. Dodaj domenę `polacywbelgii.eu` w **Domain management**.
5. Ustaw rekordy DNS domeny zgodnie z wartościami pokazanymi przez Netlify.
6. Po aktywacji HTTPS otwórz `https://polacywbelgii.eu/admin/`.

## Dostęp redaktorów

Nie ma osobnej bazy użytkowników CMS. Aby nadać dostęp:

1. dodaj konto jako collaborator repozytorium GitHub,
2. nadaj mu prawo zapisu,
3. użytkownik loguje się przez GitHub w `/admin/`.

Odebranie dostępu do repozytorium automatycznie odbiera możliwość używania CMS. Te same operacje można wykonywać z sekcji **Użytkownicy i role**, widocznej wyłącznie dla administratora.
