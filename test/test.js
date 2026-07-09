/**
 * FAQino — Test suite
 * Verifica il motore di generazione FAQ con testi italiani reali.
 */

const { generateFAQs, FAQGenerator } = require('../lib/faq-generator');
const http = require('http');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ' + msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ' + msg + ' (atteso: ' + JSON.stringify(expected) + ', ricevuto: ' + JSON.stringify(actual) + ')');
  }
}

// ─── Test 1: Testo vuoto ──────────────────────────────────────────────
console.log('\n📋 Test 1: Testo vuoto / null');
{
  const r1 = generateFAQs('', 5);
  assert(Array.isArray(r1) && r1.length === 0, 'Testo vuoto → array vuoto');

  const r2 = generateFAQs('   ', 3);
  assert(Array.isArray(r2) && r2.length === 0, 'Solo spazi → array vuoto');
}

// ─── Test 2: Testo breve ma informativo ───────────────────────────────
console.log('\n📋 Test 2: Testo breve informativo');
{
  const text = 'Il gatto è un mammifero carnivoro della famiglia dei felidi. I gatti domestici vivono in media 15 anni. Sono animali molto indipendenti ma amano la compagnia umana.';
  const faqs = generateFAQs(text, 3);
  assert(faqs.length > 0, 'Genera almeno 1 FAQ');
  assert(faqs.length <= 3, 'Non supera il massimo richiesto');
  for (const faq of faqs) {
    assert(typeof faq.question === 'string' && faq.question.length > 0, 'La domanda non è vuota');
    assert(typeof faq.answer === 'string' && faq.answer.length > 0, 'La risposta non è vuota');
    assert(faq.question.endsWith('?'), 'La domanda termina con "?": "' + faq.question + '"');
  }
}

// ─── Test 3: Domande con pattern "è" ──────────────────────────────────
console.log('\n📋 Test 3: Pattern definitorio (X è Y)');
{
  const text = 'La fotosintesi clorofilliana è il processo mediante il quale le piante convertono l\'energia luminosa in energia chimica. Questo processo avviene nei cloroplasti delle cellule vegetali. La clorofilla è il pigmento che cattura la luce solare.';
  const faqs = generateFAQs(text, 3);
  assert(faqs.length > 0, 'Genera FAQ da testo definitorio');
  const hasDefinitionQuestion = faqs.some(f =>
    f.question.toLowerCase().includes('che cos\'è') ||
    f.question.toLowerCase().includes('cosa')
  );
  assert(hasDefinitionQuestion, 'Almeno una FAQ contiene "Che cos\'è" o simile');
}

// ─── Test 4: Domande con pattern "serve" ──────────────────────────────
console.log('\n📋 Test 4: Pattern di scopo (X serve a Y)');
{
  const text = 'Il firewall serve a proteggere la rete da accessi non autorizzati. Viene utilizzato per filtrare il traffico in entrata e in uscita. I firewall possono essere hardware o software.';
  const faqs = generateFAQs(text, 3);
  assert(faqs.length > 0, 'Genera FAQ da testo di scopo');
  const hasPurposeQuestion = faqs.some(f =>
    f.question.toLowerCase().includes('serve') ||
    f.question.toLowerCase().includes('come si usa')
  );
  assert(hasPurposeQuestion, 'Almeno una FAQ contiene domanda di scopo/uso');
}

// ─── Test 5: Numero massimo di domande rispettato ─────────────────────
console.log('\n📋 Test 5: Limite numero domande');
{
  const text = 'Il machine learning è una branca dell\'intelligenza artificiale. Si basa sull\'idea che i sistemi possono imparare dai dati. Esistono tre tipi principali: supervisionato, non supervisionato e per rinforzo. L\'apprendimento supervisionato usa dati etichettati. L\'apprendimento non supervisionato trova pattern nascosti. Il reinforcement learning impara attraverso premi e penalità. Le reti neurali sono un modello popolare. Il deep learning usa reti neurali profonde. Le applicazioni includono riconoscimento immagini e NLP. I dati di training sono fondamentali per il successo.';
  for (const n of [1, 3, 5, 7, 10]) {
    const faqs = generateFAQs(text, n);
    assert(faqs.length <= n, 'Con max=' + n + ' genera ≤ ' + n + ' FAQ (generate: ' + faqs.length + ')');
    assert(faqs.length >= 1, 'Con max=' + n + ' genera almeno 1 FAQ');
  }
}

