/**
 * FAQino — Motore di generazione FAQ da testo in italiano.
 * Funziona completamente offline, senza API esterne.
 */

// ─── Stopwords italiane ────────────────────────────────────────────────
const STOPWORDS = new Set([
  // articoli
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
  // preposizioni semplici e articolate
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'del', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
  'col', 'coll', 'coi', 'cogli',
  // congiunzioni
  'e', 'ed', 'che', 'o', 'ma', 'se', 'né', 'perché', 'poiché', 'quindi', 'dunque', 'ossia',
  'ovvero', 'cioè', 'mentre', 'quando', 'come', 'sebbene', 'benché', 'affinché',
  // pronomi
  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'esso', 'essa', 'essi', 'esse',
  'mi', 'ti', 'si', 'ci', 'vi', 'me', 'te', 'sé', 'ce', 'ne', 'lo', 'la', 'li',
  // verbi ausiliari e copulativi comuni
  'essere', 'avere', 'sono', 'sei', 'è', 'siamo', 'siete',
  'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno',
  'era', 'erano', 'sarà', 'saranno',
  'stato', 'stata', 'stati', 'state',
  'fatto', 'fatta', 'fatti', 'fatte',
  // avverbi e particelle comuni
  'non', 'più', 'meno', 'molto', 'tanto', 'poco', 'troppo', 'abbastanza',
  'anche', 'solo', 'ancora', 'già', 'ora', 'dopo', 'prima', 'poi', 'sempre', 'mai',
  'qui', 'qua', 'lì', 'là', 'così', 'circa', 'quasi', 'almeno', 'infatti',
  // aggettivi e pronomi dimostrativi / indefiniti
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
  'alcuni', 'alcune', 'ogni', 'qualsiasi', 'qualunque', 'tutti', 'tutte',
  'altro', 'altra', 'altri', 'altre',
  // altre parole comuni a basso contenuto informativo
  'cui', 'dove', 'quale', 'quali', 'quanto', 'quanta', 'quanti', 'quante',
  'parte', 'modo', 'caso', 'volta', 'tempo', 'esempio',
]);

// ─── Abbreviazioni italiane comuni (da non spezzare) ──────────────────
const ABBREVIATIONS = new Set([
  'sig', 'sig.ra', 'dott', 'dott.ssa', 'prof', 'prof.ssa', 'ing', 'avv', 'rag',
  'not', 'ecc', 'es', 'p.es', 'pag', 'pp', 'vol', 'cap', 'art', 'comm', 'cfr',
  'n', 'nn', 'sec', 'secc', 'tel', 'fax', 'cell', 'etc',
  'dr', 'mr', 'mrs', 'ms',
]);

// ─── Indicatori di frase "definitoria" (bonus nello scoring) ──────────
const DEFINITION_MARKERS = [
  /\b(è|sono|rappresenta|costituisce|si tratta di|significa|consiste|equivale)\b/i,
  /\b(viene definito|vengono definiti|si definisce|si intende per)\b/i,
  /\b(in altre parole|ovvero|cioè|ossia|vale a dire)\b/i,
];

const PROCESS_MARKERS = [
  /\b(serve|servono|permette|permettono|consente|consentono|viene usato|vengono usati|si usa|si usano|si utilizza)\b/i,
  /\b(funziona|funzionano|opera|operano|agisce|agiscono|lavora|lavorano)\b/i,
];

const CHARACTERISTIC_MARKERS = [
  /\b(caratterizzato|caratterizzata|composto|composta|formato|formata|dotato|dotata|provvisto|provvista)\b/i,
  /\b(presenta|possiede|dispone di|è dotato di)\b/i,
];

const REASON_MARKERS = [
  /\b(perché|poiché|dato che|dal momento che|in quanto|giacché|a causa di|grazie a)\b/i,
];

const METHOD_MARKERS = [
  /\b(si fa|si procede|si effettua|si realizza|si ottiene|basta|occorre|è necessario|bisogna)\b/i,
];

