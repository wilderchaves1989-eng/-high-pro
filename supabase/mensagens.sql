-- ============================================================
-- HIGH PRO - Chat entre colaboradores (canal geral + privadas)
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  remetente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destinatario_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = canal geral (equipa toda)
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_criado ON mensagens(criado_em);
CREATE INDEX IF NOT EXISTS idx_mensagens_privada ON mensagens(remetente_id, destinatario_id);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- So le: mensagens do canal geral (destinatario_id nulo), ou privadas onde
-- o utilizador e remetente ou destinatario. Ninguem le conversa alheia.
DROP POLICY IF EXISTS "Ver mensagens" ON mensagens;
CREATE POLICY "Ver mensagens" ON mensagens FOR SELECT TO authenticated
  USING (destinatario_id IS NULL OR remetente_id = auth.uid() OR destinatario_id = auth.uid());

-- So pode enviar mensagens em seu proprio nome (nao consegue forjar remetente)
DROP POLICY IF EXISTS "Enviar mensagens" ON mensagens;
CREATE POLICY "Enviar mensagens" ON mensagens FOR INSERT TO authenticated
  WITH CHECK (remetente_id = auth.uid());

-- So pode marcar como lida mensagens privadas endereçadas a si proprio
DROP POLICY IF EXISTS "Marcar como lida" ON mensagens;
CREATE POLICY "Marcar como lida" ON mensagens FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid())
  WITH CHECK (destinatario_id = auth.uid());

-- Ativa realtime (mensagens aparecem sem F5) - seguro para re-executar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
  END IF;
END $$;
