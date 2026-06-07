-- ============================================================
-- HIGH PRO - Schema completo para Supabase
-- Copiar e colar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA DE PERFIS (ligada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'ATENDIMENTO' CHECK (perfil IN ('GESTOR','ATENDIMENTO','PROFESSOR')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CURSOS
CREATE TABLE IF NOT EXISTS cursos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  processo TEXT,
  carga INTEGER NOT NULL DEFAULT 0,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  nivel TEXT,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ALUNOS
CREATE TABLE IF NOT EXISTS alunos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD','AGENDOU_VISITA','MATRICULADO','CONCLUIDO','DESISTENTE')),
  origem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AULAS / AGENDAMENTOS
CREATE TABLE IF NOT EXISTS aulas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'PRATICA' CHECK (tipo IN ('PRATICA','TEORICA','VISITA_TECNICA')),
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  duracao INTEGER NOT NULL DEFAULT 60,
  estado TEXT NOT NULL DEFAULT 'CONFIRMADO' CHECK (estado IN ('CONFIRMADO','PENDENTE','CANCELADO')),
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CONFIG DO SISTEMA
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL
);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Cursos
INSERT INTO cursos (nome, processo, carga, valor, nivel, descricao) VALUES
  ('Eletrodo Revestido Basico', 'SMAW (111) - Eletrodo Revestido', 160, 750, 'Iniciante', 'Formacao completa em soldagem por eletrodo revestido.'),
  ('MIG/MAG Industrial', 'GMAW (135/136) - MIG/MAG', 200, 1250, 'Intermediario', 'Soldagem MIG/MAG para industria metalurgica.'),
  ('TIG Avancado', 'GTAW (141) - TIG', 240, 1500, 'Avancado', 'Soldagem TIG para aco inoxidavel e aluminio.'),
  ('Arco Submerso', 'SAW (121) - Arco Submerso', 180, 1800, 'Profissional', 'Soldagem por arco submerso para grandes estruturas.'),
  ('Fluxo Tubular', 'FCAW (136/138) - Arame Tubular', 160, 1300, 'Intermediario', 'Soldagem com arame tubular.')
ON CONFLICT DO NOTHING;

-- Alunos demo
INSERT INTO alunos (nome, email, telefone, curso_id, status, origem) VALUES
  ('Carlos Oliveira', 'carlos@email.com', '+351 912 345 678', 1, 'MATRICULADO', 'Instagram'),
  ('Ana Santos', 'ana@email.com', '+351 923 456 789', 2, 'LEAD', 'Indicacao'),
  ('Pedro Costa', 'pedro@email.com', '+351 934 567 890', 3, 'AGENDOU_VISITA', 'Google'),
  ('Mariana Lima', 'mariana@email.com', '+351 915 678 901', 1, 'CONCLUIDO', 'Facebook')
ON CONFLICT DO NOTHING;

-- Config
INSERT INTO config (chave, valor) VALUES ('sistemaNome', 'High Pro') ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (protege os dados)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Politicas: utilizadores autenticados podem ler e escrever tudo
CREATE POLICY "Authenticated read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update profiles" ON profiles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read cursos" ON cursos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all cursos" ON cursos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read alunos" ON alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all alunos" ON alunos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read aulas" ON aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all aulas" ON aulas FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read config" ON config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all config" ON config FOR ALL TO authenticated USING (true);

-- ============================================================
-- FUNCAO: criar perfil automaticamente ao registar utilizador
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'ATENDIMENTO')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: dispara ao criar utilizador
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VIEW: dashboard stats (para consulta rapida)
-- ============================================================

CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT count(*) FROM alunos) AS total_alunos,
  (SELECT count(*) FROM aulas WHERE data = CURRENT_DATE AND estado != 'CANCELADO') AS agenda_hoje,
  (SELECT count(*) FROM cursos WHERE ativo = true) AS cursos_ativos;