const EXAMPLE_MARKERS = [
  /\b(ad esempio|per esempio|tra cui|come|quali|in particolare|segnatamente)\b/i,
];

// ─── Classe principale ──────────────────────────────────────────────────

class FAQGenerator {
  /**
   * Genera FAQ da un testo in italiano.
   * @param {string} text - Il testo sorgente
   * @param {number} maxQuestions - Numero massimo di domande (1-10)
   * @returns {Array<{question: string, answer: string}>}
   */
  generate(text, maxQuestions) {
    if (!text || !text.trim()) return [];
    const n = Math.max(1, Math.min(10, maxQuestions || 5));

    // 1. Pulizia e normalizzazione
    const cleaned = this._cleanText(text);

    // 2. Suddivisione in frasi
    const sentences = this._splitSentences(cleaned);
    if (sentences.length === 0) return [];

    // 3. Estrazione parole chiave
    const keywords = this._extractKeywords(sentences);

    // 4. Scoring delle frasi
    const scored = this._scoreSentences(sentences, keywords);

    // 5. Selezione diversificata delle migliori N frasi
    const selected = this._selectDiverse(scored, n, keywords);

    // 6. Generazione domanda + risposta per ogni frase selezionata
    return selected.map((item) => ({
      question: this._formQuestion(item.sentence, keywords),
      answer: this._formAnswer(item, sentences),
    }));
  }

  // ─── Pulizia testo ──────────────────────────────────────────────────

  _cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ─── Tokenizzazione in frasi (consapevole dell'italiano) ────────────

  _splitSentences(text) {
    // Proteggi le abbreviazioni sostituendo temporaneamente i punti
    const protected_ = [];
    const abbrPattern = new RegExp(
      '\\b(' + [...ABBREVIATIONS].map(a => a.replace('.', '\\.')).join('|') + ')\\.',
      'gi'
    );

    let protectedText = text.replace(abbrPattern, (match) => {
      protected_.push(match);
      return `__ABBR${protected_.length - 1}__`;
    });

    // Proteggi anche i numeri decimali (es. 3.14) e le ellissi (...)
    protectedText = protectedText.replace(/(\d)\.(\d)/g, '$1__DOT__$2');
    protectedText = protectedText.replace(/\.{3,}/g, (match) => {
      protected_.push(match);
      return `__ELLIPSIS${protected_.length - 1}__`;
    });

    // Proteggi acronimi puntati: U.S.A. -> rimuovi i punti
    protectedText = protectedText.replace(/([A-Z])\.(?=[A-Z]\.)/g, '$1__ACRO__');

    // Ora dividi sui confini di frase
    const rawSentences = protectedText.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ö0-9"«'\(])/g);

    // Se lo split non ha prodotto abbastanza frasi, prova split semplice
    let sentences = rawSentences;
    if (rawSentences.length <= 1) {
      sentences = protectedText.split(/(?<=[.!?])\s+/g);
    }

    // Ripristina abbreviazioni, punti decimali, ellissi
    sentences = sentences.map((s) => {
      let restored = s.replace(/__ABBR(\d+)__/g, (_, i) => protected_[parseInt(i)]);
      restored = restored.replace(/__ELLIPSIS(\d+)__/g, (_, i) => protected_[parseInt(i)]);
      restored = restored.replace(/__DOT__/g, '.');
      restored = restored.replace(/__ACRO__/g, '.');
      return restored.trim();
    });

    // Filtra frasi troppo corte, vuote, o con solo punteggiatura
    sentences = sentences.filter((s) => {
      const wordChars = s.replace(/[^a-zA-ZÀ-ö0-9]/g, '').length;
      return wordChars >= 15;
    });

    return sentences;
  }

  // ─── Estrazione parole chiave (TF scoring) ──────────────────────────

  _extractKeywords(sentences) {
    const allWords = [];
    for (const sentence of sentences) {
      const tokens = this._tokenize(sentence);
      allWords.push(...tokens);
    }

    const freq = new Map();
    for (const w of allWords) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    // Calcola lo score: frequenza × bonus lunghezza (parole più lunghe = più informative)
    const totalWords = allWords.length || 1;
    const scored = [];
    for (const [word, count] of freq) {
      const tf = count / totalWords;
      const lengthBonus = Math.min(word.length / 6, 1.5); // max 1.5x per parole di 9+ lettere
      const score = tf * (0.7 + 0.3 * lengthBonus);
      // Penalizza parole che appaiono in troppe frasi (non discriminanti)
      const sentenceFreq = sentences.filter((s) =>
        this._tokenize(s).some((t) => t === word)
      ).length;
      const idfBonus = Math.log((sentences.length + 1) / (sentenceFreq + 1)) + 0.5;
      scored.push({ word, score: score * idfBonus });
    }

    // Ordina per score e prendi le prime 30 parole chiave
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 30).map((k) => k.word);
  }

