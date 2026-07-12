-- ============================================================
-- HIGH PRO - Perfil comportamental do aluno (dossie de formacao)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

CREATE TABLE IF NOT EXISTS perfil_comportamental (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL UNIQUE REFERENCES alunos(id) ON DELETE CASCADE,
  estilo_aprendizagem TEXT,
  motivacao TEXT,
  postura_seguranca TEXT,
  trabalho_equipe TEXT,
  risco_desistencia TEXT,
  pontos_fortes TEXT,
  pontos_a_desenvolver TEXT,
  objetivo_carreira TEXT,
  observacoes TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfil_aluno ON perfil_comportamental(aluno_id);

ALTER TABLE perfil_comportamental ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read perfil_comportamental" ON perfil_comportamental FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all perfil_comportamental" ON perfil_comportamental FOR ALL TO authenticated USING (true);
