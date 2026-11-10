-- =====================================================================
-- Placas Inteligentes (NFC + QR Dinâmico) — schema inicial
-- Modelo de segurança:
--   * RLS ligado em TODAS as tabelas. anon não tem policy => sem acesso direto.
--   * Admin = usuário do Supabase Auth presente em public.admin_users (policies via is_admin()).
--   * Fluxos públicos (scan, ativação, portal, feedback) passam por RPCs SECURITY DEFINER
--     que exigem a chave de servidor (APP_SERVER_KEY, só existe na Vercel) — a anon key
--     sozinha não consegue inflar contadores nem ler dados de placas.
--   * PIN / senha mestre com bloqueio por tentativas (anti força-bruta).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Placas
-- ---------------------------------------------------------------------
create table public.nfc_tags (
    id uuid default gen_random_uuid() primary key,
    seq_number serial,
    batch_name varchar(100) not null default 'Lote Inicial',
    slug varchar(16) unique not null,
    pin_code varchar(6) not null,
    status varchar(20) not null default 'UNCLAIMED' check (status in ('UNCLAIMED','ACTIVE','BLOCKED')),

    business_name varchar(150),
    client_name varchar(100),
    client_whatsapp varchar(30),
    logo_url text,

    routing_mode varchar(20) not null default 'DIRECT_REDIRECT' check (routing_mode in ('DIRECT_REDIRECT','SMART_FUNNEL')),
    target_type varchar(30) not null default 'GOOGLE_REVIEW' check (target_type in ('GOOGLE_REVIEW','INSTAGRAM','WHATSAPP','WIFI','CUSTOM')),
    target_url text,
    secondary_url text,
    allow_smart_funnel boolean not null default false,       -- recurso premium liberado pelo admin
    funnel_offer_public_review boolean not null default true, -- após feedback negativo, ainda oferece link do Google (mitiga política anti "review gating")

    billing_model varchar(20) default 'ONE_TIME' check (billing_model in ('ONE_TIME','MONTHLY')),
    monthly_fee numeric(10,2) default 0.00,
    next_due_date date,
    notes text,

    total_scans_nfc integer not null default 0,
    total_scans_qr integer not null default 0,

    nfc_written_at timestamptz,
    activated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
-- slug já tem índice pela UNIQUE constraint (índice extra seria redundante)
create index idx_nfc_tags_status on public.nfc_tags(status);
create index idx_nfc_tags_batch on public.nfc_tags(batch_name, seq_number);

-- ---------------------------------------------------------------------
-- 2. Telemetria
-- ---------------------------------------------------------------------
create table public.tag_scans (
    id uuid default gen_random_uuid() primary key,
    tag_id uuid not null references public.nfc_tags(id) on delete cascade,
    scanned_at timestamptz default now(),
    source varchar(10) not null check (source in ('nfc','qr')),
    device_os varchar(20),
    ip_city varchar(100),
    user_agent text
);
create index idx_tag_scans_tag_id_date on public.tag_scans(tag_id, scanned_at desc);

-- ---------------------------------------------------------------------
-- 3. Feedbacks privados
-- ---------------------------------------------------------------------
create table public.private_feedbacks (
    id uuid default gen_random_uuid() primary key,
    tag_id uuid not null references public.nfc_tags(id) on delete cascade,
    rating integer not null check (rating between 1 and 5),
    customer_name varchar(100),
    customer_contact varchar(100),
    comment text not null check (char_length(comment) between 1 and 2000),
    is_resolved boolean default false,
    created_at timestamptz default now()
);
create index idx_private_feedbacks_tag_id on public.private_feedbacks(tag_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. Suporte: admins, configurações, tentativas de PIN
-- ---------------------------------------------------------------------
create table public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz default now()
);

create table public.app_settings (
    id boolean primary key default true check (id),
    server_key text not null default encode(extensions.gen_random_bytes(32), 'hex'),
    setup_token text not null default encode(extensions.gen_random_bytes(12), 'hex'),
    master_password_hash text
);
insert into public.app_settings default values;

create table public.auth_attempts (
    id bigserial primary key,
    tag_id uuid not null references public.nfc_tags(id) on delete cascade,
    success boolean not null,
    attempted_at timestamptz default now()
);
create index idx_auth_attempts_tag on public.auth_attempts(tag_id, attempted_at desc);

-- ---------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_nfc_tags_updated before update on public.nfc_tags
for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public._check_server_key(p_key text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_key is null or not exists (select 1 from public.app_settings where server_key = p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end; $$;

-- true se a placa estiver travada por excesso de tentativas (8 erros em 15 min)
create or replace function public._is_locked(p_tag uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select count(*) >= 8 from public.auth_attempts
  where tag_id = p_tag and not success and attempted_at > now() - interval '15 minutes';
$$;

-- verifica PIN da placa OU senha mestre. Retorna 'pin' | 'master' | null. Registra tentativa.
create or replace function public._verify_credential(p_tag uuid, p_credential text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_pin text; v_hash text; v_kind text;
begin
  if public._is_locked(p_tag) then raise exception 'locked' using errcode = 'P0001'; end if;
  select pin_code into v_pin from public.nfc_tags where id = p_tag;
  select master_password_hash into v_hash from public.app_settings;
  if p_credential is not null and p_credential = v_pin then v_kind := 'pin';
  elsif p_credential is not null and v_hash is not null and extensions.crypt(p_credential, v_hash) = v_hash then v_kind := 'master';
  end if;
  insert into public.auth_attempts(tag_id, success) values (p_tag, v_kind is not null);
  delete from public.auth_attempts where attempted_at < now() - interval '1 day';
  return v_kind;
end; $$;

create or replace function public._valid_url(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or p ~* '^(https?://|WIFI:)';
$$;

-- ---------------------------------------------------------------------
-- 6. RPCs públicas (exigem server key)
-- ---------------------------------------------------------------------
create or replace function public.public_get_tag(p_key text, p_slug text)
returns table (id uuid, slug text, status text, business_name text, logo_url text,
               routing_mode text, target_type text, target_url text, secondary_url text,
               funnel_offer_public_review boolean, allow_smart_funnel boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._check_server_key(p_key);
  return query select t.id, t.slug::text, t.status::text, t.business_name::text, t.logo_url,
    t.routing_mode::text, t.target_type::text, t.target_url, t.secondary_url,
    t.funnel_offer_public_review, t.allow_smart_funnel
  from public.nfc_tags t where t.slug = lower(p_slug);
end; $$;

create or replace function public.register_tag_scan(
    p_key text, p_tag_id uuid, p_source varchar, p_device_os varchar, p_ip_city varchar, p_user_agent text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._check_server_key(p_key);
  insert into public.tag_scans (tag_id, source, device_os, ip_city, user_agent)
  values (p_tag_id, case when p_source = 'nfc' then 'nfc' else 'qr' end,
          left(p_device_os, 20), left(p_ip_city, 100), left(p_user_agent, 500));
  if p_source = 'nfc' then
    update public.nfc_tags set total_scans_nfc = total_scans_nfc + 1 where id = p_tag_id;
  else
    update public.nfc_tags set total_scans_qr = total_scans_qr + 1 where id = p_tag_id;
  end if;
end; $$;

create or replace function public.activate_tag(
    p_key text, p_slug text, p_credential text, p_business_name text, p_client_name text,
    p_client_whatsapp text, p_routing_mode text, p_target_type text, p_target_url text, p_secondary_url text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text; v_kind text; v_mode text;
begin
  perform public._check_server_key(p_key);
  select id, status into v_id, v_status from public.nfc_tags where slug = lower(p_slug) for update;
  if v_id is null then return 'not_found'; end if;
  if v_status <> 'UNCLAIMED' then return 'already_active'; end if;
  v_kind := public._verify_credential(v_id, p_credential);
  if v_kind is null then return 'invalid_credential'; end if;
  if coalesce(trim(p_business_name), '') = '' or coalesce(trim(p_target_url), '') = '' then return 'missing_fields'; end if;
  if not public._valid_url(p_target_url) or not public._valid_url(nullif(p_secondary_url, '')) then return 'invalid_url'; end if;
  -- Funil é premium: só o vendedor (senha mestre) pode ligar na ativação
  v_mode := case when p_routing_mode = 'SMART_FUNNEL' and v_kind = 'master' then 'SMART_FUNNEL' else 'DIRECT_REDIRECT' end;
  update public.nfc_tags set
    status = 'ACTIVE', business_name = left(trim(p_business_name),150), client_name = left(nullif(trim(p_client_name),''),100),
    client_whatsapp = left(nullif(trim(p_client_whatsapp),''),30), routing_mode = v_mode,
    target_type = case when p_target_type in ('GOOGLE_REVIEW','INSTAGRAM','WHATSAPP','WIFI','CUSTOM') then p_target_type else 'CUSTOM' end,
    target_url = trim(p_target_url), secondary_url = nullif(trim(p_secondary_url),''),
    allow_smart_funnel = allow_smart_funnel or v_mode = 'SMART_FUNNEL',
    activated_at = now()
  where id = v_id;
  return 'ok:' || v_kind;
exception when sqlstate 'P0001' then return 'locked';
end; $$;

create or replace function public.portal_login(p_key text, p_slug text, p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_pin text;
begin
  perform public._check_server_key(p_key);
  select id, pin_code into v_id, v_pin from public.nfc_tags where slug = lower(p_slug) and status <> 'UNCLAIMED';
  if v_id is null then return 'not_found'; end if;
  if public._is_locked(v_id) then return 'locked'; end if;
  insert into public.auth_attempts(tag_id, success) values (v_id, p_pin = v_pin);
  if p_pin = v_pin then return 'ok:' || encode(extensions.digest(v_pin || v_id::text, 'sha256'), 'hex'); end if;
  return 'invalid';
end; $$;

-- fingerprint do PIN atual, usado para invalidar sessões do portal quando o PIN muda
create or replace function public._pin_fp(p_tag uuid) returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(pin_code || id::text, 'sha256'), 'hex') from public.nfc_tags where id = p_tag;
$$;

create or replace function public.portal_get(p_key text, p_slug text, p_fp text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_tag public.nfc_tags; v_res jsonb;
begin
  perform public._check_server_key(p_key);
  select * into v_tag from public.nfc_tags where slug = lower(p_slug);
  if v_tag.id is null or public._pin_fp(v_tag.id) <> p_fp then return null; end if;
  select jsonb_build_object(
    'tag', jsonb_build_object('slug', v_tag.slug, 'status', v_tag.status, 'business_name', v_tag.business_name,
        'routing_mode', v_tag.routing_mode, 'target_type', v_tag.target_type, 'target_url', v_tag.target_url,
        'secondary_url', v_tag.secondary_url, 'allow_smart_funnel', v_tag.allow_smart_funnel,
        'total_scans_nfc', v_tag.total_scans_nfc, 'total_scans_qr', v_tag.total_scans_qr,
        'activated_at', v_tag.activated_at),
    'daily', coalesce((select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object('day', g.day::date, 'nfc', count(s.id) filter (where s.source='nfc'),
                                  'qr', count(s.id) filter (where s.source='qr')) d
        from generate_series((now() at time zone 'America/Sao_Paulo')::date - 29, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') g(day)
        left join public.tag_scans s on s.tag_id = v_tag.id and s.scanned_at > now() - interval '31 days'
             and (s.scanned_at at time zone 'America/Sao_Paulo')::date = g.day::date
        group by g.day) x), '[]'::jsonb),
    'feedbacks', coalesce((select jsonb_agg(to_jsonb(f) - 'tag_id' order by f.created_at desc) from (
        select * from public.private_feedbacks where tag_id = v_tag.id order by created_at desc limit 100) f), '[]'::jsonb)
  ) into v_res;
  return v_res;
end; $$;

create or replace function public.portal_update_target(
    p_key text, p_slug text, p_fp text, p_routing_mode text, p_target_type text, p_target_url text, p_secondary_url text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_tag public.nfc_tags;
begin
  perform public._check_server_key(p_key);
  select * into v_tag from public.nfc_tags where slug = lower(p_slug);
  if v_tag.id is null or public._pin_fp(v_tag.id) <> p_fp then return 'unauthorized'; end if;
  if v_tag.status <> 'ACTIVE' then return 'not_active'; end if;
  if coalesce(trim(p_target_url),'') = '' or not public._valid_url(p_target_url) or not public._valid_url(nullif(p_secondary_url,'')) then return 'invalid_url'; end if;
  if p_routing_mode = 'SMART_FUNNEL' and not v_tag.allow_smart_funnel then return 'funnel_not_allowed'; end if;
  update public.nfc_tags set
    routing_mode = case when p_routing_mode = 'SMART_FUNNEL' then 'SMART_FUNNEL' else 'DIRECT_REDIRECT' end,
    target_type = case when p_target_type in ('GOOGLE_REVIEW','INSTAGRAM','WHATSAPP','WIFI','CUSTOM') then p_target_type else 'CUSTOM' end,
    target_url = trim(p_target_url), secondary_url = nullif(trim(p_secondary_url),'')
  where id = v_tag.id;
  return 'ok';
end; $$;

create or replace function public.portal_resolve_feedback(p_key text, p_slug text, p_fp text, p_feedback_id uuid, p_resolved boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._check_server_key(p_key);
  select id into v_id from public.nfc_tags where slug = lower(p_slug);
  if v_id is null or public._pin_fp(v_id) <> p_fp then return 'unauthorized'; end if;
  update public.private_feedbacks set is_resolved = p_resolved where id = p_feedback_id and tag_id = v_id;
  return 'ok';
end; $$;

create or replace function public.submit_feedback(
    p_key text, p_slug text, p_rating int, p_name text, p_contact text, p_comment text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tag public.nfc_tags;
begin
  perform public._check_server_key(p_key);
  select * into v_tag from public.nfc_tags where slug = lower(p_slug);
  if v_tag.id is null or v_tag.status <> 'ACTIVE' then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if coalesce(trim(p_comment),'') = '' or p_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  -- anti-spam: no máx. 30 feedbacks/hora por placa
  if (select count(*) from public.private_feedbacks where tag_id = v_tag.id and created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  insert into public.private_feedbacks(tag_id, rating, customer_name, customer_contact, comment)
  values (v_tag.id, p_rating, left(nullif(trim(p_name),''),100), left(nullif(trim(p_contact),''),100), left(trim(p_comment),2000));
  return jsonb_build_object('ok', true, 'business_name', v_tag.business_name, 'client_whatsapp', v_tag.client_whatsapp, 'slug', v_tag.slug);
end; $$;

-- ---------------------------------------------------------------------
-- 7. RPCs de admin (exigem usuário admin autenticado)
-- ---------------------------------------------------------------------
create or replace function public.claim_first_admin(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return 'not_logged_in'; end if;
  if exists (select 1 from public.admin_users) then return 'already_claimed'; end if;
  if not exists (select 1 from public.app_settings where setup_token = p_token) then return 'invalid_token'; end if;
  insert into public.admin_users(user_id) values (auth.uid());
  return 'ok';
end; $$;

create or replace function public.admin_set_master_password(p_password text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(coalesce(p_password,'')) < 8 then return 'too_short'; end if;
  update public.app_settings set master_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  return 'ok';
end; $$;

create or replace function public.admin_has_master_password() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select master_password_hash is not null from public.app_settings);
end; $$;

create or replace function public.admin_generate_batch(p_batch_name text, p_quantity int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz'; -- sem 0/o/1/l/i
  v_slug text; v_pin text; v_created int := 0; v_bytes bytea; i int;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 1000 then raise exception 'quantidade deve ser entre 1 e 1000'; end if;
  if coalesce(trim(p_batch_name),'') = '' then raise exception 'nome do lote obrigatório'; end if;
  while v_created < p_quantity loop
    v_bytes := extensions.gen_random_bytes(12);
    v_slug := '';
    for i in 0..9 loop v_slug := v_slug || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1); end loop;
    v_pin := lpad(((get_byte(v_bytes,10) * 256 + get_byte(v_bytes,11)) % 10000)::text, 4, '0');
    begin
      insert into public.nfc_tags(batch_name, slug, pin_code) values (left(trim(p_batch_name),100), v_slug, v_pin);
      v_created := v_created + 1;
    exception when unique_violation then null; -- colisão rara: tenta de novo
    end;
  end loop;
  return v_created;
end; $$;

create or replace function public.admin_kpis() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select jsonb_build_object(
    'active', count(*) filter (where status='ACTIVE'),
    'unclaimed', count(*) filter (where status='UNCLAIMED'),
    'blocked', count(*) filter (where status='BLOCKED'),
    'mrr', coalesce(sum(monthly_fee) filter (where status='ACTIVE' and billing_model='MONTHLY'),0),
    'overdue', count(*) filter (where status='ACTIVE' and billing_model='MONTHLY' and next_due_date < (now() at time zone 'America/Sao_Paulo')::date),
    'scans_nfc', coalesce(sum(total_scans_nfc),0),
    'scans_qr', coalesce(sum(total_scans_qr),0),
    'funnel_active', count(*) filter (where status='ACTIVE' and routing_mode='SMART_FUNNEL'),
    'feedbacks_total', (select count(*) from public.private_feedbacks),
    'feedbacks_open', (select count(*) from public.private_feedbacks where not is_resolved),
    'scans_30d', (select count(*) from public.tag_scans where scanned_at > now() - interval '30 days'),
    'daily', coalesce((select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object('day', g.day::date, 'nfc', count(s.id) filter (where s.source='nfc'),
                                  'qr', count(s.id) filter (where s.source='qr')) d
        from generate_series((now() at time zone 'America/Sao_Paulo')::date - 29, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') g(day)
        left join public.tag_scans s on s.scanned_at > now() - interval '31 days'
             and (s.scanned_at at time zone 'America/Sao_Paulo')::date = g.day::date
        group by g.day) x), '[]'::jsonb)
  ) from public.nfc_tags);
end; $$;

create or replace function public.admin_batches() returns table(batch_name text, total bigint, unclaimed bigint, written bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select t.batch_name::text, count(*), count(*) filter (where t.status='UNCLAIMED'),
    count(*) filter (where t.nfc_written_at is not null), min(t.created_at)
  from public.nfc_tags t group by t.batch_name order by min(t.created_at) desc;
end; $$;

-- ---------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------
alter table public.nfc_tags enable row level security;
alter table public.tag_scans enable row level security;
alter table public.private_feedbacks enable row level security;
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.auth_attempts enable row level security;

create policy admin_all_tags on public.nfc_tags for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_all_scans on public.tag_scans for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_all_feedbacks on public.private_feedbacks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_read_self on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
-- app_settings e auth_attempts: sem policies => inacessíveis via API

-- ---------------------------------------------------------------------
-- 9. Grants: funções internas não são expostas
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.public_get_tag(text,text) to anon, authenticated;
grant execute on function public.register_tag_scan(text,uuid,varchar,varchar,varchar,text) to anon, authenticated;
grant execute on function public.activate_tag(text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.portal_login(text,text,text) to anon, authenticated;
grant execute on function public.portal_get(text,text,text) to anon, authenticated;
grant execute on function public.portal_update_target(text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.portal_resolve_feedback(text,text,text,uuid,boolean) to anon, authenticated;
grant execute on function public.submit_feedback(text,text,int,text,text,text) to anon, authenticated;
grant execute on function public.claim_first_admin(text) to authenticated;
grant execute on function public.admin_set_master_password(text) to authenticated;
grant execute on function public.admin_has_master_password() to authenticated;
grant execute on function public.admin_generate_batch(text,int) to authenticated;
grant execute on function public.admin_kpis() to authenticated;
grant execute on function public.admin_batches() to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
