-- PER04 + PER03 (resto): notificaciones al dueño por Web Push (2026-11-16).
--
-- Cómo funciona:
--   1. Cada dispositivo del dueño que acepta recibir avisos guarda su
--      suscripción en `suscripciones_push` (una fila por navegador).
--   2. Cuando pasa algo que el dueño tiene que saber (ver triggers más abajo),
--      se inserta una fila en `notificaciones`. Esa tabla es el historial y la
--      cola a la vez: nunca se borra (bajas lógicas, como todo el sistema).
--   3. Un trigger sobre `notificaciones` llama con pg_net a la Edge Function
--      `notificar`, que firma y envía el push a cada suscripción del dueño y
--      marca la fila como enviada. Si la función falla, la fila queda sin
--      `enviada_en` y se ve en la base; nada se pierde en silencio.
--
-- El secreto que autentica la llamada a la Edge Function se guarda en Vault
-- (`vault.create_secret(..., 'notificar_secret')`), nunca en esta migración.
--
-- Qué dispara una notificación (una sola por hecho, aunque intervengan varias
-- tablas en la misma transacción):
--   - escaneos:      se abrió una posible pérdida (escaneo lejos de casa), o
--                    escanearon la placa de una mascota con caso abierto.
--   - avistamientos: alguien avisó que la vio (siempre), con la distancia a
--                    su casa cuando hay ubicación.
--   - casos_perdida: pasó sola a `perdida` por falta de respuesta del dueño.
--
-- PER03 b) `escalar_casos_sin_respuesta()` corre cada 15 minutos con pg_cron:
-- si una posible pérdida lleva más de `mascotas.horas_confirmacion` horas sin
-- que el dueño la confirme ni la descarte, pasa a `perdida`.

-- ---------------------------------------------------------------------------
-- 1. Suscripciones de push
-- ---------------------------------------------------------------------------
create table if not exists public.suscripciones_push (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references public.perfiles(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  navegador       text,
  creado_en       timestamptz not null default now(),
  ultimo_envio_en timestamptz
);

create index if not exists suscripciones_push_perfil_idx on public.suscripciones_push (perfil_id);

alter table public.suscripciones_push enable row level security;

drop policy if exists suscripciones_push_propias_select on public.suscripciones_push;
create policy suscripciones_push_propias_select on public.suscripciones_push
  for select to authenticated using (auth.uid() = perfil_id);

drop policy if exists suscripciones_push_propias_insert on public.suscripciones_push;
create policy suscripciones_push_propias_insert on public.suscripciones_push
  for insert to authenticated with check (auth.uid() = perfil_id);

drop policy if exists suscripciones_push_propias_update on public.suscripciones_push;
create policy suscripciones_push_propias_update on public.suscripciones_push
  for update to authenticated using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

drop policy if exists suscripciones_push_propias_delete on public.suscripciones_push;
create policy suscripciones_push_propias_delete on public.suscripciones_push
  for delete to authenticated using (auth.uid() = perfil_id);

-- ---------------------------------------------------------------------------
-- 2. Notificaciones (historial + cola)
-- ---------------------------------------------------------------------------
create table if not exists public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  mascota_id  uuid references public.mascotas(id) on delete set null,
  tipo        text not null check (tipo in ('posible_perdida', 'escaneo', 'avistamiento', 'perdida_automatica')),
  titulo      text not null,
  cuerpo      text not null,
  url         text not null,
  creado_en   timestamptz not null default now(),
  enviada_en  timestamptz,
  resultado   jsonb
);

create index if not exists notificaciones_perfil_idx on public.notificaciones (perfil_id, creado_en desc);

alter table public.notificaciones enable row level security;

drop policy if exists notificaciones_propias_select on public.notificaciones;
create policy notificaciones_propias_select on public.notificaciones
  for select to authenticated using (auth.uid() = perfil_id);

-- Las escribe solo la base (triggers) y las actualiza la Edge Function con
-- service_role; ningún rol del navegador puede insertarlas ni modificarlas.

