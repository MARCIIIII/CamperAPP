import LegalLayout from "@/components/LegalLayout";

export default function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen">
      <p className="text-sm text-gray-500 mb-6">Stand: Juni 2025</p>

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese AGB gelten für alle Buchungen von Stellplätzen über diese Website zwischen dem Vermieter
        (<strong>[VORNAME NACHNAME]</strong>, <strong>[ADRESSE]</strong>) und dem Mieter (nachfolgend „Gast").
      </p>

      <h2>§ 2 Vertragsschluss</h2>
      <p>
        Mit Abschluss der Online-Buchung und der vollständigen Zahlung via PayPal kommt ein verbindlicher
        Mietvertrag über den gewählten Stellplatz für den gebuchten Zeitraum zustande. Der Gast erhält
        eine Buchungsbestätigung sowie den Zugangscode per E-Mail.
      </p>

      <h2>§ 3 Ausschluss des Widerrufsrechts</h2>
      <p>
        Gemäß § 312g Abs. 2 Nr. 9 BGB besteht bei Verträgen zur Erbringung von Dienstleistungen im
        Zusammenhang mit Freizeitbetätigungen, wenn der Vertrag für die Erbringung einen spezifischen
        Termin oder Zeitraum vorsieht, <strong>kein Widerrufsrecht</strong>. Eine Stornierung ist daher
        nur nach Maßgabe von § 4 möglich.
      </p>

      <h2>§ 4 Stornierung und Rücktritt</h2>
      <p>Stornierungen müssen schriftlich per E-Mail erfolgen. Es gelten folgende Bedingungen:</p>
      <ul>
        <li>Stornierung mehr als 14 Tage vor Anreise: <strong>volle Rückerstattung</strong></li>
        <li>Stornierung 7–14 Tage vor Anreise: <strong>50 % des Buchungsbetrags</strong> werden erstattet</li>
        <li>Stornierung weniger als 7 Tage vor Anreise: <strong>keine Rückerstattung</strong></li>
      </ul>
      <p>
        Der Vermieter behält sich das Recht vor, Buchungen aus wichtigem Grund (z. B. höhere Gewalt,
        technische Probleme) kostenfrei zu stornieren und den vollen Betrag zu erstatten.
      </p>

      <h2>§ 5 Nutzungsbedingungen für Stellplätze</h2>
      <ul>
        <li>Der gebuchte Stellplatz darf nur für das bei der Buchung angegebene Fahrzeug genutzt werden.</li>
        <li>Die Nutzung durch Dritte ist nicht gestattet.</li>
        <li>Der Zugangscode ist vertraulich zu behandeln und darf nicht weitergegeben werden.</li>
        <li>Die Ruhezeiten (22:00 – 07:00 Uhr) sind einzuhalten.</li>
        <li>Abfälle sind mitzunehmen. Müllentsorgung auf dem Gelände ist nicht gestattet.</li>
        <li>Offenes Feuer und Grillen sind nicht erlaubt.</li>
        <li>Das Grundstück ist bei Abreise im ursprünglichen Zustand zu hinterlassen.</li>
      </ul>

      <h2>§ 6 Haftung</h2>
      <p>
        Der Vermieter haftet nicht für Diebstahl, Beschädigungen oder Unfälle auf dem Stellplatz, sofern
        diese nicht auf grober Fahrlässigkeit oder Vorsatz des Vermieters beruhen. Der Gast haftet für
        alle Schäden, die er oder seine Begleiter am Grundstück oder an Einrichtungen verursachen.
      </p>

      <h2>§ 7 Zahlung</h2>
      <p>
        Die Zahlung erfolgt ausschließlich vorab über PayPal. Die Buchung wird erst nach vollständigem
        Zahlungseingang bestätigt und der Zugangscode übermittelt.
      </p>

      <h2>§ 8 Datenschutz</h2>
      <p>
        Informationen zur Verarbeitung personenbezogener Daten findest du in unserer{" "}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>§ 9 Anwendbares Recht</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Vermieters,
        soweit gesetzlich zulässig.
      </p>

      <h2>§ 10 Salvatorische Klausel</h2>
      <p>
        Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen
        Bestimmungen unberührt.
      </p>
    </LegalLayout>
  );
}
