-- ============================================================
-- HIGH PRO - Modulo Financeiro (tabela de pagamentos)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

-- Cada linha e uma parcela / cobranca de um aluno.
-- O total de um aluno = soma das parcelas. Pago = soma das parcelas com pago=true.
CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  vencimento DATE,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  metodo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_aluno ON pagamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venc ON pagamentos(vencimento);

-- Row Level Security (segue a mesma convencao das outras tabelas do projeto)
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read pagamentos" ON pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all pagamentos" ON pagamentos FOR ALL TO authenticated USING (true);
