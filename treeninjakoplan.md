Treenien jakamisen toteutussuunnitelma
Tämä suunnitelma kuvaa vaiheet, joilla toteutetaan premium-tason treenien jakamisominaisuus mobiilisovellukseen, peilaten ja parantaen web-version toiminnallisuutta.

Ehdotetut muutokset

1. Tietokanta & Palvelut
   shared_workouts -taulukon hyödyntäminen: Varmistetaan, että mobiilisovellus käyttää samaa Supabase-taulukkoa kuin web-versio, jotta linkit toimivat ristiin eri alustoilla.
   Uusi palvelu: Luodaan @/lib/services/sharing.ts hoitamaan tokenien generointia ja linkkien luomista.
2. UI/UX -parannukset
   Jaa-painike: Lisätään "Jaa" -painike WorkoutSummary (treenin jälkeen näkyvä kooste) ja SessionDetails (historia) -näkymiin.
   Visuaalinen kooste: Käytetään react-native-view-shot -kirjastoa generoimaan tyylikäs, brändätty kuva treenikoosteesta. Tämä mahdollistaa treenin jakamisen suoraan esimerkiksi Instagram Storiesiin tai WhatsAppiin.
3. Natiiviintegraatio
   Natiivi jakonäkymä: Käytetään React Nativen Share API:a avaamaan järjestelmän oma jakovalikko.
   Deep Linking: Konfiguroidaan expo-router ja expo-linking käsittelemään sportvault://share/[token] -linkkejä.
4. Hybridi-virta
   Universal Links: Jos jaettu linkki on muotoa https://sportvault.app/share/[token], sen tulisi:
   Avata sovellus, jos se on asennettuna (Universal Links / App Links kautta).
   Ohjata web-versioon, jos sovellusta ei ole asennettu.
   Toteutusvaiheet
   [NEW]
   sharing.ts
   Toteutetaan createShareLink, joka:

Generoi uniikin tokenin.
Tallentaa treenidatan shared_workouts -taulukkoon.
Palauttaa URL-osoitteen (esim. https://sportvault.app/share/[token]).
[MODIFY]
session/[id].tsx
Lisätään "Jaa"-ikoni yläpalkkiin tai yhteenvetonäkymän loppuun.

[NEW]
ShareButton.tsx
Uudelleenkäytettävä komponentti, joka:

Käynnistää linkin luomisen.
(Valinnainen) Ottaa kuvakaappauksen näkymästä.
Avaa Share.share() -dialogin.
Varmistussuunnitelma
Automaattiset testit
Yksikkötestit: Testataan tokenin generointia ja Supabase-tallennuslogiikkaa sharing.ts-tiedostossa.
Manuaalinen testaus
Avaa suoritettu treeni historiasta.
Klikkaa "Jaa"-painiketta.
Varmista, että natiivi jakonäkymä aukeaa.
Valitse "Copy Link" ja liitä se selaimeen.
Varmista, että linkki näyttää oikean treenidatan (web-versiossa).
(Jos deep linking on konfiguroitu) Napauta linkkiä viestisovelluksessa ja varmista, että se avaa mobiilisovelluksen.
