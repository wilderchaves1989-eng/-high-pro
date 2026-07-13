-- ============================================================
-- HIGH PRO - Setup completo (rodar de uma vez no SQL Editor do Supabase)
-- Seguro para re-executar (IF NOT EXISTS). Cola tudo e clica Run.
-- ============================================================

-- 1) LOGIN: confirma todos os acessos criados (destrava o login)
-- Nota: "confirmed_at" e coluna gerada pelo Postgres/Supabase (derivada de
-- email_confirmed_at) e nao pode ser definida diretamente.
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2) FINANCEIRO: historico de lancamentos por aluno
create table if not exists lancamentos (
  id serial primary key,
  aluno_id integer not null references alunos(id) on delete cascade,
  data date not null default current_date,
  descricao text,
  valor numeric(10,2) not null default 0,
  metodo text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_lancamentos_aluno on lancamentos(aluno_id);
create index if not exists idx_lancamentos_data on lancamentos(data);
alter table lancamentos enable row level security;
drop policy if exists "Authenticated read lancamentos" on lancamentos;
drop policy if exists "Authenticated all lancamentos" on lancamentos;
create policy "Authenticated read lancamentos" on lancamentos for select to authenticated using (true);
create policy "Authenticated all lancamentos" on lancamentos for all to authenticated using (true);

-- 3) ESTUDO: nivel por fase (skill matrix TWI)
create table if not exists skills_alunos (
  id serial primary key,
  aluno_id integer not null references alunos(id) on delete cascade,
  skill_key text not null,
  nivel integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, skill_key)
);
create index if not exists idx_skills_aluno on skills_alunos(aluno_id);
alter table skills_alunos enable row level security;
drop policy if exists "Authenticated read skills_alunos" on skills_alunos;
drop policy if exists "Authenticated all skills_alunos" on skills_alunos;
create policy "Authenticated read skills_alunos" on skills_alunos for select to authenticated using (true);
create policy "Authenticated all skills_alunos" on skills_alunos for all to authenticated using (true);

-- 4) PROPOSTAS: pacotes guardados na Calculadora
create table if not exists propostas (
  id serial primary key,
  aluno_id integer references alunos(id) on delete set null,
  cliente_nome text,
  cliente_email text,
  cliente_telefone text,
  nome_pacote text,
  itens jsonb not null default '[]',
  desconto_pct numeric(5,2) not null default 0,
  total numeric(10,2) not null default 0,
  validade date,
  criado_em timestamptz not null default now()
);
create index if not exists idx_propostas_criado on propostas(criado_em desc);
alter table propostas enable row level security;
drop policy if exists "Authenticated read propostas" on propostas;
drop policy if exists "Authenticated all propostas" on propostas;
create policy "Authenticated read propostas" on propostas for select to authenticated using (true);
create policy "Authenticated all propostas" on propostas for all to authenticated using (true);

-- 5) PLANOS DE CUSTO: planos guardados no Consumo
create table if not exists planos_custo (
  id serial primary key,
  aluno_id integer references alunos(id) on delete set null,
  aluno_nome text,
  nome_plano text,
  linhas jsonb not null default '[]',
  total_horas numeric(10,2) not null default 0,
  total_pecas integer not null default 0,
  total_custo numeric(10,2) not null default 0,
  media_hora numeric(10,2) not null default 0,
  params jsonb not null default '{}',
  criado_em timestamptz not null default now()
);
alter table planos_custo add column if not exists params jsonb not null default '{}';
create index if not exists idx_planos_custo_criado on planos_custo(criado_em desc);
alter table planos_custo enable row level security;
drop policy if exists "Authenticated read planos_custo" on planos_custo;
drop policy if exists "Authenticated all planos_custo" on planos_custo;
create policy "Authenticated read planos_custo" on planos_custo for select to authenticated using (true);
create policy "Authenticated all planos_custo" on planos_custo for all to authenticated using (true);

-- 6) PERFIL COMPORTAMENTAL: dossie de formacao por aluno
create table if not exists perfil_comportamental (
  id serial primary key,
  aluno_id integer not null unique references alunos(id) on delete cascade,
  estilo_aprendizagem text,
  motivacao text,
  postura_seguranca text,
  trabalho_equipe text,
  risco_desistencia text,
  pontos_fortes text,
  pontos_a_desenvolver text,
  objetivo_carreira text,
  observacoes text,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_perfil_aluno on perfil_comportamental(aluno_id);
alter table perfil_comportamental enable row level security;
drop policy if exists "Authenticated read perfil_comportamental" on perfil_comportamental;
drop policy if exists "Authenticated all perfil_comportamental" on perfil_comportamental;
create policy "Authenticated read perfil_comportamental" on perfil_comportamental for select to authenticated using (true);
create policy "Authenticated all perfil_comportamental" on perfil_comportamental for all to authenticated using (true);

-- 7) MODULOS PERMITIDOS: controlo de acesso por credencial (esconde abas no menu)
-- NULL = sem restricao (ve tudo, comportamento padrao). Array de chaves = ve so essas abas.
alter table profiles add column if not exists modulos_permitidos jsonb;
