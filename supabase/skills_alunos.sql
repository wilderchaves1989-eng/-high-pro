-- ============================================================
-- HIGH PRO - Progresso de estudo por fase (skill matrix TWI)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

-- Nivel de cada aluno em cada fase/skill da trilha do seu curso.
-- Escala TWI: 0 nao viu, 1 viu demo, 2 faz com ajuda, 3 faz sozinho, 4 aprovado.
CREATE TABLE IF NOT EXISTS skills_alunos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_skills_aluno ON skills_alunos(aluno_id);

ALTER TABLE skills_alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read skills_alunos" ON skills_alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all skills_alunos" ON skills_alunos FOR ALL TO authenticated USING (true);
