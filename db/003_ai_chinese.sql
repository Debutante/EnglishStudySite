DO $$
BEGIN
  ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_kind_check;
  ALTER TABLE ai_generations
    ADD CONSTRAINT ai_generations_kind_check
    CHECK (kind IN ('article_translate', 'explain', 'chinese', 'translate', 'grammar', 'vocabulary', 'simplify'));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
