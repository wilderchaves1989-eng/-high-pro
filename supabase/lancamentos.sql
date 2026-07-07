-- ============================================================
-- HIGH PRO - Financeiro interno (historico de lancamentos)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

-- Registo interno de valores por aluno. Cada linha e um lancamento
-- (data, descricao, valor, metodo). Nao e cobranca: sem vencimento.
CREATE TABLE IF NOT EXISTS lancamentos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_aluno ON lancamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);

-- Row Level Security (segue a mesma convencao das outras tabelas)
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read lancamentos" ON lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all lancamentos" ON lancamentos FOR ALL TO authenticated USING (true);
