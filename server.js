/**
 * FAQino — Server Express
 * Endpoint API per la generazione FAQ + serving statico del frontend.
 */

const express = require('express');
const path = require('path');
const { generateFAQs } = require('./lib/faq-generator');

const app = express();
const PORT = process.env.PORT || 4600;

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: genera FAQ
app.post('/api/generate-faq', (req, res) => {
  try {
    const { text, maxQuestions } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        error: 'Testo mancante',
        message: 'Incolla un testo nell\'area di input prima di generare le FAQ.',
      });
    }

    if (text.length > 50000) {
      return res.status(400).json({
        error: 'Testo troppo lungo',
        message: 'Il testo non può superare i 50.000 caratteri.',
      });
    }

    const numQuestions = parseInt(maxQuestions, 10) || 5;
    if (numQuestions < 1 || numQuestions > 10) {
      return res.status(400).json({
        error: 'Numero non valido',
        message: 'Il numero di domande deve essere compreso tra 1 e 10.',
      });
    }

    const faqs = generateFAQs(text.trim(), numQuestions);

    res.json({ faqs, count: faqs.length });
  } catch (err) {
    console.error('Errore nella generazione FAQ:', err);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Si è verificato un errore durante la generazione delle FAQ. Riprova.',
    });
  }
});

// robots.txt servito da static, ma anche via route esplicita per sicurezza
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Avvio server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FAQino server attivo su http://0.0.0.0:${PORT}`);
});

module.exports = app;
