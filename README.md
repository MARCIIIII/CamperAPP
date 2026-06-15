# 🏕️ CamperSlot

Buchungsplattform für Stellplätze (Camper, Wohnwagen, Garagen) mit PayPal-Zahlung und automatischem Zugangscode per E-Mail.

---

## Checkliste vor dem Go-Live

### Schritt 1 — Umgebungsvariablen ausfüllen (`.env`)

Kopiere `.env.example` zu `.env` und fülle alle Felder aus:

```env
DATABASE_URL="file:./dev.db"

# PayPal
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."
PAYPAL_MODE="sandbox"        # "sandbox" zum Testen → "live" für echte Zahlungen

# E-Mail (Resend)
RESEND_API_KEY="..."
EMAIL_FROM="buchung@deinedomain.de"

# Admin-Bereich
ADMIN_PASSWORD="sicheres-passwort-hier"
```

---

### Schritt 2 — PayPal einrichten

1. Gehe zu [developer.paypal.com](https://developer.paypal.com)
2. Melde dich mit deinem PayPal-Konto an (oder erstelle eines)
3. Klicke auf **Apps & Credentials**
4. Erstelle eine neue App (Name z.B. "CamperSlot")
5. Kopiere **Client ID** und **Secret** in die `.env`
6. Zum Testen: `PAYPAL_MODE="sandbox"` lassen
7. Wenn alles funktioniert: auf **Live**-Credentials wechseln und `PAYPAL_MODE="live"` setzen

---

### Schritt 3 — E-Mail einrichten (Resend)

1. Gehe zu [resend.com](https://resend.com) und erstelle einen kostenlosen Account
   - Kostenlos bis **100 E-Mails pro Tag**
2. Klicke auf **API Keys** → neuen Key erstellen → in `.env` eintragen
3. Klicke auf **Domains** → deine Domain verifizieren (5 Minuten, 2 DNS-Einträge)
4. Trage deine Geschäfts-E-Mail als `EMAIL_FROM` ein, z.B. `buchung@deinedomain.de`

> Noch keine eigene Domain? Zum Testen kannst du `onboarding@resend.dev` als `EMAIL_FROM` eintragen — dann landen Mails aber nur an deine eigene Adresse.

---

### Schritt 4 — Impressum ausfüllen

Öffne [`app/impressum/page.tsx`](app/impressum/page.tsx) und ersetze alle `[PLATZHALTER]`:

| Platzhalter | Ersetzen durch |
|---|---|
| `[VORNAME NACHNAME]` | Deinen vollständigen Namen |
| `[STRASSE UND HAUSNUMMER]` | Deine Straße + Hausnummer |
| `[PLZ] [ORT]` | Deine PLZ und Stadt |
| `[DEINE TELEFONNUMMER]` | Deine Telefonnummer |
| `[DEINE E-MAIL-ADRESSE]` | Deine Kontakt-E-Mail |

Dasselbe in [`app/datenschutz/page.tsx`](app/datenschutz/page.tsx) (gleiche Platzhalter).

---

### Schritt 5 — AGB anpassen

Öffne [`app/agb/page.tsx`](app/agb/page.tsx) und fülle aus:

| Platzhalter | Ersetzen durch |
|---|---|
| `[VORNAME NACHNAME]` | Dein Name |
| `[ADRESSE]` | Deine vollständige Adresse |

Die Stornobedingungen (14/7 Tage) kannst du nach Bedarf anpassen.

---

### Schritt 6 — Stellplätze anlegen

Starte die App lokal und gehe zu `/admin` (Admin-Bereich), um deine echten Stellplätze mit Namen, Typ, Preisen und Zugangscodes einzutragen.

Alternativ kannst du die Beispieldaten in [`prisma/seed.ts`](prisma/seed.ts) anpassen und `npx tsx prisma/seed.ts` ausführen.

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Datenbank erstellen
npx prisma db push

# Beispiel-Daten einspielen
npx tsx prisma/seed.ts

# Entwicklungsserver starten
npm run dev
```

App läuft unter: [http://localhost:3000](http://localhost:3000)

Datenbank-Oberfläche: `npm run db:studio` → öffnet Prisma Studio im Browser

---

## Deployment auf Vercel

1. Gehe zu [vercel.com](https://vercel.com) und verbinde dein GitHub-Konto
2. Importiere das Repository `MARCIIIII/CamperAPP`
3. Trage alle `.env`-Variablen unter **Environment Variables** ein
4. Für Produktion: SQLite durch **PostgreSQL** ersetzen (z.B. Vercel Postgres, kostenlos)
   - `DATABASE_URL` auf PostgreSQL-URL ändern
   - `prisma/schema.prisma`: `provider = "sqlite"` → `provider = "postgresql"`
   - `npx prisma db push` ausführen

---

## Projektstruktur

```
app/
  page.tsx                  # Startseite (Slot-Übersicht)
  slot/[id]/page.tsx        # Buchungsseite
  booking/[id]/pay/         # Zahlungsseite (PayPal)
  booking/[id]/success/     # Erfolgseite
  impressum/                # Impressum (§5 TMG)
  datenschutz/              # Datenschutzerklärung (DSGVO)
  agb/                      # Allgemeine Geschäftsbedingungen
  api/
    slots/                  # GET: alle Slots, POST: Slot anlegen (Admin)
    bookings/               # POST: Buchung anlegen, GET: alle Buchungen (Admin)
    paypal/create-order/    # PayPal Order erstellen
    paypal/capture-order/   # Zahlung abschließen + E-Mail senden

components/
  SlotCard.tsx              # Slot-Karte auf der Startseite
  BookingForm.tsx           # Buchungsformular mit Datumswahl
  PayPalButton.tsx          # PayPal-Zahlungsbutton
  LegalLayout.tsx           # Layout für Rechtsseiten

lib/
  prisma.ts                 # Datenbank-Client
  paypal.ts                 # PayPal REST API (create + capture)
  email.ts                  # E-Mail-Versand via Resend

prisma/
  schema.prisma             # Datenbankschema (Slot, Booking)
  seed.ts                   # Beispiel-Stellplätze
```

---

## Buchungsablauf

```
Gast wählt Stellplatz & Datum
        ↓
Buchung wird als PENDING gespeichert
        ↓
Gast zahlt per PayPal
        ↓
Server bestätigt Zahlung (Status: PAID)
        ↓
Zugangscode wird automatisch per E-Mail verschickt
        ↓
Gast sieht Erfolgseite mit Buchungsnummer
```
