---
name: Deployment & CI/CD
description: Ohjeet SportVaultin buildaamiseen, versiointiin ja julkaisuun EAS:n avulla.
---

# Deployment & CI/CD

SportVault hyödyntää **Expo Application Services (EAS)** -alustaa.

## 1. EAS Build

Buildit tehdään pilvessä `eas build` -komennolla.

- **Profiilit**:
  - `development`: Kehitysympäristö (Expo Go tai custom dev client).
  - `preview`: Sisäinen testaus (APK/IPA).
  - `production`: Sovelluskauppa-versiot.

## 2. EAS Update (OTA Updates)

Kriittiset bugikorjaukset voidaan lähettää käyttäjille ilman sovelluskauppapäivitystä.

- **Käyttö**: `eas update --branch production`
- **Rajoitukset**: Vain JS-muutokset toimivat. Natiivimuutokset (uudet kirjastot) vaativat aina uuden buildin.

## 3. CI/CD Automaatio

Suositellaan **GitHub Actions** -työnkuluja:

1. **Lint & Test**: Aja jokaisen Pull Requestin yhteydessä.
2. **Auto-Preview**: Luo katseluversio aina kun `main`-haara päivittyy.

## 4. Versiointi

Noudatetaan semanttista versiointia (`major.minor.patch`):

- Päivitä `package.json` ja `app.json`.
- Expo-kohtaiset asetukset: `runtimeVersion` tulee olla synkronoitu natiivimuutosten välillä.
