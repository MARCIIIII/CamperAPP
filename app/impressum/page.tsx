import LegalLayout from "@/components/LegalLayout";

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
        ⚠️ Bitte ersetze alle <strong>[PLATZHALTER]</strong> mit deinen echten Angaben, bevor du die App öffentlich schaltest.
      </p>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        <strong>[VORNAME NACHNAME]</strong><br />
        [STRASSE UND HAUSNUMMER]<br />
        [PLZ] [ORT]<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: <strong>[DEINE TELEFONNUMMER]</strong><br />
        E-Mail: <strong>[DEINE E-MAIL-ADRESSE]</strong>
      </p>

      <h2>Hinweis zur privaten Vermietung</h2>
      <p>
        Diese Website wird von einer Privatperson betrieben. Es handelt sich nicht um einen gewerblichen
        Campingplatzbetrieb. Die Vermietung der Stellplätze erfolgt im Rahmen der privaten Vermögensverwaltung.
      </p>

      <h2>Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        .<br />
        Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalLayout>
  );
}
