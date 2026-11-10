# ONFLOW HR Pro — deploy

## Estrutura
```
onflow/
├─ web/                      <- é a pasta publicada (Vercel/Netlify)
│  ├─ index.html  app.js  vercel.json  _headers
│  └─ js/ config.js  auth.js  admin.js  holerites.js
└─ supabase/
   ├─ schema.sql             <- tabelas, RLS, RPCs, Storage
   └─ functions/admin/index.ts
```

## 1. Supabase
1. Crie o projeto. **Authentication > Providers > Email**: desligue **"Allow new users to sign up"** (cadastro fechado) e deixe "Confirm email" como estiver (o admin cria usuários já confirmados).
2. **SQL Editor**: rode `supabase/schema.sql`.
3. Crie o 1º admin (instruções no fim do schema.sql).
4. Edge Function:
   ```bash
   npm i -g supabase && supabase login && supabase link --project-ref SEU_REF
   supabase secrets set SITE_URL=https://SEU-APP.vercel.app RESEND_API_KEY=re_xxx MAIL_FROM="RH <rh@seudominio.com>"
   supabase functions deploy admin
   ```
   (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem dentro das Edge Functions; a service_role **nunca** vai para o frontend.)
5. **Authentication > URL Configuration**: Site URL = link do app; adicione-o em Redirect URLs.
6. Em `web/js/config.js` coloque a Project URL e a **anon key** (Settings > API).

## 2. Hospedagem
**Vercel:** `npm i -g vercel && cd web && vercel --prod` (framework "Other", sem build). Ou conecte o repositório e defina *Root Directory* = `web`.
**Netlify:** arraste a pasta `web` em app.netlify.com/drop, ou `netlify deploy --prod --dir=web`.
O link público (https) é o que habilita câmera e GPS do ponto.

## 3. Teste de ponta a ponta
1. Entre como admin > Administração > cadastre um gestor e um colaborador (matrícula igual à do PDF).
2. Lote de Holerites: escolha o mês, **Analisar PDF**, confira a tabela, **Publicar**.
3. Entre como colaborador > Holerites > Visualizar > De Acordo / Contestar. O gestor recebe o alerta em tempo real.
