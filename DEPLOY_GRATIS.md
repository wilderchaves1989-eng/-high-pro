# HIGH PRO - Deploy Gratuito 24/7

## Custo total: EUR 0,00/mes

---

## PASSO 1: Criar projeto no Supabase (5 minutos)

1. Acesse https://supabase.com e crie conta gratuita
2. Clique em "New Project"
3. Preencha:
   - Nome: `highpro`
   - Password do banco: (anote esta senha)
   - Regiao: `West EU (Ireland)` (mais perto de Portugal)
4. Aguarde o projeto ser criado (~2 minutos)

## PASSO 2: Criar as tabelas (2 minutos)

1. No Supabase Dashboard, va em **SQL Editor**
2. Clique em **New Query**
3. Copie TODO o conteudo do arquivo `supabase/schema.sql`
4. Clique em **Run** (botao verde)
5. Deve aparecer "Success" sem erros

## PASSO 3: Criar o primeiro utilizador (1 minuto)

1. No Supabase Dashboard, va em **Authentication > Users**
2. Clique em **Add User > Create New User**
3. Preencha:
   - Email: `admin@highpro.pt`
   - Password: `admin123456`
   - Marque: "Auto Confirm User"
4. Clique em **Create User**
5. Verifique na tabela `profiles` se o perfil foi criado automaticamente
6. Se necessario, edite o perfil para `GESTOR`:
   - Va em **Table Editor > profiles**
   - Clique na linha do admin
   - Mude `perfil` para `GESTOR`

## PASSO 4: Obter as chaves da API (1 minuto)

1. No Supabase Dashboard, va em **Settings > API**
2. Copie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`

## PASSO 5: Deploy no Vercel (3 minutos)

1. Suba o projeto para o GitHub:
   ```bash
   cd high-pro
   git remote add origin https://github.com/SEU_USER/high-pro.git
   git push -u origin master
   ```

2. Acesse https://vercel.com e faca login com GitHub

3. Clique em **Add New > Project**

4. Selecione o repositorio `high-pro`

5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

6. Adicione as **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...sua_chave...`

7. Clique em **Deploy**

8. Em ~1 minuto, seu app estara online em:
   `https://high-pro.vercel.app`

---

## RESULTADO FINAL

| Servico  | URL                              | Custo     | Uptime |
|----------|----------------------------------|-----------|--------|
| Frontend | https://high-pro.vercel.app      | Gratis    | 24/7   |
| Database | Supabase PostgreSQL              | Gratis    | 24/7   |
| Auth     | Supabase Auth                    | Gratis    | 24/7   |
| API      | Supabase REST (auto-gerada)      | Gratis    | 24/7   |

## LIMITES DO PLANO GRATUITO

| Recurso            | Limite Gratis         |
|--------------------|-----------------------|
| Base de dados      | 500 MB                |
| Bandwidth          | 5 GB/mes              |
| Utilizadores auth  | 50.000 MAU            |
| Storage            | 1 GB                  |
| Edge Functions     | 500K invocacoes/mes   |
| Vercel deploys     | Ilimitados            |
| Vercel bandwidth   | 100 GB/mes            |

Para uma escola de solda com ate 500 alunos, estes limites
sao mais que suficientes. So precisa pagar quando crescer muito.

---

## CRIAR MAIS UTILIZADORES

Para criar novos utilizadores (atendimento, professor):

1. No Supabase Dashboard > Authentication > Users > Add User
2. Preencha email e senha
3. Na tabela `profiles`, ajuste o `perfil`:
   - `GESTOR` = acesso total
   - `ATENDIMENTO` = gestao de alunos e agenda
   - `PROFESSOR` = visualizacao

---

## DOMINIO PERSONALIZADO (Opcional)

Para usar `app.highpro.pt` em vez de `high-pro.vercel.app`:

1. No Vercel > Settings > Domains
2. Adicione `app.highpro.pt`
3. Configure o DNS do seu dominio conforme as instrucoes
