# JEnglish TE AI Reader

A self-contained implementation of the `/ai/te` concept from the product prompt.

## What is included

- Editorial-style English article reader
- Sentence-level selection
- Context-aware AI actions: explain, translate, grammar, vocabulary, simplify
- Article-level AI chat
- Mock AI provider by default
- Optional server-side OpenAI provider
- SpeechSynthesis-based British English listening demo
- Local saved articles/items
- Responsive mobile AI drawer
- Dark-mode toggle
- Error/empty/loading states
- Basic Node tests

## Run

```bash
npm start
```

Open `http://localhost:4173/ai/te`.

The default AI provider is mock mode, so no secrets are required.

## Optional real AI

Copy `.env.example` to `.env` and set:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
```

The API key is only used in the Node server and is never sent to the browser.

## Tests

```bash
npm test
npm run check
```

## Content

The included article text is original demo content. Do not populate the production app by scraping copyrighted sources. Connect the content layer to authorized JEnglish material when available.