-- ---------------------------------------------------------------------------
-- 3. Plazo de confirmación por mascota (PER03 b)
-- ---------------------------------------------------------------------------
alter table public.mascotas
  add column if not exists horas_confirmacion int not null default 24
    constraint mascotas_horas_confirmacion_check check (horas_confirmacion between 1 and 168);

-- ---------------------------------------------------------------------------
-- 4. Envío: trigger sobre notificaciones → Edge Function `notificar`
-- ---------------------------------------------------------------------------
create or replace function public.enviar_notificacion_push()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net', 'vault'
as $$
declare
  v_secreto text;
begin
  select decrypted_secret into v_secreto
  from vault.decrypted_secrets
  where name = 'notificar_secret'
  limit 1;

  -- Sin secreto configurado no se intenta: la fila queda en la cola, visible.
  if v_secreto is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://pgnxanjiswmytdocdhuw.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notificar-secret', v_secreto
    ),
    body    := jsonb_build_object('id', new.id),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

drop trigger if exists notificaciones_enviar on public.notificaciones;
create trigger notificaciones_enviar
  after insert on public.notificaciones
  for each row execute function public.enviar_notificacion_push();

-- ---------------------------------------------------------------------------
-- 5. Ayudas: distancia legible y encolado
-- ---------------------------------------------------------------------------
create or replace function public.distancia_legible(p_metros double precision)
returns text
language sql
immutable
as $$
  select case
    when p_metros is null then null
    when p_metros < 1000 then round(p_metros)::int || ' m'
    else replace(round((p_metros / 1000)::numeric, 1)::text, '.', ',') || ' km'
  end
$$;

create or replace function public.encolar_notificacion(
  p_perfil_id uuid, p_mascota_id uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text
)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.notificaciones (perfil_id, mascota_id, tipo, titulo, cuerpo, url)
  values (p_perfil_id, p_mascota_id, p_tipo, p_titulo, p_cuerpo, p_url)
$$;

-- ---------------------------------------------------------------------------
-- 6. Qué hechos avisan
-- ---------------------------------------------------------------------------

-- Escaneo de placa (lo inserta registrar_escaneo). Un escaneo cerca de casa y
-- sin caso abierto no avisa nada: sería ruido en cada paseo.
create or replace function public.notificar_escaneo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mascota mascotas%rowtype;
  v_caso    casos_perdida%rowtype;
  v_dist    text;
  v_url     text;
begin
  if new.mascota_id is null then return new; end if;

  select * into v_mascota from mascotas where id = new.mascota_id;
  if not found then return new; end if;

  -- El caso lo abre registrar_escaneo DESPUÉS de insertar el escaneo, así que
  -- acá todavía no existe. Se decide igual que allá: fuera del radio y sin
  -- modo paseo, y sin caso abierto previo → posible pérdida nueva.
  select * into v_caso from casos_perdida
   where mascota_id = v_mascota.id and estado in ('posible_perdida', 'perdida')
   limit 1;

  v_dist := distancia_legible(new.distancia_m);
  v_url  := '/panel';

  if v_caso.id is null then
    if new.distancia_m is not null
       and new.distancia_m > v_mascota.radio_metros
       and (v_mascota.pausado_hasta is null or v_mascota.pausado_hasta < now()) then
      perform encolar_notificacion(
        v_mascota.dueno_id, v_mascota.id, 'posible_perdida',
        '¿' || v_mascota.nombre || ' está perdida?',
        'Escanearon su placa a ' || v_dist || ' de tu casa. Confirmá o descartá la pérdida.',
        v_url);
    end if;
  else
    perform encolar_notificacion(
      v_mascota.dueno_id, v_mascota.id, 'escaneo',
      'Escanearon la placa de ' || v_mascota.nombre,
      case when v_dist is null then 'Alguien acaba de escanear su placa.'
           else 'Alguien acaba de escanear su placa a ' || v_dist || ' de tu casa.' end,
      '/mascotas/' || v_mascota.id || '/mapa');
  end if;

  return new;
