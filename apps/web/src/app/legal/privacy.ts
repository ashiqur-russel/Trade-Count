import { updatedLine, type LegalDocument, type LegalLanguage } from './legal-document';
import { addressLines } from './legal-address';
import type { Operator } from './operator';

export function privacy(operator: Operator, language: LegalLanguage): LegalDocument {
  return language === 'de' ? german(operator) : english(operator);
}

function english(o: Operator): LegalDocument {
  return {
    title: 'Privacy policy',
    updated: updatedLine('en'),
    sections: [
      {
        heading: 'The short version',
        blocks: [
          {
            type: 'list',
            items: [
              'Your trades are stored in your own browser, on your own device. We cannot see them.',
              'Nothing leaves your device unless you turn on sync, and then only an encrypted copy that only your sync key can open.',
              'There are no accounts, no cookies, no analytics, no advertising and no third-party scripts or fonts.',
            ],
          },
        ],
      },
      {
        heading: 'Who is responsible',
        blocks: [
          { type: 'address', lines: addressLines(o, 'en') },
          { type: 'email', address: o.email },
        ],
      },
      {
        heading: 'Visiting this website',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count is hosted by Cloudflare (Cloudflare Pages). When you load the site, your browser sends technical ' +
              'data such as your IP address, the requested address, the time and your browser type to Cloudflare’s servers. ' +
              'Cloudflare needs this to deliver the site and to keep it secure. We do not store these requests ourselves and ' +
              'we do not use them to identify you.',
          },
          {
            type: 'p',
            text:
              'Legal basis: our legitimate interest in providing and securing the website (Art. 6(1)(f) GDPR). Cloudflare may ' +
              'process data outside the EU; such transfers are covered by the safeguards in Cloudflare’s data processing ' +
              'agreement (standard contractual clauses and the EU-US Data Privacy Framework).',
          },
        ],
      },
      {
        heading: 'Data on your device',
        blocks: [
          {
            type: 'p',
            text:
              'The stocks and trades you enter are stored in a database inside your browser (the browser’s private file system ' +
              'for this site). The app also stores your colour theme and whether you dismissed the install hint, and caches its ' +
              'own files so it works offline. All of this stays on your device. We cannot read it and do not receive it.',
          },
          {
            type: 'p',
            text:
              'This storage is necessary to provide the app you asked for (§ 25(2) no. 2 TDDDG). You can delete it at any time ' +
              'by clearing this site’s data in your browser or removing the installed app. Without a backup or sync, deleted ' +
              'data cannot be recovered.',
          },
        ],
      },
      {
        heading: 'Backups',
        blocks: [
          {
            type: 'p',
            text:
              'Export creates a file in your browser that you save wherever you choose. Import reads a file you select. These ' +
              'files are never sent to us.',
          },
        ],
      },
      {
        heading: 'Sync (optional)',
        blocks: [
          {
            type: 'p',
            text:
              'If you turn on sync, your device creates a random sync key and encrypts your portfolio with it before anything ' +
              'is uploaded. The sync key and the encryption key never leave your device. We store:',
          },
          {
            type: 'list',
            items: [
              'a vault ID derived from your key (it looks like random characters and does not identify you),',
              'a one-way hash of an access token derived from your key,',
              'the encrypted copy of your portfolio, which we cannot decrypt, and',
              'a version number and the time of the last update.',
            ],
          },
          {
            type: 'p',
            text:
              'The data is kept in a Cloudflare D1 database restricted to the European Union. Requests to the sync service are ' +
              'handled by Cloudflare’s network, which may process them outside the EU while they are in transit.',
          },
          {
            type: 'p',
            text:
              'Purpose: to provide the sync you requested (Art. 6(1)(b) GDPR). We keep the encrypted copy until you turn sync ' +
              'off in the app, which deletes it immediately. We also delete copies that were uploaded once and never opened ' +
              'again after 7 days, and copies that no device has opened for a year. Your other devices notice a deleted ' +
              'copy and stop syncing; they do not create a new one on their own. If you lose your key, nobody, including ' +
              'us, can decrypt or recover it.',
          },
        ],
      },
      {
        heading: 'Protection against abuse',
        blocks: [
          {
            type: 'p',
            text:
              'To prevent abuse, the sync service limits how many requests one connection can make. For this it counts ' +
              'requests per salted one-way hash of the IP address, not the address itself. The counters are deleted after a ' +
              'few hours. Legal basis: our legitimate interest in keeping the service available and secure (Art. 6(1)(f) GDPR).',
          },
        ],
      },
      {
        heading: 'Your rights',
        blocks: [
          {
            type: 'p',
            text:
              'You have the right to access, rectification, erasure, restriction of processing, data portability and objection ' +
              '(Art. 15–21 GDPR), and the right to lodge a complaint with a data protection supervisory authority. You control ' +
              'your data directly: export it as a backup, or turn off sync to delete the encrypted copy.',
          },
          {
            type: 'p',
            text:
              'Because the synced data is encrypted and we cannot tell whose it is, we cannot match a request to a vault ' +
              'unless you can identify it yourself (Art. 11 GDPR). Use “Turn off sync” in the app, which deletes it.',
          },
          {
            type: 'p',
            text: 'For questions about privacy, write to us at the email address above.',
          },
        ],
      },
      {
        heading: 'Changes',
        blocks: [
          {
            type: 'p',
            text: 'We update this policy when the app changes how it handles data. The date at the top shows the latest version.',
          },
        ],
      },
    ],
  };
}

