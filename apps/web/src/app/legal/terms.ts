import { updatedLine, type LegalDocument, type LegalLanguage } from './legal-document';
import { addressLines } from './legal-address';
import type { Operator } from './operator';

export function terms(operator: Operator, language: LegalLanguage): LegalDocument {
  return language === 'de' ? german(operator) : english(operator);
}

function english(o: Operator): LegalDocument {
  return {
    title: 'Terms of use',
    updated: updatedLine('en'),
    sections: [
      {
        heading: 'Provider',
        blocks: [
          { type: 'address', lines: addressLines(o, 'en') },
          { type: 'email', address: o.email },
        ],
      },
      {
        heading: 'What Trade Count is',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count is a free tool that calculates profit and loss from the trades you enter, using the first-in-first-out ' +
              '(FIFO) method. It is a calculator, not tax, legal or investment advice. Results can differ from your broker’s ' +
              'statements or your tax situation. You are responsible for checking them and for what you do with them.',
          },
        ],
      },
      {
        heading: 'Your data and backups',
        blocks: [
          {
            type: 'p',
            text:
              'Your portfolio is stored in your browser on your device. Browsers can delete this storage, for example when you ' +
              'clear site data, uninstall the app or, on some devices, after a period of non-use. We cannot restore it. Please ' +
              'export backups regularly and keep them somewhere safe.',
          },
        ],
      },
      {
        heading: 'Sync and your sync key',
        blocks: [
          {
            type: 'p',
            text:
              'Sync is optional and works as described in the privacy policy. Keep your sync key safe and private. Anyone who has ' +
              'it can read, change or delete your synced copy. If you lose it and all your devices, nobody, including us, can ' +
              'recover the synced data.',
          },
        ],
      },
      {
        heading: 'Fair use',
        blocks: [
          {
            type: 'p',
            text:
              'Do not attack, overload or misuse the service, and do not try to access other people’s data. We may block ' +
              'connections that do.',
          },
        ],
      },
      {
        heading: 'Availability and changes',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count is provided free of charge and as is. We do not guarantee uninterrupted availability or that results ' +
              'are free of errors. We may change or discontinue features, including sync. If we plan to discontinue sync we ' +
              'will announce it in the app where possible, so that you can export your data.',
          },
        ],
      },
      {
        heading: 'Liability',
        blocks: [
          {
            type: 'p',
            text:
              'To the extent permitted by law, because the service is free, we are liable only for intent and gross negligence. ' +
              'Liability for injury to life, body or health, under the Product Liability Act and under other mandatory law remains ' +
              'unaffected.',
          },
          {
            type: 'p',
            text:
              'For loss of data, our liability is limited to the effort that restoring the data would have required if you had ' +
              'made regular backups and kept your sync key safe.',
          },
        ],
      },
      {
        heading: 'Applicable law',
        blocks: [
          {
            type: 'p',
            text:
              'German law applies. If you are a consumer, mandatory consumer protection rules of the country where you live ' +
              'remain unaffected.',
          },
        ],
      },
      {
        heading: 'Changes to these terms',
        blocks: [
          {
            type: 'p',
            text: 'We may update these terms. The date at the top shows the latest version; using the app afterwards means you accept it.',
          },
        ],
      },
    ],
  };
}

