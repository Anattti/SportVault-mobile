# SportVault Database Documentation

Tämä kansio sisältää SportVault-sovelluksen tietokantarakenteen dokumentaation.

## Sisältö

1.  **[ER-kaavio (database-schema.md)](./database-schema.md)**: Visuaalinen kuvaus tietokannan suhteista ja taulujen vastuualueista.
2.  **[Tekninen tyyppiviittaus (types-reference.md)](./types-reference.md)**: Yksityiskohtainen lista jokaisesta taulusta, sarakkeesta ja niiden tyypeistä.

## Ylläpito

Tämä dokumentaatio perustuu `src/types/supabase.ts` -tiedostoon, joka on generoitu suoraan Supabasen työkaluilla. Jos tietokantaan tehdään muutoksia:

1.  Aja `supabase gen types typescript` (jos käytät CLI:tä).
2.  Päivitä nämä markdown-tiedostot vastaamaan uusia tyyppejä.
