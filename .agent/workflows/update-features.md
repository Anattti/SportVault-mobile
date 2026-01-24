---
description: Ohjeet features.md-tiedoston päivittämiseen uuden ominaisuuden tai näkymän lisäämisen yhteydessä
---

# Ohje: Päivitä features.md

// turbo-all

Tämä workflow varmistaa, että sovelluksen ominaisuuslista pysyy ajan tasalla. Noudata näitä ohjeita aina, kun luot uuden sivun, näkymän tai merkittävän uuden ominaisuuden.

### Milloin päivittää?

- Kun lisäät uuden tiedoston `app/`-hakemistoon (uusi reitti tai näkymä).
- Kun lisäät merkittävän uuden komponentin tai ominaisuuden `src/components/workout/`-kansioon.
- Kun poistat ominaisuuden tai muutat tiedostojen sijaintia.

### Toimenpiteet

1. Avaa [features.md](file:///Users/antti/Projektit/sportvault-mobile/features.md).
2. Lisää uusi ominaisuus oikeaan kategoriaan (1. Navigointi, 2. Treenit, 3. Analytiikka tai 4. Lisäominaisuudet).
3. Merkitse ominaisuuden nimi, lyhyt kuvaus ja polku tiedostoon.
4. Käytä linkkimuotoa: `[tiedosto.tsx](file:///polku/tiedostoon)`.

### Esimerkki merkinnästä

```markdown
- **Ominaisuuden nimi:** Kuvaus mitä se tekee.
  - Tiedosto: [nimi.tsx](<file:///Users/antti/Projektit/sportvault-mobile/app/(dashboard)/uusi-näkymä/nimi.tsx>)
```