  _tokenize(sentence) {
    // Estrae parole normalizzate, rimuove stopwords e parole corte
    const words = sentence
      .toLowerCase()
      .replace(/[^a-zà-ö0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    return words;
  }

  // ─── Scoring delle frasi ────────────────────────────────────────────

  _scoreSentences(sentences, keywords) {
    const keywordSet = new Set(keywords);
    const results = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const tokens = this._tokenize(sentence);
      const wordCount = tokens.length || 1;

      // Keyword density
      const kwMatches = tokens.filter((t) => keywordSet.has(t)).length;
      const keywordScore = kwMatches / wordCount;

      // Position score (frasi iniziali valgono di più, specie inizio paragrafi)
      const positionScore = 1 - i / sentences.length;

      // Definition/process/characteristic bonus
      const allMarkers = [
        ...DEFINITION_MARKERS,
        ...PROCESS_MARKERS,
        ...CHARACTERISTIC_MARKERS,
        ...REASON_MARKERS,
        ...METHOD_MARKERS,
      ];
      let markerBonus = 0;
      for (const marker of allMarkers) {
        if (marker.test(sentence)) {
          markerBonus += 0.15;
        }
      }
      markerBonus = Math.min(markerBonus, 0.4);

      // Length penalty (frasi troppo corte o troppo lunghe penalizzate)
      const charLen = sentence.length;
      let lengthPenalty = 1;
      if (charLen < 40) lengthPenalty = 0.5;
      else if (charLen < 60) lengthPenalty = 0.8;
      else if (charLen > 400) lengthPenalty = 0.7;
      else if (charLen > 300) lengthPenalty = 0.85;

      // Penalità per frasi che sono solo elenchi o molto brevi
      const listPenalty = sentence.includes('•') || sentence.includes('→') ? 0.7 : 1;

      // Score finale
      const score =
        keywordScore * 0.35 +
        positionScore * 0.25 +
        markerBonus * 0.20 +
        lengthPenalty * 0.10 +
        listPenalty * 0.10;

      results.push({ sentence, score, index: i, tokens });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // ─── Selezione diversificata ─────────────────────────────────────────

  _selectDiverse(scored, n, keywords) {
    if (scored.length <= n) return scored;

    const selected = [];
    const usedKeywords = new Set();

    for (const item of scored) {
      if (selected.length >= n) break;

      // Calcola overlap di keyword con le frasi già selezionate
      const itemKeywords = new Set(item.tokens.filter((t) => keywords.includes(t)));
      const overlap = [...itemKeywords].filter((k) => usedKeywords.has(k)).length;
      const overlapRatio = itemKeywords.size > 0 ? overlap / itemKeywords.size : 0;

      // Se l'overlap è troppo alto, riduci lo score per favorire diversità
      const diversityPenalty = overlapRatio > 0.6 ? 0.3 : overlapRatio > 0.4 ? 0.7 : 1;

      if (diversityPenalty > 0.3 || selected.length === 0) {
        selected.push(item);
        for (const k of itemKeywords) usedKeywords.add(k);
      }
    }

    // Se non abbiamo raggiunto N, prendi i migliori rimanenti
    if (selected.length < n) {
      for (const item of scored) {
        if (selected.length >= n) break;
        if (!selected.includes(item)) {
          selected.push(item);
        }
      }
    }

    // Ripristina l'ordine originale (per posizione nel testo)
    selected.sort((a, b) => a.index - b.index);
    return selected.slice(0, n);
  }

  // ─── Generazione domanda ────────────────────────────────────────────

  _formQuestion(sentence, keywords) {
    const clean = sentence.trim();
    // Rimuovi punteggiatura finale
    const stripped = clean.replace(/[.!?]+$/, '').trim();

    // Prova i vari pattern in ordine di priorità

    // 1. Pattern: "X è/sono Y" → "Che cos'è X?"
    let q = this._tryDefinitionPattern(stripped);
    if (q) return q;

    // 2. Pattern: "X serve/servono a Y" → "A cosa serve X?"
    q = this._tryPurposePattern(stripped);
    if (q) return q;

    // 3. Pattern: "X permette/consente Y" → "Cosa permette X?"
    q = this._tryCapabilityPattern(stripped);
    if (q) return q;

    // 4. Pattern: "X significa/si intende Y" → "Cosa significa X?"
    q = this._tryMeaningPattern(stripped);
    if (q) return q;

    // 5. Pattern: "X si usa/utilizza per Y" → "Come si usa X?"
    q = this._tryUsagePattern(stripped);
    if (q) return q;

    // 6. Pattern: "Perché/poiché X, Y" → "Perché X?"
    q = this._tryReasonPattern(stripped);
    if (q) return q;

    // 7. Pattern: "X è caratterizzato da/composto da Y" → "Quali sono le caratteristiche di X?"
    q = this._tryCharacteristicPattern(stripped);
    if (q) return q;

    // 8. Pattern: "X funziona Y" → "Come funziona X?"
    q = this._tryFunctionPattern(stripped);
    if (q) return q;

    // 9. Pattern: elenchi → "Quali sono...?"
    q = this._tryListPattern(stripped);
    if (q) return q;

    // 10. Fallback: domanda generica basata sulle keyword
    return this._genericQuestion(stripped, keywords);
  }

  _extractSubject(sentence, verbWords) {
    // Trova il soggetto prima del verbo indicato
    const lower = sentence.toLowerCase();
    for (const v of verbWords) {
      const idx = lower.indexOf(v.toLowerCase());
      if (idx > 0) {
        const before = sentence.substring(0, idx).trim();
        // Pulisci: rimuovi articoli e preposizioni iniziali
        let subject = before
          .replace(/^(il|lo|la|i|gli|le|l'|un|uno|una|un')\s+/i, '')
          .trim();
        // Prendi le prime 2-4 parole come soggetto
        const words = subject.split(/\s+/);
        if (words.length > 4) {
          // Cerca di fermarti a una preposizione
          const prepIdx = words.findIndex((w) =>
            /^(di|a|da|in|con|su|per|tra|fra|del|della|dei|al|alla|nel|nella)$/i.test(w)
          );
          if (prepIdx > 0) {
            subject = words.slice(0, prepIdx).join(' ');
          } else {
            subject = words.slice(0, 3).join(' ');
          }
        }
        if (subject.length >= 2) return subject;
      }
    }
    return null;
  }

  _tryDefinitionPattern(sentence) {
    const match = sentence.match(
      /^(.+?)\s+(?:è|sono|rappresenta|costituisce|si tratta di)\s+(.+)$/i
    );
    if (match) {
      const subject = this._cleanSubject(match[1]);
      if (subject.length >= 3) {
        return `Che cos'è ${this._lowercaseFirst(subject)}?`;
      }
    }
    return null;
  }

  _tryPurposePattern(sentence) {
    const subject = this._extractSubject(sentence, [
      'serve', 'servono', 'viene usato', 'vengono usati',
      'viene utilizzato', 'vengono utilizzati',
    ]);
    if (subject && subject.length >= 3) {
      return `A cosa serve ${this._lowercaseFirst(subject)}?`;
    }
    return null;
  }

  _tryCapabilityPattern(sentence) {
    const subject = this._extractSubject(sentence, [
      'permette', 'permettono', 'consente', 'consentono',
    ]);
    if (subject && subject.length >= 3) {
      return `Cosa permette di fare ${this._lowercaseFirst(subject)}?`;
    }
    return null;
  }

  _tryMeaningPattern(sentence) {
    const match = sentence.match(
      /^(.+?)\s+(?:significa|si intende per|si definisce|è definito|è definita)\s+(.+)$/i
    );
    if (match) {
      const subject = this._cleanSubject(match[1]);
      if (subject.length >= 3) {
        return `Cosa significa ${this._lowercaseFirst(subject)}?`;
      }
    }
    return null;
  }

  _tryUsagePattern(sentence) {
    const match = sentence.match(
      /^(.+?)\s+(?:si usa|si usano|si utilizza|si utilizzano|viene impiegato|vengono impiegati)\s+(.+)$/i
    );
    if (match) {
      const subject = this._cleanSubject(match[1]);
      if (subject.length >= 3) {
        return `Come si usa ${this._lowercaseFirst(subject)}?`;
      }
    }
    return null;
  }

  _tryReasonPattern(sentence) {
    const match = sentence.match(
      /^(?:perché|poiché|dato che|dal momento che|in quanto)\s+(.+)$/i
    );
    if (match) {
      const rest = match[1].trim();
      if (rest.length >= 15) {
        // Prendi le prime 4-5 parole
        const words = rest.split(/\s+/).slice(0, 5).join(' ');
        return `Perché ${this._lowercaseFirst(words)}...?`;
      }
    }
    // Prova pattern inverso: "X, perché Y"
    const match2 = sentence.match(/^(.+?)(?:,|)\s+(?:perché|poiché)\s+(.+)$/i);
    if (match2) {
      const subject = this._cleanSubject(match2[1]);
      if (subject.length >= 3) {
        return `Perché ${this._lowercaseFirst(subject)}?`;
      }
    }
    return null;
  }

  _tryCharacteristicPattern(sentence) {
    const subject = this._extractSubject(sentence, [
      'è caratterizzato', 'è caratterizzata', 'sono caratterizzati', 'sono caratterizzate',
      'è composto', 'è composta', 'sono composti', 'sono composte',
      'è formato', 'è formata', 'sono formati', 'sono formate',
      'presenta', 'presentano', 'possiede', 'possiedono',
      'dispone di', 'dispongono di',
    ]);
    if (subject && subject.length >= 3) {
      return `Quali sono le caratteristiche di ${this._lowercaseFirst(subject)}?`;
    }
    return null;
  }

  _tryFunctionPattern(sentence) {
    const subject = this._extractSubject(sentence, [
      'funziona', 'funzionano', 'opera', 'operano', 'lavora', 'lavorano',
    ]);
    if (subject && subject.length >= 3) {
      return `Come funziona ${this._lowercaseFirst(subject)}?`;
    }
    return null;
  }

  _tryListPattern(sentence) {
    // Se la frase contiene una lista (virgole multiple, due punti, ecc.)
    const hasList =
      (sentence.match(/,/g) || []).length >= 3 ||
      sentence.includes(':') ||
      sentence.includes(';');
    if (hasList) {
      // Cerca una frase introduttiva prima dei due punti
      const colonIdx = sentence.indexOf(':');
      if (colonIdx > 0) {
        const intro = sentence.substring(0, colonIdx).trim();
        const words = intro.split(/\s+/).slice(-4).join(' ');
        if (words.length >= 5) {
          return `Quali sono ${this._lowercaseFirst(words)}?`;
        }
      }
      // Prova a estrarre un soggetto generico
      const firstNoun = this._findFirstNounPhrase(sentence);
      if (firstNoun) {
        return `Quali sono ${this._lowercaseFirst(firstNoun)}?`;
      }
    }
    return null;
  }

  _findFirstNounPhrase(sentence) {
    // Trova la prima sequenza sostantivo-aggettivo
    const words = sentence.split(/\s+/);
    for (let i = 0; i < Math.min(words.length - 1, 8); i++) {
      const w = words[i].toLowerCase();
      if (
        !STOPWORDS.has(w) &&
        w.length >= 3 &&
        !/^(è|sono|ha|hanno|era|erano|sarà|saranno)$/i.test(w)
      ) {
        // Prendi questa parola + la successiva se sembra un aggettivo
        if (i + 1 < words.length && words[i + 1].length > 3 && !STOPWORDS.has(words[i + 1].toLowerCase())) {
          return `${words[i]} ${words[i + 1]}`;
        }
        return words[i];
      }
    }
    return null;
  }

  _genericQuestion(sentence, keywords) {
    // Prova a trovare il soggetto principale nella frase
    const subject = this._findFirstNounPhrase(sentence);
    if (subject && subject.length >= 3) {
      return `Cosa sapere su ${this._lowercaseFirst(subject)}?`;
    }
    // Usa la prima keyword disponibile
    const sentenceTokens = this._tokenize(sentence);
    const matchingKw = keywords.find((k) => sentenceTokens.includes(k));
    if (matchingKw) {
      return `Cosa c'è da sapere su ${matchingKw}?`;
    }
    // Ultimo fallback
    return 'Cosa bisogna sapere su questo argomento?';
  }

  _cleanSubject(raw) {
    // Rimuovi articoli iniziali e pulisci
    let s = raw
      .replace(/^(il|lo|la|i|gli|le|l'|un|uno|una|un')\s+/i, '')
      .trim();
    // Rimuovi virgole finali e pulisci
    s = s.replace(/,\s*$/, '').trim();
    // Se è troppo lungo, prendi le prime 4 parole
    const words = s.split(/\s+/);
    if (words.length > 4) {
      s = words.slice(0, 4).join(' ');
    }
    return s;
  }

  _lowercaseFirst(str) {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  // ─── Formazione risposta ────────────────────────────────────────────

  _formAnswer(item, allSentences) {
    const idx = item.index;
    let answerParts = [];

    // Frase precedente (contesto) se pertinente
    if (idx > 0) {
      const prev = allSentences[idx - 1];
      if (this._isRelated(prev, item.sentence)) {
        answerParts.push(prev);
      }
    }

    // Frase principale
    answerParts.push(item.sentence);

    // Frase successiva (contesto)
    if (idx < allSentences.length - 1) {
      const next = allSentences[idx + 1];
      if (this._isRelated(next, item.sentence)) {
        answerParts.push(next);
      }
    }

    return answerParts.join(' ');
  }

  _isRelated(a, b) {
    // Due frasi sono correlate se condividono alcune parole chiave
    const tokensA = new Set(this._tokenize(a));
    const tokensB = this._tokenize(b);
    if (tokensB.length === 0) return false;
    const overlap = tokensB.filter((t) => tokensA.has(t)).length;
    return overlap >= 1 && overlap / tokensB.length >= 0.15;
  }
}

// ─── Interfaccia pubblica ──────────────────────────────────────────────

/**
 * Genera FAQ da testo.
 * @param {string} text - Testo sorgente in italiano
 * @param {number} maxQuestions - Numero massimo di domande (1-10, default 5)
 * @returns {{question: string, answer: string}[]}
 */
function generateFAQs(text, maxQuestions = 5) {
  const generator = new FAQGenerator();
  return generator.generate(text, maxQuestions);
}

module.exports = { FAQGenerator, generateFAQs };
