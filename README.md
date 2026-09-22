# JEnglish TE AI Reader

A context-aware English reading workspace inspired by the JEnglish `/ai/te` experience.

This repository now includes **Phase 1 + Phase 2 of the article backend**:

- PostgreSQL content database
- Versioned articles
- Paragraph and sentence normalization
- Categories and tags
- Published/draft/review/archived article states
- Public article list/detail APIs
- Public category API
- The frontend now loads article content from the API instead of a hard-coded article array
- The three original demo articles are available through the database seed script

AI generation, authentication, user bookmarks in PostgreSQL, and the admin CMS are intentionally deferred to the next phase.

## Stack

- Node.js HTTP server
- PostgreSQL
- `pg`
- Static HTML/CSS/JavaScript frontend
- Browser speech synthesis for the current audio MVP

## Database model

```text
Category
  └── Article
       ├── Article Version
       │    └── Paragraph
       │         └── Sentence
       └── Article Tags ── Tag
```

Each article is stored as a versioned hierarchy so the sentence becomes the reusable unit for later AI explanations, vocabulary and audio.

## Setup

Copy `.env.example` to `.env` and make sure PostgreSQL is running.

The included Docker Compose file provides a local PostgreSQL instance:

```bash
docker compose up -d postgres
npm install
npm run db:setup
npm start
```

Then open:

```text
http://localhost:4173/ai/te
```

Default local database values:

```text
DATABASE_URL=postgres://jenglish:jenglish@localhost:5432/jenglish
```

If Docker is not available, use any PostgreSQL 14+ instance and point `DATABASE_URL` at it.

## Database commands

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

The seed is idempotent for the three demo article slugs: it updates their metadata and rebuilds their version-1 paragraphs/sentences.

## Public API

### List published articles

```http
GET /api/articles
```

Returns lightweight article cards for navigation and discovery.

### Get one published article

```http
GET /api/articles/:slug
```

Returns the full normalized article including paragraphs and sentences.

### Get published categories

```http
GET /api/categories
```

Returns categories with published article counts.

The APIs intentionally expose only `status = 'published'` content.

## Test and syntax checks

```bash
npm test
npm run check
```

`npm test` does not require a live PostgreSQL database; database connection is only opened when the database scripts or article endpoints are used.

## Important content note

The three seeded articles are original demo content created for this project. The schema includes `source_name`, `source_url`, and `copyright_note` so authorized production content can later be represented explicitly.