// ─── Test 6: Diversità delle domande ──────────────────────────────────
console.log('\n📋 Test 6: Diversità delle domande');
{
  const text = 'Il caffè è una bevanda ottenuta dalla torrefazione dei semi della pianta del caffè. La pianta del caffè è originaria dell\'Etiopia. Il caffè contiene caffeina, una sostanza stimolante. La caffeina agisce sul sistema nervoso centrale. Esistono diverse varietà di caffè, tra cui Arabica e Robusta. L\'Arabica è considerata di qualità superiore. La Robusta ha un contenuto di caffeina più elevato.';
  const faqs = generateFAQs(text, 5);
  // Verifica che le domande siano diverse tra loro
  const questions = faqs.map(f => f.question.toLowerCase());
  const unique = new Set(questions);
  assert(unique.size === questions.length, 'Tutte le domande sono diverse: ' + unique.size + '/' + questions.length);
}

// ─── Test 7: Testo più lungo (articolo simulato) ──────────────────────
console.log('\n📋 Test 7: Testo lungo');
{
  const text = `
    Il cambiamento climatico è una delle sfide più urgenti del nostro tempo. Si riferisce all'aumento della temperatura media globale causato principalmente dalle emissioni di gas serra. I gas serra, come l'anidride carbonica e il metano, intrappolano il calore nell'atmosfera.

    Le attività umane sono la causa principale dell'aumento dei gas serra. La combustione di combustibili fossili per energia e trasporti è responsabile della maggior parte delle emissioni. Anche la deforestazione contribuisce, poiché gli alberi assorbono naturalmente CO2.

    Gli effetti del cambiamento climatico sono già visibili. L'innalzamento del livello del mare minaccia le comunità costiere. Gli eventi meteorologici estremi, come uragani e ondate di calore, stanno diventando più frequenti e intensi.

    Per affrontare il cambiamento climatico, è necessaria un'azione coordinata a livello globale. L'Accordo di Parigi del 2015 ha stabilito l'obiettivo di limitare il riscaldamento globale a 1,5 gradi Celsius. Le energie rinnovabili, come il solare e l'eolico, sono fondamentali per ridurre le emissioni.

    Ogni individuo può contribuire alla lotta al cambiamento climatico. Ridurre il consumo di energia, utilizzare trasporti sostenibili e diminuire gli sprechi alimentari sono azioni concrete che fanno la differenza.
  `;
  const faqs = generateFAQs(text, 5);
  assert(faqs.length >= 3, 'Testo lungo genera almeno 3 FAQ');
  assert(faqs.length <= 5, 'Testo lungo non supera il massimo');
  for (const faq of faqs) {
    assert(faq.question.length >= 10, 'Domanda sufficientemente lunga: "' + faq.question + '"');
    assert(faq.answer.length >= 30, 'Risposta sufficientemente lunga: ' + faq.answer.length + ' caratteri');
    assert(faq.question.endsWith('?'), 'La domanda termina con "?"');
  }
}

// ─── Test 8: API endpoint (test di integrazione) ──────────────────────
console.log('\n📋 Test 8: API endpoint (integrazione)');
{
  // Avvia il server su una porta di test
  const app = require('../server');
  const PORT = 4601;
  let server;

  const testApi = new Promise((resolve, reject) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      const postData = JSON.stringify({
        text: 'Il sole è una stella. Il sole produce energia attraverso la fusione nucleare.',
        maxQuestions: 2,
      });

      const options = {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/generate-faq',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            assertEqual(res.statusCode, 200, 'API risponde 200');
            assert(Array.isArray(data.faqs), 'API restituisce array faqs');
            assert(data.faqs.length > 0, 'API genera almeno 1 FAQ');
            assertEqual(data.count, data.faqs.length, 'count corrisponde alla lunghezza');
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  });

  const testApiError = new Promise((resolve, reject) => {
    const postData = JSON.stringify({ text: '', maxQuestions: 5 });
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/generate-faq',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          assertEqual(res.statusCode, 400, 'API risponde 400 per testo vuoto');
          assert(typeof data.error === 'string', 'API restituisce messaggio di errore');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  // Esegui entrambi i test API poi chiudi il server
  Promise.all([testApi, testApiError])
    .then(() => {
      server.close();
      console.log('  ✓ API test completati');
    })
    .catch((err) => {
      console.error('  ✗ Errore nei test API:', err.message);
      failed++;
      try { server.close(); } catch (e) {}
    });
}

// Aspetta un po' per i test asincroni, poi stampa riepilogo
setTimeout(() => {
  console.log('\n' + '═'.repeat(50));
  console.log('  RISULTATI: ' + passed + ' passati, ' + failed + ' falliti');
  console.log('═'.repeat(50) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}, 2000);
