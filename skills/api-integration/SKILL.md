---
name: API Integration
description: Ohjeet datan hakemiseen, välimuistitukseen ja ulkoisiin integraatioihin.
---

# API Integration

Pääasiallinen datalähde on **Supabase**, ja tilanhallintaan käytetään **TanStack Querya**.

## 1. Supabase-asiakas

Kaikki palvelinkutsut tehdään `supabase`-instanssin kautta (@/lib/supabase).

```typescript
const { data, error } = await supabase.from("table").select("*");
```

## 2. TanStack Query (React Query)

Käytä välimuistitusta kaikelle datalle, joka ei muutu jatkuvasti.

- **Standardi**: Käytä custom hookeja (esim. `useWorkouts`) pirstaloituneiden kutsujen sijaan.
- **Invalidointi**: Muista kytkeä `queryClient.invalidateQueries` mutaatioiden (tallennus, poisto) jälkeen.

## 3. Virheiden hallinta

- Tarkista aina `error` Supabase-vastauksesta.
- Näytä käyttäjälle selkeä ilmoitus, jos verkkoyhteys puuttuu tai haku epäonnistuu.

## 4. Tulevat integraatiot (Terveysdata)

Kun lisätään **Apple Health** tai **Google Fit**:

- Käytä `expo-health-connect` tai vastaavia Expo-tuettuja kirjastoja.
- Pyydä luvat aina tilannekohtaisesti, kun käyttäjä haluaa synkronoida dataa.
