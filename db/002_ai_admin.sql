CREATE TABLE IF NOT EXISTS ai_generations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  article_version_id BIGINT NOT NULL REFERENCES article_versions(id) ON DELETE CASCADE,
  sentence_id BIGINT REFERENCES sentences(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('article', 'sentence')),
  kind TEXT NOT NULL CHECK (kind IN ('article_translate', 'explain', 'translate', 'grammar', 'vocabulary', 'simplify')),
  language TEXT NOT NULL DEFAULT 'zh-CN',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  content TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope = 'article' AND sentence_id IS NULL) OR (scope = 'sentence' AND sentence_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_generation_cache
  ON ai_generations(article_version_id, COALESCE(sentence_id, 0), kind, language, prompt_version);

CREATE INDEX IF NOT EXISTS idx_ai_generations_article
  ON ai_generations(article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generations_sentence
  ON ai_generations(sentence_id, kind, language);