function german(o: Operator): LegalDocument {
  return {
    title: 'Datenschutzerklärung',
    updated: updatedLine('de'),
    sections: [
      {
        heading: 'Kurz zusammengefasst',
        blocks: [
          {
            type: 'list',
            items: [
              'Ihre Trades werden in Ihrem eigenen Browser auf Ihrem eigenen Gerät gespeichert. Wir können sie nicht einsehen.',
              'Ohne Synchronisierung verlässt nichts Ihr Gerät. Mit Synchronisierung verlässt nur eine verschlüsselte Kopie Ihr Gerät, die allein Ihr Sync-Schlüssel öffnen kann.',
              'Es gibt keine Konten, keine Cookies, keine Analyse- oder Werbedienste und keine Skripte oder Schriften von Dritten.',
            ],
          },
        ],
      },
      {
        heading: 'Verantwortlicher',
        blocks: [
          { type: 'address', lines: addressLines(o, 'de') },
          { type: 'email', address: o.email },
        ],
      },
      {
        heading: 'Besuch dieser Website',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count wird bei Cloudflare gehostet (Cloudflare Pages). Wenn Sie die Seite aufrufen, übermittelt Ihr Browser ' +
              'technische Daten wie Ihre IP-Adresse, die angeforderte Adresse, die Uhrzeit und den Browsertyp an die Server von ' +
              'Cloudflare. Cloudflare benötigt diese Daten, um die Seite auszuliefern und abzusichern. Wir speichern diese ' +
              'Zugriffe nicht selbst und verwenden sie nicht, um Sie zu identifizieren.',
          },
          {
            type: 'p',
            text:
              'Rechtsgrundlage: unser berechtigtes Interesse an Bereitstellung und Absicherung der Website (Art. 6 Abs. 1 lit. f ' +
              'DSGVO). Cloudflare kann Daten auch außerhalb der EU verarbeiten; diese Übermittlungen sind durch die Garantien ' +
              'im Auftragsverarbeitungsvertrag von Cloudflare abgedeckt (Standardvertragsklauseln und EU-US Data Privacy ' +
              'Framework).',
          },
        ],
      },
      {
        heading: 'Daten auf Ihrem Gerät',
        blocks: [
          {
            type: 'p',
            text:
              'Die von Ihnen eingegebenen Aktien und Trades werden in einer Datenbank in Ihrem Browser gespeichert (im privaten ' +
              'Dateisystem des Browsers für diese Seite). Zusätzlich speichert die App Ihr Farbschema und ob Sie den ' +
              'Installationshinweis geschlossen haben, und sie legt ihre eigenen Dateien im Zwischenspeicher ab, damit sie ' +
              'offline funktioniert. All das bleibt auf Ihrem Gerät. Wir können es nicht lesen und erhalten es nicht.',
          },
          {
            type: 'p',
            text:
              'Diese Speicherung ist erforderlich, um die von Ihnen gewünschte App bereitzustellen (§ 25 Abs. 2 Nr. 2 TDDDG). ' +
              'Sie können sie jederzeit löschen, indem Sie die Websitedaten dieser Seite im Browser löschen oder die ' +
              'installierte App entfernen. Ohne Backup oder Synchronisierung lassen sich gelöschte Daten nicht wiederherstellen.',
          },
        ],
      },
      {
        heading: 'Backups',
        blocks: [
          {
            type: 'p',
            text:
              'Der Export erzeugt in Ihrem Browser eine Datei, die Sie an einem Ort Ihrer Wahl speichern. Der Import liest eine ' +
              'Datei, die Sie auswählen. Diese Dateien werden nie an uns übertragen.',
          },
        ],
      },
      {
        heading: 'Synchronisierung (optional)',
        blocks: [
          {
            type: 'p',
            text:
              'Wenn Sie die Synchronisierung einschalten, erzeugt Ihr Gerät einen zufälligen Sync-Schlüssel und verschlüsselt ' +
              'damit Ihr Portfolio, bevor etwas hochgeladen wird. Der Sync-Schlüssel und der Verschlüsselungsschlüssel ' +
              'verlassen Ihr Gerät nie. Wir speichern:',
          },
          {
            type: 'list',
            items: [
              'eine aus Ihrem Schlüssel abgeleitete Vault-ID (sie besteht aus zufälligen Zeichen und identifiziert Sie nicht),',
              'einen Einweg-Hash eines aus Ihrem Schlüssel abgeleiteten Zugriffstokens,',
              'die verschlüsselte Kopie Ihres Portfolios, die wir nicht entschlüsseln können, sowie',
              'eine Versionsnummer und den Zeitpunkt der letzten Änderung.',
            ],
          },
          {
            type: 'p',
            text:
              'Die Daten liegen in einer Cloudflare-D1-Datenbank, die auf die Europäische Union beschränkt ist. Anfragen an den ' +
              'Synchronisierungsdienst werden vom Netzwerk von Cloudflare verarbeitet, das sie während der Übertragung auch ' +
              'außerhalb der EU verarbeiten kann.',
          },
          {
            type: 'p',
            text:
              'Zweck: Bereitstellung der von Ihnen gewünschten Synchronisierung (Art. 6 Abs. 1 lit. b DSGVO). Wir bewahren die ' +
              'verschlüsselte Kopie auf, bis Sie die Synchronisierung in der App ausschalten; dabei wird sie sofort gelöscht. ' +
              'Außerdem löschen wir Kopien, die einmal hochgeladen und nach 7 Tagen nie wieder geöffnet wurden, sowie Kopien, ' +
              'die ein Jahr lang von keinem Gerät geöffnet wurden. Ihre anderen Geräte bemerken eine gelöschte Kopie und ' +
              'hören auf zu synchronisieren; sie legen nicht von selbst eine neue an. Wenn Sie Ihren Schlüssel verlieren, ' +
              'kann niemand, auch wir nicht, die Daten entschlüsseln oder wiederherstellen.',
          },
        ],
      },
      {
        heading: 'Schutz vor Missbrauch',
        blocks: [
          {
            type: 'p',
            text:
              'Um Missbrauch zu verhindern, begrenzt der Synchronisierungsdienst, wie viele Anfragen eine Verbindung stellen ' +
              'kann. Dazu zählt er Anfragen pro gesalzenem Einweg-Hash der IP-Adresse, nicht pro Adresse selbst. Die Zähler ' +
              'werden nach wenigen Stunden gelöscht. Rechtsgrundlage: unser berechtigtes Interesse an Verfügbarkeit und ' +
              'Sicherheit des Dienstes (Art. 6 Abs. 1 lit. f DSGVO).',
          },
        ],
      },
      {
        heading: 'Ihre Rechte',
        blocks: [
          {
            type: 'p',
            text:
              'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit ' +
              'und Widerspruch (Art. 15 bis 21 DSGVO) sowie das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. ' +
              'Ihre Daten haben Sie selbst in der Hand: Sie können sie als Backup exportieren oder die Synchronisierung ' +
              'ausschalten, um die verschlüsselte Kopie zu löschen.',
          },
          {
            type: 'p',
            text:
              'Weil die synchronisierten Daten verschlüsselt sind und wir nicht erkennen können, wem sie gehören, können wir ' +
              'eine Anfrage keinem Vault zuordnen, solange Sie ihn nicht selbst identifizieren können (Art. 11 DSGVO). Nutzen ' +
              'Sie dafür „Turn off sync“ in der App, wodurch die Daten gelöscht werden.',
          },
          {
            type: 'p',
            text: 'Bei Fragen zum Datenschutz schreiben Sie uns an die oben genannte E-Mail-Adresse.',
          },
        ],
      },
      {
        heading: 'Änderungen',
        blocks: [
          {
            type: 'p',
            text:
              'Wir aktualisieren diese Erklärung, wenn die App Daten anders verarbeitet. Das Datum oben zeigt die ' +
              'aktuelle Fassung.',
          },
        ],
      },
    ],
  };
}