function german(o: Operator): LegalDocument {
  return {
    title: 'Nutzungsbedingungen',
    updated: updatedLine('de'),
    sections: [
      {
        heading: 'Anbieter',
        blocks: [
          { type: 'address', lines: addressLines(o, 'de') },
          { type: 'email', address: o.email },
        ],
      },
      {
        heading: 'Was Trade Count ist',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count ist ein kostenloses Werkzeug, das Gewinn und Verlust aus den von Ihnen eingegebenen Trades nach dem ' +
              'First-in-first-out-Verfahren (FIFO) berechnet. Es ist ein Rechenwerkzeug und keine Steuer-, Rechts- oder ' +
              'Anlageberatung. Die Ergebnisse können von den Abrechnungen Ihres Brokers oder Ihrer steuerlichen Situation ' +
              'abweichen. Sie sind selbst dafür verantwortlich, sie zu prüfen und zu entscheiden, was Sie damit tun.',
          },
        ],
      },
      {
        heading: 'Ihre Daten und Backups',
        blocks: [
          {
            type: 'p',
            text:
              'Ihr Portfolio wird in Ihrem Browser auf Ihrem Gerät gespeichert. Browser können diesen Speicher löschen, zum ' +
              'Beispiel wenn Sie Websitedaten löschen, die App deinstallieren oder auf manchen Geräten nach längerer Nichtnutzung. ' +
              'Wir können ihn nicht wiederherstellen. Bitte exportieren Sie regelmäßig Backups und bewahren Sie sie sicher auf.',
          },
        ],
      },
      {
        heading: 'Synchronisierung und Ihr Sync-Schlüssel',
        blocks: [
          {
            type: 'p',
            text:
              'Die Synchronisierung ist optional und funktioniert wie in der Datenschutzerklärung beschrieben. Bewahren Sie Ihren ' +
              'Sync-Schlüssel sicher und geheim auf. Wer ihn besitzt, kann Ihre synchronisierte Kopie lesen, ändern oder löschen. ' +
              'Wenn Sie ihn und alle Ihre Geräte verlieren, kann niemand, auch wir nicht, die synchronisierten Daten ' +
              'wiederherstellen.',
          },
        ],
      },
      {
        heading: 'Fairer Gebrauch',
        blocks: [
          {
            type: 'p',
            text:
              'Greifen Sie den Dienst nicht an, überlasten oder missbrauchen Sie ihn nicht und versuchen Sie nicht, auf Daten ' +
              'anderer zuzugreifen. Wir können Verbindungen sperren, die das tun.',
          },
        ],
      },
      {
        heading: 'Verfügbarkeit und Änderungen',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count wird kostenlos und im aktuellen Zustand bereitgestellt. Wir garantieren weder eine unterbrechungsfreie ' +
              'Verfügbarkeit noch fehlerfreie Ergebnisse. Wir können Funktionen ändern oder einstellen, auch die ' +
              'Synchronisierung. Wenn wir die Synchronisierung einstellen wollen, kündigen wir das nach Möglichkeit in der App ' +
              'an, damit Sie Ihre Daten exportieren können.',
          },
        ],
      },
      {
        heading: 'Haftung',
        blocks: [
          {
            type: 'p',
            text:
              'Soweit gesetzlich zulässig, haften wir, weil der Dienst unentgeltlich ist, nur für Vorsatz und grobe ' +
              'Fahrlässigkeit. Unberührt bleibt die Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der ' +
              'Gesundheit, nach dem Produkthaftungsgesetz und nach sonstigem zwingendem Recht.',
          },
          {
            type: 'p',
            text:
              'Bei Datenverlust beschränkt sich unsere Haftung auf den Aufwand, den die Wiederherstellung der Daten verursacht ' +
              'hätte, wenn Sie regelmäßig Backups erstellt und Ihren Sync-Schlüssel sicher aufbewahrt hätten.',
          },
        ],
      },
      {
        heading: 'Anwendbares Recht',
        blocks: [
          {
            type: 'p',
            text:
              'Es gilt deutsches Recht. Wenn Sie Verbraucher sind, bleiben zwingende Verbraucherschutzvorschriften des Staates, ' +
              'in dem Sie leben, unberührt.',
          },
        ],
      },
      {
        heading: 'Änderungen dieser Bedingungen',
        blocks: [
          {
            type: 'p',
            text:
              'Wir können diese Bedingungen aktualisieren. Das Datum oben zeigt die aktuelle Fassung; mit der weiteren Nutzung ' +
              'der App akzeptieren Sie sie.',
          },
        ],
      },
    ],
  };
}
