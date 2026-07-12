-- ============================================================
-- HIGH PRO - Planos de custo guardados (Consumo)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

CREATE TABLE IF NOT EXISTS planos_custo (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER REFERENCES alunos(id) ON DELETE SET NULL,
  aluno_nome TEXT,
  nome_plano TEXT,
  linhas JSONB NOT NULL DEFAULT '[]',
  total_horas NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_pecas INTEGER NOT NULL DEFAULT 0,
  total_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  media_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_custo_criado ON planos_custo(criado_em DESC);

ALTER TABLE planos_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read planos_custo" ON planos_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all planos_custo" ON planos_custo FOR ALL TO authenticated USING (true);
