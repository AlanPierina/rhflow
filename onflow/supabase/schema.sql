-- ONFLOW HR Pro — Supabase schema + RLS. Rode no SQL Editor (uma vez).
create type public.perfil_t as enum ('admin','gestor','colaborador');

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  cpf text not null unique check (cpf ~ '^\d{11}$'),
  matricula text unique check (matricula ~ '^\d{4}$'),
  nome text not null,
  email text,                                   -- e-mail real, usado só no "esqueci minha senha"
  perfil public.perfil_t not null default 'colaborador',
  gestor_id uuid references public.usuarios(id),
  pode_cadastrar boolean not null default false, -- gestor autorizado a cadastrar colaboradores
  ativo boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  constraint colaborador_tem_gestor check (perfil <> 'colaborador' or gestor_id is not null)
);
create index on public.usuarios(gestor_id);

create table public.holerites (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  cpf text not null,
  matricula text not null,
  competencia date not null check (extract(day from competencia) = 1), -- 1º dia do mês
  storage_path text not null,
  status text not null default 'disponivel' check (status in ('disponivel','aceito','contestado')),
  created_at timestamptz not null default now(),
  unique (usuario_id, competencia)
);

create table public.logs_assinatura_divergencia (
  id uuid primary key default gen_random_uuid(),
  holerite_id uuid not null references public.holerites(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id),
  gestor_id uuid references public.usuarios(id),
  tipo text not null check (tipo in ('aceite','contestacao')),
  justificativa text,
  nome_colaborador text not null,   -- snapshot (prova imutável)
  matricula text not null,
  competencia date not null,
  hash_documento text,              -- SHA-256 do PDF exibido ao usuário
  ip text, user_agent text,
  analise_status text not null default 'aberta' check (analise_status in ('aberta','resolvida')),
  parecer_gestor text, analisado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.logs_assinatura_divergencia(gestor_id, criado_em desc);

-- ---------- helpers (security definer evita recursão de RLS) ----------
create function public.usuario_ativo() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from usuarios where id = auth.uid() and ativo) $$;
create function public.eh_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from usuarios where id = auth.uid() and ativo and perfil = 'admin') $$;
create function public.eh_gestor_de(p_user uuid) returns boolean language sql stable security definer set search_path=public as
$$ select usuario_ativo() and exists(select 1 from usuarios where id = p_user and gestor_id = auth.uid()) $$;
create function public.meu_cpf() returns text language sql stable security definer set search_path=public as
$$ select cpf from usuarios where id = auth.uid() and ativo $$;

-- ---------- RLS ----------
alter table public.usuarios enable row level security;
alter table public.holerites enable row level security;
alter table public.logs_assinatura_divergencia enable row level security;
revoke all on public.usuarios, public.holerites, public.logs_assinatura_divergencia from anon;

-- usuarios: só leitura pelo cliente. Escrita = Edge Function (service role).
create policy usuarios_select on public.usuarios for select to authenticated
  using (eh_admin() or id = auth.uid() or eh_gestor_de(id));

-- holerites: colaborador vê os seus; gestor vê metadados da equipe; admin tudo.
create policy holerites_select on public.holerites for select to authenticated
  using (usuario_ativo() and (usuario_id = auth.uid() or eh_admin() or eh_gestor_de(usuario_id)));
create policy holerites_admin_write on public.holerites for all to authenticated
  using (eh_admin()) with check (eh_admin());

-- logs: só leitura; escrita apenas via RPC abaixo (append-only).
create policy logs_select on public.logs_assinatura_divergencia for select to authenticated
  using (usuario_ativo() and (usuario_id = auth.uid() or gestor_id = auth.uid() or eh_admin()));

-- ---------- RPCs ----------
create function public.registrar_resposta(p_holerite uuid, p_tipo text, p_justificativa text default null, p_hash text default null)
returns void language plpgsql security definer set search_path=public as $$
declare u usuarios; h holerites; hdr json;
begin
  select * into u from usuarios where id = auth.uid() and ativo;
  if not found then raise exception 'Usuário inválido'; end if;
  select * into h from holerites where id = p_holerite and usuario_id = u.id;
  if not found then raise exception 'Holerite não encontrado'; end if;
  if h.status <> 'disponivel' then raise exception 'Este holerite já foi respondido'; end if;
  if p_tipo not in ('aceite','contestacao') then raise exception 'Tipo inválido'; end if;
  if p_tipo = 'contestacao' and length(trim(coalesce(p_justificativa,''))) < 10 then
    raise exception 'Descreva a divergência (mínimo 10 caracteres)'; end if;
  hdr := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  insert into logs_assinatura_divergencia(holerite_id, usuario_id, gestor_id, tipo, justificativa,
      nome_colaborador, matricula, competencia, hash_documento, ip, user_agent, analise_status)
  values (h.id, u.id, u.gestor_id, p_tipo, nullif(trim(p_justificativa),''), u.nome, h.matricula, h.competencia,
      p_hash, split_part(coalesce(hdr->>'x-forwarded-for',''), ',', 1), hdr->>'user-agent',
      case p_tipo when 'aceite' then 'resolvida' else 'aberta' end);
  update holerites set status = case p_tipo when 'aceite' then 'aceito' else 'contestado' end where id = h.id;
end $$;

create function public.resolver_contestacao(p_log uuid, p_parecer text) returns void
language plpgsql security definer set search_path=public as $$
begin
  update logs_assinatura_divergencia set analise_status='resolvida', parecer_gestor=p_parecer, analisado_em=now()
   where id = p_log and tipo='contestacao' and usuario_ativo() and (gestor_id = auth.uid() or eh_admin());
  if not found then raise exception 'Contestação não encontrada'; end if;
end $$;

create function public.confirmar_troca_senha() returns void language sql security definer set search_path=public as
$$ update usuarios set must_change_password = false where id = auth.uid() $$;

grant execute on function public.registrar_resposta, public.resolver_contestacao, public.confirmar_troca_senha to authenticated;
revoke execute on function public.registrar_resposta, public.resolver_contestacao, public.confirmar_troca_senha from anon, public;

-- ---------- Storage (bucket privado: {cpf}/{AAAA-MM}/{matricula}.pdf) ----------
insert into storage.buckets (id, name, public) values ('holerites','holerites',false) on conflict (id) do nothing;
create policy hol_select on storage.objects for select to authenticated
  using (bucket_id='holerites' and (eh_admin() or (storage.foldername(name))[1] = meu_cpf()));
create policy hol_insert on storage.objects for insert to authenticated with check (bucket_id='holerites' and eh_admin());
create policy hol_update on storage.objects for update to authenticated using (bucket_id='holerites' and eh_admin());
create policy hol_delete on storage.objects for delete to authenticated using (bucket_id='holerites' and eh_admin());

-- Realtime do alerta ao gestor (respeita RLS)
alter publication supabase_realtime add table public.logs_assinatura_divergencia;

-- ---------- 1º ADMIN (rode UMA vez) ----------
-- 1) Dashboard > Authentication > Users > Add user: e-mail <CPF>@cpf.onflow.app, senha forte, "Auto confirm".
-- 2) Troque o UUID e os dados:
-- insert into usuarios (id,cpf,nome,email,perfil,must_change_password)
-- values ('UUID-DO-AUTH-USER','00000000000','Seu Nome','voce@empresa.com','admin',false);
