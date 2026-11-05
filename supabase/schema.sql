-- =====================================================================
-- CALIBRA — Suivi accréditation ALGERAC : base Supabase
-- À coller UNE FOIS dans Supabase › SQL Editor › New query › Run.
-- Aucun secret dans ce fichier. Peut être relancé sans danger.
-- =====================================================================

-- 1. Qui a le droit d'accéder aux données (liste d'autorisation, côté serveur)
--    Toute adresse @calibraes.com + l'administrateur QHSE.
create or replace function public.is_allowed() returns boolean
language sql stable as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') like '%@calibraes.com'
    or lower(auth.jwt() ->> 'email') = 'belkhodja.brahim@live.fr',
    false)
$$;

-- 2. Documents : une ligne par tâche / clause / jalon / preuve / commentaire / config
create table if not exists public.docs (
  col        text        not null,               -- tasks | jalons | evidence | comments | clauses | config
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false, -- jamais de suppression physique
  version    integer     not null default 1,     -- contrôle des modifications simultanées
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

-- 3. Journal d'audit (ISO/IEC 17020 §8.4) : écrit uniquement par le serveur, jamais modifiable
create table if not exists public.audit (
  n      bigserial   primary key,
  at     timestamptz not null default now(),
  email  text,
  col    text,
  id     text,
  action text,        -- insert | update | delete (= retrait logique)
  before jsonb,
  after  jsonb
);

-- 4. Le serveur fixe l'auteur, l'heure et la version (le navigateur ne peut pas tricher)
create or replace function public.docs_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_by := lower(auth.jwt() ->> 'email');
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.col <> old.col or new.id <> old.id then
      raise exception 'col/id non modifiables';
    end if;
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  return new;
end $$;

create or replace function public.docs_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit(email, col, id, action, before, after)
  values (
    new.updated_by, new.col, new.id,
    case when tg_op = 'INSERT' then 'insert'
         when new.deleted and not old.deleted then 'delete'
         else 'update' end,
    case when tg_op = 'UPDATE' then old.data end,
    case when new.deleted then null else new.data end);
  return null;
end $$;

drop trigger if exists docs_stamp on public.docs;
create trigger docs_stamp before insert or update on public.docs
  for each row execute function public.docs_stamp();
drop trigger if exists docs_audit on public.docs;
create trigger docs_audit after insert or update on public.docs
  for each row execute function public.docs_audit();

-- 5. Règles d'accès (RLS) : lecture / création / modification pour les comptes autorisés.
--    Aucune règle de suppression → suppression physique impossible depuis l'application.
alter table public.docs  enable row level security;
alter table public.audit enable row level security;

drop policy if exists docs_read   on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
drop policy if exists audit_read  on public.audit;
create policy docs_read   on public.docs  for select to authenticated using (public.is_allowed());
-- La configuration (équipe = qui est qui, date de démarrage) n'est modifiable que par l'administrateur :
-- sinon un membre pourrait s'associer au nom d'Ali et valider ses décisions.
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = 'belkhodja.brahim@live.fr'
    or (lower(auth.jwt() ->> 'email') like '%@calibraes.com'
        and 'brahim' = any(regexp_split_to_array(split_part(lower(auth.jwt() ->> 'email'), '@', 1), '[^a-z]+'))),
    false)
$$;
create policy docs_insert on public.docs  for insert to authenticated
  with check (public.is_allowed() and (col <> 'config' or public.is_admin()));
create policy docs_update on public.docs  for update to authenticated
  using (public.is_allowed()) with check (public.is_allowed() and (col <> 'config' or public.is_admin()));
create policy audit_read  on public.audit for select to authenticated using (public.is_allowed());

-- 6. Mises à jour en direct (Realtime) sur la table docs
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 7. Stockage des preuves : espace privé « evidence », 50 Mo max par fichier, tous formats
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists evidence_read   on storage.objects;
drop policy if exists evidence_insert on storage.objects;
create policy evidence_read   on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.is_allowed());
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_allowed());
-- Pas de règle update/delete : un fichier déposé ne peut être ni remplacé ni effacé.
