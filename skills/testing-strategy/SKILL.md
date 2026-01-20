---
name: Testing Strategy
description: Ohjeet ja parhaat käytännöt SportVaultin testaamiseen (yksikkö-, komponentti- ja E2E-testit).
---

# Testing Strategy

Vaikka projekti on alkuvaiheessa, kattava testaus varmistaa sovelluksen vakauden.

## 1. Yksikkötestit (Unit Testing)

Käytetään **Jest**-kehystä puhtaalle logiikalle, apufunktioille ja custom hookeille.

- **Sijainti**: `*.test.ts` tiedostot testattavan tiedoston vieressä.
- **Kohteet**: Datalogiikka, validointifunktiot, TanStack Queryn `queryFn`-funktiot.

```typescript
// Esimerkki: formatWeight.test.ts
import { formatWeight } from "./utils";

test("formatoi painon oikein", () => {
  expect(formatWeight(100)).toBe("100 kg");
});
```

## 2. Komponenttitestit (Component Testing)

Käytetään **React Native Testing Library (RNTL)** -kirjastoa UI-komponenttien testaamiseen.

- **Painopiste**: Käyttäjän interaktiot (painikkeet, syötteet) ja oikean datan näyttäminen.
- **Tärkeää**: Mockaa ulkoiset riippuvuudet kuten Supabase ja Expo Router.

## 3. E2E-testit (End-to-End)

Suositellaan **Maestro**-työkalua kriittisten polkujen testaamiseen (esim. treenin luonti ja tallennus).

- **Miksi?**: Maestro on kevyt ja natiivisti mobiilille suunniteltu (YAML-pohjaiset skriptit).

## 4. Parhaat Käytännöt

- **Mocking**: Käytä `jest.mock()` Supabase-asiakkaalle, jotta testit eivät tee oikeita verkkopyyntöjä.
- **Accessibility**: Testaa, että komponenteilla on oikeat `accessibilityLabel`-arvot.
- **Coverage**: Tavoittele kriittisille osille vähintään 80% kattavuutta.
