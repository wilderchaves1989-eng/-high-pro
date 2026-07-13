-- ============================================================
-- HIGH PRO - Controlo de acesso por modulo, por credencial
-- Copiar e colar no SQL Editor do Supabase Dashboard e clicar Run
-- ============================================================

-- NULL = sem restricao (ve todas as abas, comportamento atual/padrao).
-- Array de chaves (ex: '["agenda","estudo"]') = ve so essas abas.
-- "configuracoes" fica sempre exclusivo do perfil GESTOR, nao e afetado por isto.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB;
