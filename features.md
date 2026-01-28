# Sportvault App - Ominaisuudet ja Näkymät

Tämä tiedosto sisältää listauksen sovelluksen tärkeimmistä näkymistä ja niiden sijainneista koodissa.

### 1. Päänäkymät ja Navigointi

- **Kirjautumissivu (Login):** Käyttäjän tunnistautuminen.
  - Tiedosto: [app/(auth)/login.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(auth)/login.tsx>)
- **Päävalikko ja Alapalkki (Layout):** Sovelluksen välilehtinavigaatio.
  - Tiedosto: [app/(dashboard)/\_layout.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/_layout.tsx>)
- **Etusivu / Ohjauspaneeli:** Sovelluksen päänäkymä kirjautumisen jälkeen.
  - Tiedostot: [app/index.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/index.tsx) (uudelleenohjaus) ja dashboardin päänäkymä.

### 2. Treenit ja Ohjelmat

- **Treeniohjelmien listaus:** Kaikki tallennetut treenipohjat.
  - Tiedosto: [app/(dashboard)/workouts/index.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/workouts/index.tsx>)
- **Treeniohjelman luonti ja editointi:** Uuden treenipohjan rakentaminen.
  - Tiedosto: [app/(dashboard)/workouts/create.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/workouts/create.tsx>)
- **Treeniohjelman yksityiskohdat:** Yksittäisen ohjelman tarkastelu ja muokkausmahdollisuus.
  - Tiedosto: [app/(dashboard)/workouts/[id].tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/workouts/[id].tsx>)
- **Aktiivinen treenisessio:** Itse treenin suoritus ja seuranta (toistot, sarjat, lepoaika).
  - Tiedosto: [app/workout-session/[id].tsx](file:///Users/antti/Projektit/sportvault-mobile/app/workout-session/[id].tsx)
- **Treenihistoria:** Lista aiemmin suoritetuista treeneistä.
  - Tiedosto: [app/(dashboard)/workouts/history.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/workouts/history.tsx>)
- **Treenisession yhteenveto:** Raportti suoritetusta treenistä.
  - Tiedosto: [app/(dashboard)/workouts/session/[id].tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/workouts/session/[id].tsx>)

### 3. Analytiikka ja Tilastot

- **Analytiikkanäkymä:** Graafit ja yleiset tilastot edistymisestä.
  - Tiedosto: [app/(dashboard)/analytics.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/analytics.tsx>)
- **Tarkemmat tilastot:** Spesifimmät datanäkymät.
  - Tiedosto: [app/(dashboard)/stats/index.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/stats/index.tsx>)

### 4. Lisäominaisuudet

- **Treenikalenteri:** Treenien tarkastelu kalenterinäkymässä.
  - Tiedosto: [app/(dashboard)/calendar/index.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/calendar/index.tsx>)
- **Laskin (esim. 1RM tai levylaskin):** Aputyökalut treenin tueksi.
  - Tiedosto: [app/(dashboard)/calculator/index.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/calculator/index.tsx>)
- **Profiili ja asetukset:** Käyttäjätiedot ja sovelluksen asetukset (Settings Hub).
  - Päänäkymä: [app/settings/index.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/index.tsx)
  - Asettelu (Stack): [app/settings/\_layout.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/_layout.tsx)
  - Alasivut:
    - [app/settings/edit-profile.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/edit-profile.tsx)
    - [app/settings/notifications.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/notifications.tsx)
    - [app/settings/privacy.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/privacy.tsx)
    - [app/settings/apple-health.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/apple-health.tsx)
    - [app/settings/smart-watch.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/smart-watch.tsx)
    - [app/settings/heart-rate.tsx](file:///Users/antti/Projektit/sportvault-mobile/app/settings/heart-rate.tsx)

### 5. Ydinlogiikka ja Komponentit

Jos haluat muokata yleisiä komponentteja (kuten painikkeita tai treenikortteja):

- **Treenikomponentit (esim. lepoajastin):** `src/components/workout/`
- **Käyttöliittymäkomponentit:** `src/components/ui/`
- **Tietokantahaut ja logiikka (Hooks):** `src/hooks/` (esim. `useWorkoutHistory.ts`)
