# JEnglish TE AI Reader

A context-aware English reading workspace inspired by the JEnglish `/ai/te` experience.

This repository now includes the article backend plus the first AI/content-management layer.

## What is implemented

- PostgreSQL content database
- Versioned articles
- Paragraph and sentence normalization
- Categories and tags
- Published/draft/review/archived workflow
- Public article list/detail APIs
- Public category API
- Chinese UI for the learner-facing reader
- `中文 / EN` article translation toggle
- Cached full-article Chinese translations
- Cached sentence-level AI explanations, translations, grammar, vocabulary and simplified English
- AI provider abstraction with mock mode and OpenAI mode
- Admin CMS at `/admin`
- Admin article create/edit/publish workflow
- Admin AI generation actions
- Editorial thumbnail assets for the demo articles

The three seeded articles are original demo content created for development and testing.

## Stack

- Node.js HTTP server
- PostgreSQL
- `pg`
- Static HTML/CSS/JavaScript frontend
- Browser speech synthesis for the current audio MVP
- OpenAI Responses API for optional real AI generation

## Setup

Create `.env` from `.env.example` and make sure PostgreSQL is running.

```bash
cp .env.example .env
npm install
npm run db:setup
npm start
```

Open:

```text
Reader: http://localhost:4173/ai/te
Admin:  http://localhost:4173/admin
```

### Environment variables

```text
DATABASE_URL=postgres://jenglish:jenglish@localhost:5432/jenglish
AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
ADMIN_KEY=change-me-in-development
```

`AI_PROVIDER=mock` is enough to test the full UI and database workflow without an OpenAI key. Switch to `AI_PROVIDER=openai` and set `OPENAI_API_KEY` when you want real model generation.

`ADMIN_KEY` protects the CMS API. For production, use a strong secret and place it only in the server environment.

## Database

Run all pending migrations:

```bash
npm run db:migrate
```

Seed/update the three demo articles:

```bash
npm run db:seed
```

Run both:

```bash
npm run db:setup
```

The new `002_ai_admin.sql` migration adds the persistent AI generation cache. AI results are tied to an article version so changing an article creates a clean generation namespace.

## Public API

### List published articles

```http
GET /api/articles
```

### Get one published article

```http
GET /api/articles/:slug
```

The detail response includes paragraph/sentence content plus cached AI generation data when available.

### Get published categories

```http
GET /api/categories
```

### AI actions

```http
POST /api/ai
```

Supported modes:

- `article_translate`
- `explain`
- `translate`
- `grammar`
- `vocabulary`
- `simplify`
- `chat`

Non-chat results are cached by article version, sentence and generation type.

## Admin CMS

The CMS is intentionally small and focused on content workflow.

```text
/admin
```

Features:

- list articles by status
- create a new article
- edit metadata and content
- create a new article version
- change status
- publish an article
- generate a full Chinese translation
- generate sentence learning content for the whole article
- open the learner reader for the current article

The current CMS uses an environment-level `ADMIN_KEY`. It is suitable for an internal MVP; a full user/account system can replace it later.

## Reader behavior

The learner-facing reader now:

- uses Simplified Chinese for Japanese-language UI copy
- keeps the article itself in English by default
- toggles the full passage to cached/generated Chinese with `中文 / EN`
- supports sentence-level AI actions
- persists article/sentence saves locally for the MVP
- shows a collapsible previous/similar article thumbnail cascade
- hides the AI panel completely when its close button is pressed and shows a reopen button

## Content note

The seeded articles and thumbnails are original demo content/assets. The schema includes source/copyright fields so authorized production content can be represented explicitly.


### Article slugs
Article slugs are generated automatically from the article title when an article is saved. Duplicate titles receive a numeric suffix, and Unicode titles are supported.


## Recent CMS and reader fixes

The current build includes:

- draft saves that read form values before rerendering
- category selection from database categories with an `Other` option
- automatic slug generation from the title
- generated editorial SVG covers based on title/subtitle/category/tags
- a `POST /api/admin/articles/:slug/generate-cover` endpoint
- a global `中文 / EN` language switch that changes reader UI and article passage language
- sentence playback progress with a moving progress dot
- six sentence AI actions: 解释 / 中文 / 翻译 / 语法 / 词汇 / 简化英语
- migration `003_ai_chinese.sql` for the persisted `chinese` AI generation type

For an existing database, run:

```bash
npm run db:migrate
```

New articles without a cover URL automatically receive a content-derived cover after saving. Existing articles can use the **根据文章生成封面** button in the CMS to regenerate one.
