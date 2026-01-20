---
name: User UX Patterns
description: SportVaultin käyttöliittymästandardit, komponenttien käyttö ja visuaalinen linja.
---

# User UX Patterns

Tavoitteena on premium-tason käyttökokemus, joka tuntuu sulavalta urheilutilanteissa.

## 1. Visuaalinen Linja

- **Glassmorphism**: Käytä `Card`-komponenttia lasi-efektillä (`glass={true}`) syvyyden luomiseen.
- **Neon Glow**: Käytä projektin neon-vihreää vain korostuksiin ja tärkeimpiin toimintoihin (CTA).
- **Dark Mode First**: Sovellus on suunniteltu pelkästään tummalle teemalle parhaan kontrastin saavuttamiseksi.

## 2. Palaute ja Interaktio

- **Haptinen palaute**: Käytä `expo-haptics`-kirjastoa.
  - `Light`: Painikkeen painallus.
  - `Success`: Treenin tallennus tai tavoitteen saavuttaminen.
  - `Warning`: Virhearvot lomakkeissa.
- **Lataustilat**: Käytä `ActivityIndicator`-komponenttia tai Skeleton-näkymiä, jotta sovellus ei tunnu jumiutuneelta.

## 3. Komponenttien Käyttö standardit

- **Button**: Käytä `primary`-varianttia vain yhdelle päätoiminnolle per näkymä.
- **Input**: Varmista, että näppäimistötyyppi (`keyboardType`) on oikea (esim. `numeric` painoille).
- **SafeArea**: Käytä `useSafeAreaInsets`-hookia, jotta sisältö ei jää loven tai koti-indikaattorin alle.

## 4. Animaatiot

Suositellaan **react-native-reanimated**-kirjastoa monimutkaisempiin siirtymiin. Käytä Layout Animations -ominaisuutta listojen muutoksiin.
