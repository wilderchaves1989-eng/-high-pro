-- ============================================================
-- HIGH PRO - Propostas guardadas (Calculadora de Pacotes)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

CREATE TABLE IF NOT EXISTS propostas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER REFERENCES alunos(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  nome_pacote TEXT,
  itens JSONB NOT NULL DEFAULT '[]',
  desconto_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  validade DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propostas_criado ON propostas(criado_em DESC);

ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read propostas" ON propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all propostas" ON propostas FOR ALL TO authenticated USING (true);
