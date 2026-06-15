import LegalLayout from "@/components/LegalLayout";

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p className="text-sm text-gray-500 mb-6">Stand: Juni 2025</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
        <strong>[VORNAME NACHNAME]</strong><br />
        [STRASSE UND HAUSNUMMER], [PLZ] [ORT]<br />
        E-Mail: <strong>[DEINE E-MAIL-ADRESSE]</strong>
      </p>

      <h2>2. Welche Daten wir erheben</h2>
      <p>Bei einer Buchung verarbeiten wir folgende personenbezogene Daten:</p>
      <ul>
        <li>Vor- und Nachname</li>
        <li>E-Mail-Adresse</li>
        <li>Postanschrift (für Rechnungsstellung)</li>
        <li>Buchungsdaten (Stellplatz, Zeitraum, Betrag)</li>
        <li>Zahlungsdaten (über PayPal — siehe unten)</li>
      </ul>

      <h2>3. Zweck und Rechtsgrundlage</h2>
      <p>
        Die Daten werden ausschließlich zur Abwicklung der Buchung und zur Übersendung des Zugangscodes
        verarbeitet (Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung). Die E-Mail-Adresse wird zudem
        für die Buchungsbestätigung und eventuelle Rückfragen genutzt.
      </p>

      <h2>4. Speicherdauer</h2>
      <p>
        Buchungsdaten werden für 10 Jahre gespeichert, soweit steuerrechtliche Aufbewahrungspflichten
        (§ 147 AO) dies erfordern. Danach werden die Daten gelöscht.
      </p>

      <h2>5. Weitergabe an Dritte</h2>
      <p>
        Deine Daten werden nicht an Dritte verkauft. Folgende Dienstleister erhalten Daten im Rahmen
        der Buchungsabwicklung:
      </p>
      <ul>
        <li>
          <strong>PayPal (Europe) S.à r.l. et Cie, S.C.A.</strong> — Zahlungsabwicklung.
          Datenschutzerklärung: <a href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer">paypal.com</a>
        </li>
        <li>
          <strong>Resend Inc.</strong> — E-Mail-Versand (Buchungsbestätigung, Zugangscode).
          Server befinden sich in der EU/USA (Standardvertragsklauseln).
        </li>
      </ul>

      <h2>6. Deine Rechte (DSGVO Art. 15–21)</h2>
      <p>Du hast das Recht auf:</p>
      <ul>
        <li>Auskunft über deine gespeicherten Daten (Art. 15)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16)</li>
        <li>Löschung deiner Daten, sofern keine Aufbewahrungspflicht besteht (Art. 17)</li>
        <li>Einschränkung der Verarbeitung (Art. 18)</li>
        <li>Datenübertragbarkeit (Art. 20)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
      </ul>
      <p>
        Zur Ausübung dieser Rechte wende dich per E-Mail an: <strong>[DEINE E-MAIL-ADRESSE]</strong>
      </p>

      <h2>7. Beschwerderecht</h2>
      <p>
        Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist
        die Aufsichtsbehörde deines Bundeslandes.
      </p>

      <h2>8. Hosting und Server-Logs</h2>
      <p>
        Diese Website wird über Vercel Inc. (USA) gehostet. Beim Aufruf der Website werden automatisch
        IP-Adresse, Browsertyp, Betriebssystem und Zugriffszeit erfasst (Art. 6 Abs. 1 lit. f DSGVO).
        Diese Daten werden nach 30 Tagen gelöscht.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Diese Website verwendet keine Tracking-Cookies. Es werden ausschließlich technisch notwendige
        Session-Daten im Browser gespeichert.
      </p>
    </LegalLayout>
  );
}