end;
$$;

drop trigger if exists escaneos_notificar on public.escaneos;
create trigger escaneos_notificar
  after insert on public.escaneos
  for each row execute function public.notificar_escaneo();

-- Aviso deliberado (lo inserta registrar_avistamiento). Siempre avisa.
create or replace function public.notificar_avistamiento()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mascota mascotas%rowtype;
  v_caso    casos_perdida%rowtype;
  v_metros  double precision;
  v_dist    text;
  v_cuerpo  text;
begin
  select * into v_mascota from mascotas where id = new.mascota_id;
  if not found then return new; end if;

  if new.lat is not null and v_mascota.domicilio_lat is not null then
    v_metros := distancia_metros(new.lat, new.lng, v_mascota.domicilio_lat, v_mascota.domicilio_lng);
  end if;
  v_dist := distancia_legible(v_metros);

  v_cuerpo := case new.situacion
    when 'conmigo' then 'Está con la persona que avisó'
    when 'la_vi_pasar' then 'La vieron pasar'
    else 'Alguien avisó que la vio'
  end;
  if v_dist is not null then
    v_cuerpo := v_cuerpo || ', a ' || v_dist || ' de tu casa';
  end if;
  v_cuerpo := v_cuerpo || '.';

  -- Si el aviso abrió el caso en esta misma transacción, se dice acá y no en
  -- una segunda notificación.
  select * into v_caso from casos_perdida where id = new.caso_id;
  if v_caso.id is not null and v_caso.estado = 'posible_perdida' and v_caso.iniciado_en = now() then
    v_cuerpo := v_cuerpo || ' Confirmá o descartá la pérdida en el panel.';
  end if;

  perform encolar_notificacion(
    v_mascota.dueno_id, v_mascota.id, 'avistamiento',
    'Alguien vio a ' || v_mascota.nombre,
    v_cuerpo,
    '/mascotas/' || v_mascota.id || '/mapa');

  return new;
end;
$$;

drop trigger if exists avistamientos_notificar on public.avistamientos;
create trigger avistamientos_notificar
  after insert on public.avistamientos
  for each row execute function public.notificar_avistamiento();

-- ---------------------------------------------------------------------------
-- 7. PER03 b: paso automático a `perdida` por falta de respuesta
-- ---------------------------------------------------------------------------
create or replace function public.escalar_casos_sin_respuesta()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caso    record;
  v_total   int := 0;
begin
  for v_caso in
    select c.id, c.mascota_id, m.dueno_id, m.nombre, m.horas_confirmacion
    from casos_perdida c
    join mascotas m on m.id = c.mascota_id
    where c.estado = 'posible_perdida'
      and c.iniciado_en < now() - make_interval(hours => m.horas_confirmacion)
  loop
    update casos_perdida set estado = 'perdida' where id = v_caso.id and estado = 'posible_perdida';
    perform encolar_notificacion(
      v_caso.dueno_id, v_caso.mascota_id, 'perdida_automatica',
      v_caso.nombre || ' pasó a perdida',
      'Pasaron ' || v_caso.horas_confirmacion || ' h sin respuesta a la posible pérdida. Si está con vos, cerrá el caso desde el panel.',
      '/panel');
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.escalar_casos_sin_respuesta() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'escalar-casos-sin-respuesta';
select cron.schedule('escalar-casos-sin-respuesta', '*/15 * * * *', $$select public.escalar_casos_sin_respuesta()$$);

-- ---------------------------------------------------------------------------
-- 8. Permisos: nada de esto lo llama el navegador directamente
-- ---------------------------------------------------------------------------
revoke all on function public.encolar_notificacion(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.enviar_notificacion_push() from public, anon, authenticated;
revoke all on function public.notificar_escaneo() from public, anon, authenticated;
revoke all on function public.notificar_avistamiento() from public, anon, authenticated;
