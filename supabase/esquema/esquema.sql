-- Esquema de la base de Huella Blanca (Supabase, esquema public + Storage).
--
-- ARCHIVO GENERADO por supabase/esquema/exportar.mjs (npm run esquema:exportar)
-- leyendo el catálogo de la base en producción. No editar a mano: después de
-- cambiar la base, volver a generarlo y commitearlo junto con la migración.
--
-- Es una foto del esquema, no una migración: sirve para reconstruir la base
-- en un proyecto nuevo de Supabase (que ya trae auth, storage, los roles anon,
-- authenticated y service_role, y las extensiones disponibles) o para ver de
-- un vistazo cómo está hoy. No incluye datos ni valores secretos.

set check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.avistamientos (
  id uuid default gen_random_uuid() not null,
  mascota_id uuid not null,
  caso_id uuid,
  escaneo_id uuid,
  lat double precision,
  lng double precision,
  origen text default 'gps'::text not null,
  situacion text,
  mensaje text,
  foto_url text,
  contacto text,
  reportado_por uuid,
  creado_en timestamp with time zone default now() not null
);

create table public.casos_perdida (
  id uuid default gen_random_uuid() not null,
  mascota_id uuid not null,
  estado text default 'posible_perdida'::text not null,
  origen text default 'manual'::text not null,
  mensaje text,
  ultima_lat double precision,
  ultima_lng double precision,
  iniciado_en timestamp with time zone default now() not null,
  cerrado_en timestamp with time zone,
  rescatista_id uuid,
  mensaje_agradecimiento text,
  foto_reencuentro_url text,
  escalado_en timestamp with time zone
);

create table public.escaneos (
  id uuid default gen_random_uuid() not null,
  placa_id uuid,
  mascota_id uuid,
  lat double precision,
  lng double precision,
  distancia_m integer,
  ocurrido_en timestamp with time zone default now() not null
);

create table public.mascotas (
  id uuid default gen_random_uuid() not null,
  dueno_id uuid not null,
  nombre text not null,
  especie text not null,
  raza text,
  tamano text,
  color text,
  senas text,
  caracter text,
  foto_url text,
  domicilio_lat double precision,
  domicilio_lng double precision,
  radio_metros integer default 100 not null,
  pausado_hasta timestamp with time zone,
  mostrar_salud boolean default false not null,
  salud text,
  activa boolean default true not null,
  creado_en timestamp with time zone default now() not null,
  sexo text,
  visibilidad_senas text default 'publico'::text not null,
  visibilidad_salud text default 'privado'::text not null,
  horas_confirmacion integer default 24 not null
);

create table public.notificaciones (
  id uuid default gen_random_uuid() not null,
  perfil_id uuid not null,
  mascota_id uuid,
  tipo text not null,
  titulo text not null,
  cuerpo text not null,
  url text not null,
  creado_en timestamp with time zone default now() not null,
  enviada_en timestamp with time zone,
  resultado jsonb,
  prioritaria boolean default false not null
);

create table public.perfiles (
  id uuid not null,
  nombre text not null,
  telefono text,
  rol text default 'usuario'::text not null,
  creado_en timestamp with time zone default now() not null,
  privacidad_aceptada_en timestamp with time zone
);

create table public.placas (
  id uuid default gen_random_uuid() not null,
  codigo text not null,
  mascota_id uuid,
  estado text default 'activa'::text not null,
  creado_en timestamp with time zone default now() not null
);

create table public.suscripciones_push (
  id uuid default gen_random_uuid() not null,
  perfil_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  navegador text,
  creado_en timestamp with time zone default now() not null,
  ultimo_envio_en timestamp with time zone
);

create table public.uso_ia (
  id bigint generated always as identity not null,
  perfil_id uuid not null,
  funcion text not null,
  creado_en timestamp with time zone default now() not null
);

-- ---------------------------------------------------------------------------
-- Restricciones (claves, únicas, checks; las foráneas al final)
-- ---------------------------------------------------------------------------
alter table public.avistamientos add constraint avistamientos_pkey PRIMARY KEY (id);
alter table public.avistamientos add constraint avistamientos_origen_check CHECK ((origen = ANY (ARRAY['gps'::text, 'manual'::text])));
alter table public.avistamientos add constraint avistamientos_situacion_check CHECK ((situacion = ANY (ARRAY['conmigo'::text, 'la_vi_pasar'::text])));
alter table public.casos_perdida add constraint casos_perdida_pkey PRIMARY KEY (id);
alter table public.casos_perdida add constraint casos_perdida_estado_check CHECK ((estado = ANY (ARRAY['posible_perdida'::text, 'perdida'::text, 'cerrada'::text, 'descartada'::text])));
alter table public.casos_perdida add constraint casos_perdida_origen_check CHECK ((origen = ANY (ARRAY['manual'::text, 'automatico'::text])));
alter table public.escaneos add constraint escaneos_pkey PRIMARY KEY (id);
alter table public.mascotas add constraint mascotas_pkey PRIMARY KEY (id);
alter table public.mascotas add constraint mascotas_caracter_check CHECK ((caracter = ANY (ARRAY['amigable'::text, 'temerosa'::text, 'no_acercarse'::text])));
alter table public.mascotas add constraint mascotas_especie_check CHECK ((especie = ANY (ARRAY['perro'::text, 'gato'::text, 'otro'::text])));
alter table public.mascotas add constraint mascotas_horas_confirmacion_check CHECK (((horas_confirmacion >= 1) AND (horas_confirmacion <= 168)));
alter table public.mascotas add constraint mascotas_sexo_check CHECK ((sexo = ANY (ARRAY['macho'::text, 'hembra'::text])));
alter table public.mascotas add constraint mascotas_tamano_check CHECK ((tamano = ANY (ARRAY['pequeno'::text, 'mediano'::text, 'grande'::text])));
alter table public.mascotas add constraint mascotas_visibilidad_salud_check CHECK ((visibilidad_salud = ANY (ARRAY['publico'::text, 'perdida'::text, 'privado'::text])));
alter table public.mascotas add constraint mascotas_visibilidad_senas_check CHECK ((visibilidad_senas = ANY (ARRAY['publico'::text, 'perdida'::text, 'privado'::text])));
alter table public.notificaciones add constraint notificaciones_pkey PRIMARY KEY (id);
alter table public.notificaciones add constraint notificaciones_tipo_check CHECK ((tipo = ANY (ARRAY['posible_perdida'::text, 'escaneo'::text, 'avistamiento'::text, 'perdida_automatica'::text])));
alter table public.perfiles add constraint perfiles_pkey PRIMARY KEY (id);
alter table public.perfiles add constraint perfiles_rol_check CHECK ((rol = ANY (ARRAY['usuario'::text, 'admin'::text])));
alter table public.perfiles add constraint perfiles_telefono_e164 CHECK (((telefono IS NULL) OR (telefono ~ '^\+[1-9][0-9]{7,14}$'::text)));
alter table public.placas add constraint placas_pkey PRIMARY KEY (id);
alter table public.placas add constraint placas_codigo_key UNIQUE (codigo);
alter table public.placas add constraint placas_estado_check CHECK ((estado = ANY (ARRAY['sin_asignar'::text, 'activa'::text, 'baja'::text])));
alter table public.suscripciones_push add constraint suscripciones_push_pkey PRIMARY KEY (id);
alter table public.suscripciones_push add constraint suscripciones_push_endpoint_key UNIQUE (endpoint);
alter table public.uso_ia add constraint uso_ia_pkey PRIMARY KEY (id);
alter table public.uso_ia add constraint uso_ia_funcion_check CHECK ((funcion = ANY (ARRAY['sugerir-ficha'::text, 'subir-foto'::text])));

alter table public.avistamientos add constraint avistamientos_caso_id_fkey FOREIGN KEY (caso_id) REFERENCES casos_perdida(id) ON DELETE SET NULL;
alter table public.avistamientos add constraint avistamientos_escaneo_id_fkey FOREIGN KEY (escaneo_id) REFERENCES escaneos(id) ON DELETE SET NULL;
alter table public.avistamientos add constraint avistamientos_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE;
alter table public.avistamientos add constraint avistamientos_reportado_por_fkey FOREIGN KEY (reportado_por) REFERENCES perfiles(id) ON DELETE SET NULL;
alter table public.casos_perdida add constraint casos_perdida_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE;
alter table public.casos_perdida add constraint casos_perdida_rescatista_id_fkey FOREIGN KEY (rescatista_id) REFERENCES perfiles(id) ON DELETE SET NULL;
alter table public.escaneos add constraint escaneos_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL;
alter table public.escaneos add constraint escaneos_placa_id_fkey FOREIGN KEY (placa_id) REFERENCES placas(id) ON DELETE SET NULL;
alter table public.mascotas add constraint mascotas_dueno_id_fkey FOREIGN KEY (dueno_id) REFERENCES perfiles(id) ON DELETE CASCADE;
alter table public.notificaciones add constraint notificaciones_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL;
alter table public.notificaciones add constraint notificaciones_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE;
alter table public.perfiles add constraint perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.placas add constraint placas_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL;
alter table public.suscripciones_push add constraint suscripciones_push_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE;
alter table public.uso_ia add constraint uso_ia_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX idx_avist_caso ON public.avistamientos USING btree (caso_id, creado_en DESC);
CREATE UNIQUE INDEX idx_caso_abierto_unico ON public.casos_perdida USING btree (mascota_id) WHERE (estado = ANY (ARRAY['posible_perdida'::text, 'perdida'::text]));
CREATE INDEX idx_casos_mascota ON public.casos_perdida USING btree (mascota_id);
CREATE INDEX idx_escaneos_mascota ON public.escaneos USING btree (mascota_id, ocurrido_en DESC);
CREATE INDEX idx_mascotas_dueno ON public.mascotas USING btree (dueno_id);
CREATE INDEX notificaciones_mascota_fecha_idx ON public.notificaciones USING btree (mascota_id, creado_en DESC);
CREATE INDEX notificaciones_perfil_idx ON public.notificaciones USING btree (perfil_id, creado_en DESC);
CREATE INDEX idx_placas_codigo ON public.placas USING btree (codigo);
CREATE INDEX suscripciones_push_perfil_idx ON public.suscripciones_push USING btree (perfil_id);
CREATE INDEX uso_ia_perfil_fecha ON public.uso_ia USING btree (perfil_id, creado_en DESC);

-- ---------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_detalle_cuenta(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_resultado json;
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  select json_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'telefono', p.telefono,
    'rol', p.rol,
    'creado_en', p.creado_en,
    'email', u.email,
    'ultimo_ingreso', u.last_sign_in_at,
    'avisos_dados', (select count(*) from public.avistamientos a where a.reportado_por = p.id),
    'mascotas', coalesce((
      select json_agg(json_build_object(
        'id', m.id,
        'nombre', m.nombre,
        'especie', m.especie,
        'raza', m.raza,
        'activa', m.activa,
        'domicilio_lat', m.domicilio_lat,
        'domicilio_lng', m.domicilio_lng,
        'radio_metros', m.radio_metros,
        'creado_en', m.creado_en,
        'placa', (select pl.codigo from public.placas pl
                   where pl.mascota_id = m.id and pl.estado = 'activa'
                   limit 1),
        'caso_abierto', (select c.estado from public.casos_perdida c
                          where c.mascota_id = m.id
                            and c.estado in ('perdida', 'posible_perdida')
                          limit 1),
        'escaneos', (select count(*) from public.escaneos e where e.mascota_id = m.id),
        'avistamientos', (select count(*) from public.avistamientos a where a.mascota_id = m.id)
      ) order by m.creado_en desc)
      from public.mascotas m
      where m.dueno_id = p.id
    ), '[]'::json)
  )
  into v_resultado
  from public.perfiles p
  left join auth.users u on u.id = p.id
  where p.id = p_id;

  return v_resultado;
end;
$function$;
revoke all on function public.admin_detalle_cuenta(uuid) from public, anon, authenticated;
grant execute on function public.admin_detalle_cuenta(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_estadisticas()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dias constant int := 30;
  v_hoy constant date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  return json_build_object(
    'totales', json_build_object(
      'cuentas', (select count(*) from public.perfiles),
      'mascotas_activas', (select count(*) from public.mascotas where activa),
      'placas_activas', (select count(*) from public.placas where estado = 'activa'),
      'escaneos', (select count(*) from public.escaneos),
      'avisos', (select count(*) from public.avistamientos),
      'casos_abiertos', (select count(*) from public.casos_perdida
                          where estado in ('perdida', 'posible_perdida')),
      'reencuentros', (select count(*) from public.casos_perdida where estado = 'cerrada')
    ),
    'escaneos_por_dia', (
      select json_agg(json_build_object('dia', d.dia, 'total', coalesce(e.total, 0)) order by d.dia)
      from (select generate_series(v_hoy - (v_dias - 1), v_hoy, '1 day')::date as dia) d
      left join (
        select (ocurrido_en at time zone 'America/Argentina/Buenos_Aires')::date as dia, count(*) as total
        from public.escaneos group by 1
      ) e on e.dia = d.dia
    ),
    'avisos_por_dia', (
      select json_agg(json_build_object('dia', d.dia, 'total', coalesce(a.total, 0)) order by d.dia)
      from (select generate_series(v_hoy - (v_dias - 1), v_hoy, '1 day')::date as dia) d
      left join (
        select (creado_en at time zone 'America/Argentina/Buenos_Aires')::date as dia, count(*) as total
        from public.avistamientos group by 1
      ) a on a.dia = d.dia
    ),
    'casos_por_estado', (
      select json_agg(json_build_object('estado', s.estado, 'total', coalesce(c.total, 0)) order by s.orden)
      from (values ('perdida', 1), ('posible_perdida', 2), ('cerrada', 3), ('descartada', 4)) as s(estado, orden)
      left join (select estado, count(*) as total from public.casos_perdida group by 1) c
        on c.estado = s.estado
    )
  );
end;
$function$;
revoke all on function public.admin_estadisticas() from public, anon, authenticated;
grant execute on function public.admin_estadisticas() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_listar_cuentas()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  return coalesce((
    select json_agg(c order by c.creado_en desc)
    from (
      select
        p.id,
        p.nombre,
        p.telefono,
        p.rol,
        p.creado_en,
        u.email,
        u.last_sign_in_at as ultimo_ingreso,
        (select count(*) from public.mascotas m
          where m.dueno_id = p.id and m.activa) as mascotas_activas
      from public.perfiles p
      left join auth.users u on u.id = p.id
    ) c
  ), '[]'::json);
end;
$function$;
revoke all on function public.admin_listar_cuentas() from public, anon, authenticated;
grant execute on function public.admin_listar_cuentas() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cerrar_caso(p_caso_id uuid, p_rescatista_id uuid DEFAULT NULL::uuid, p_mensaje text DEFAULT NULL::text, p_foto_url text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dueno  uuid;
  v_estado text;
begin
  select m.dueno_id, c.estado into v_dueno, v_estado
    from casos_perdida c join mascotas m on m.id = c.mascota_id
   where c.id = p_caso_id
   for update of c;
  if v_dueno is null or v_dueno is distinct from auth.uid() then
    return json_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if v_estado not in ('posible_perdida', 'perdida') then
    return json_build_object('ok', false, 'motivo', 'caso_cerrado');
  end if;
  if p_rescatista_id is not null and not exists (
       select 1 from avistamientos
        where caso_id = p_caso_id and reportado_por = p_rescatista_id and reportado_por <> v_dueno) then
    return json_build_object('ok', false, 'motivo', 'rescatista_invalido');
  end if;

  update casos_perdida
     set estado = 'cerrada',
         cerrado_en = now(),
         rescatista_id = p_rescatista_id,
         mensaje_agradecimiento = nullif(btrim(p_mensaje), ''),
         foto_reencuentro_url = p_foto_url
   where id = p_caso_id;

  return json_build_object('ok', true);
end;
$function$;
revoke all on function public.cerrar_caso(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.cerrar_caso(uuid,uuid,text,text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.colaboradores_del_caso(p_caso_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dueno uuid;
begin
  select m.dueno_id into v_dueno
    from casos_perdida c join mascotas m on m.id = c.mascota_id
   where c.id = p_caso_id;
  if v_dueno is null or v_dueno is distinct from auth.uid() then
    raise exception 'no_autorizado';
  end if;

  return coalesce((
    select json_agg(x order by x.hubo_conmigo desc, x.ultimo_aviso_en desc)
    from (
      select a.reportado_por as perfil_id,
             -- Solo el primer nombre: alcanza para reconocer a la persona.
             coalesce(nullif(split_part(btrim(p.nombre), ' ', 1), ''), 'Alguien') as nombre,
             count(*)::int as avisos,
             bool_or(a.situacion = 'conmigo') as hubo_conmigo,
             max(a.creado_en) as ultimo_aviso_en
        from avistamientos a
        left join perfiles p on p.id = a.reportado_por
       where a.caso_id = p_caso_id
         and a.reportado_por is not null
         and a.reportado_por <> v_dueno
       group by a.reportado_por, p.nombre
    ) x
  ), '[]'::json);
end;
$function$;
revoke all on function public.colaboradores_del_caso(uuid) from public, anon, authenticated;
grant execute on function public.colaboradores_del_caso(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.distancia_legible(p_metros double precision)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_metros is null then null
    when p_metros < 1000 then round(p_metros)::int || ' m'
    else replace(round((p_metros / 1000)::numeric, 1)::text, '.', ',') || ' km'
  end
$function$;
revoke all on function public.distancia_legible(double precision) from public, anon, authenticated;
grant execute on function public.distancia_legible(double precision) to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.distancia_metros(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$function$;
revoke all on function public.distancia_metros(double precision,double precision,double precision,double precision) from public, anon, authenticated;
grant execute on function public.distancia_metros(double precision,double precision,double precision,double precision) to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.encolar_notificacion(p_perfil_id uuid, p_mascota_id uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text, p_prioritaria boolean DEFAULT false)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.notificaciones (perfil_id, mascota_id, tipo, titulo, cuerpo, url, prioritaria)
  values (p_perfil_id, p_mascota_id, p_tipo, p_titulo, p_cuerpo, p_url, p_prioritaria)
$function$;
revoke all on function public.encolar_notificacion(uuid,uuid,text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.encolar_notificacion(uuid,uuid,text,text,text,text,boolean) to service_role;

CREATE OR REPLACE FUNCTION public.enviar_notificacion_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
declare
  v_secreto text;
begin
  -- Omitida por el límite de frecuencia: queda en el historial, sin push.
  if new.resultado ? 'omitida' then
    return new;
  end if;

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
$function$;
revoke all on function public.enviar_notificacion_push() from public, anon, authenticated;
grant execute on function public.enviar_notificacion_push() to service_role;

CREATE OR REPLACE FUNCTION public.escalar_casos_sin_respuesta()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    update casos_perdida
       set estado = 'perdida', escalado_en = now()
     where id = v_caso.id and estado = 'posible_perdida';
    perform encolar_notificacion(
      v_caso.dueno_id, v_caso.mascota_id, 'perdida_automatica',
      v_caso.nombre || ' pasó a perdida',
      'Pasaron ' || v_caso.horas_confirmacion || ' h sin respuesta a la posible pérdida. Si está con vos, cerrá el caso desde el panel.',
      '/panel');
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$function$;
revoke all on function public.escalar_casos_sin_respuesta() from public, anon, authenticated;
grant execute on function public.escalar_casos_sin_respuesta() to service_role;

CREATE OR REPLACE FUNCTION public.ficha_publica(p_codigo text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_placa placas%rowtype;
  v_mascota mascotas%rowtype;
  v_estado  text;
  v_mensaje text;
  v_escalado timestamptz;
  v_ultima_lat double precision;
  v_ultima_lng double precision;
  v_telefono text;
  v_telefono_digitos text;
begin
  select * into v_placa from placas where codigo = p_codigo;

  if not found then
    return json_build_object('encontrada', false);
  end if;

  -- Placa sin mascota (dada de baja, o de una cuenta eliminada): no se
  -- reconoce. Antes respondía "sin activar" e invitaba a activarla, lo que
  -- permitía quedarse con la placa de un collar ajeno.
  if v_placa.mascota_id is null then
    return json_build_object('encontrada', false);
  end if;

  select m.* into v_mascota
  from mascotas m
  where m.id = v_placa.mascota_id and m.activa = true and v_placa.estado = 'activa';

  if not found then
    return json_build_object('encontrada', false);
  end if;

  select estado, mensaje, ultima_lat, ultima_lng, escalado_en
    into v_estado, v_mensaje, v_ultima_lat, v_ultima_lng, v_escalado
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  if v_estado is not null then
    select telefono into v_telefono
    from perfiles
    where id = v_mascota.dueno_id;
  end if;

  v_telefono_digitos := regexp_replace(coalesce(v_telefono, ''), '\D', '', 'g');

  return json_build_object(
    'encontrada', true,
    'mascota_id', v_mascota.id,
    'nombre',     v_mascota.nombre,
    'especie',    v_mascota.especie,
    'sexo',       v_mascota.sexo,
    'raza',       v_mascota.raza,
    'tamano',     v_mascota.tamano,
    'color',      v_mascota.color,
    'senas',      case when v_mascota.visibilidad_senas = 'publico'
                    or (v_mascota.visibilidad_senas = 'perdida' and v_estado is not null)
               then v_mascota.senas else null end,
    'caracter',   v_mascota.caracter,
    'foto_url',   v_mascota.foto_url,
    'salud',      case when v_mascota.visibilidad_salud = 'publico'
                    or (v_mascota.visibilidad_salud = 'perdida' and v_estado is not null)
               then v_mascota.salud else null end,
    'estado',     coalesce(v_estado, 'en_casa'),
    'perdida_automatica', v_estado = 'perdida' and v_escalado is not null,
    'mensaje_perdida',   v_mensaje,
    'ultima_lat',        v_ultima_lat,
    'ultima_lng',        v_ultima_lng,
    'contacto_tel',      case when v_telefono_digitos <> '' then 'tel:+' || v_telefono_digitos else null end,
    'contacto_whatsapp', case when v_telefono_digitos <> '' then 'https://wa.me/' || v_telefono_digitos else null end
  );
end;
$function$;
revoke all on function public.ficha_publica(text) from public, anon, authenticated;
grant execute on function public.ficha_publica(text) to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generar_placa(p_mascota_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_codigo text;
  v_existe boolean;
begin
  if auth.uid() is null then
    raise exception 'no_autenticado';
  end if;

  if not exists (select 1 from mascotas where id = p_mascota_id and dueno_id = auth.uid()) then
    raise exception 'mascota_no_encontrada';
  end if;

  loop
    v_codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    select exists(select 1 from placas where codigo = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;

  insert into placas (codigo, mascota_id, estado)
  values (v_codigo, p_mascota_id, 'activa');

  return v_codigo;
end;
$function$;
revoke all on function public.generar_placa(uuid) from public, anon, authenticated;
grant execute on function public.generar_placa(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.historial_colaboracion()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_avistamientos json;
  v_reencuentros json;
begin
  select coalesce(json_agg(t), '[]'::json) into v_avistamientos
  from (
    select av.id, av.situacion, av.mensaje, av.creado_en,
           m.nombre as mascota_nombre, m.foto_url as mascota_foto
    from avistamientos av join mascotas m on m.id = av.mascota_id
    where av.reportado_por = auth.uid()
    order by av.creado_en desc
  ) t;

  select coalesce(json_agg(t), '[]'::json) into v_reencuentros
  from (
    select cp.id, cp.cerrado_en,
           m.nombre as mascota_nombre, m.foto_url as mascota_foto,
           cp.mensaje_agradecimiento, cp.foto_reencuentro_url
    from casos_perdida cp
    join mascotas m on m.id = cp.mascota_id
    where cp.rescatista_id = auth.uid()
    order by cp.cerrado_en desc
  ) t;

  return json_build_object('avistamientos', v_avistamientos, 'reencuentros', v_reencuentros);
end;
$function$;
revoke all on function public.historial_colaboracion() from public, anon, authenticated;
grant execute on function public.historial_colaboracion() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.limitar_notificacion_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ultima_enviada timestamptz;
  v_omitidas int;
  v_escaneos int;
  v_avisos int;
  v_extra text;
begin
  if new.tipo in ('posible_perdida', 'perdida_automatica') or new.mascota_id is null then
    return new;
  end if;

  -- "Enviada" = no omitida por este límite (incluye las que la Edge Function
  -- todavía no procesó). Las prioritarias ("Está conmigo") no las frena el
  -- tope de 10 minutos, solo el de la hora.
  if (new.tipo = 'escaneo' and exists (
        select 1 from notificaciones
         where mascota_id = new.mascota_id and tipo = 'escaneo'
           and creado_en > now() - interval '10 minutes'
           and (resultado is null or resultado->>'omitida' is null)))
     or (not new.prioritaria and (select count(*) from notificaciones
          where mascota_id = new.mascota_id
            and creado_en > now() - interval '10 minutes'
            and (resultado is null or resultado->>'omitida' is null)) >= 5)
     or (select count(*) from notificaciones
          where mascota_id = new.mascota_id
            and creado_en > now() - interval '1 hour'
            and (resultado is null or resultado->>'omitida' is null)) >= 12
  then
    new.resultado := jsonb_build_object('omitida', 'limite_frecuencia');
    new.enviada_en := null;
    return new;
  end if;

  -- Se manda: si desde el último push hubo omitidas, se cuentan en el texto.
  select max(creado_en) into v_ultima_enviada
    from notificaciones
   where mascota_id = new.mascota_id
     and (resultado is null or resultado->>'omitida' is null);

  select count(*) filter (where tipo = 'escaneo'),
         count(*) filter (where tipo = 'avistamiento'),
         count(*)
    into v_escaneos, v_avisos, v_omitidas
    from notificaciones
   where mascota_id = new.mascota_id
     and resultado->>'omitida' is not null
     and creado_en > coalesce(v_ultima_enviada, '-infinity'::timestamptz);

  if v_omitidas > 0 then
    v_extra := concat_ws(' y ',
      case when v_avisos = 1 then '1 aviso' when v_avisos > 1 then v_avisos || ' avisos' end,
      case when v_escaneos = 1 then '1 escaneo' when v_escaneos > 1 then v_escaneos || ' escaneos' end);
    new.cuerpo := new.cuerpo || ' Además: ' || v_extra || ' más. Mirá el mapa.';
    new.url := '/mascotas/' || new.mascota_id || '/mapa';
  end if;

  return new;
end;
$function$;
revoke all on function public.limitar_notificacion_push() from public, anon, authenticated;
grant execute on function public.limitar_notificacion_push() to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notificar_avistamiento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    '/mascotas/' || v_mascota.id || '/mapa',
    new.situacion = 'conmigo');

  return new;
end;
$function$;
revoke all on function public.notificar_avistamiento() from public, anon, authenticated;
grant execute on function public.notificar_avistamiento() to service_role;

CREATE OR REPLACE FUNCTION public.notificar_escaneo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.notificar_escaneo() from public, anon, authenticated;
grant execute on function public.notificar_escaneo() to service_role;

CREATE OR REPLACE FUNCTION public.proteger_rol_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Sin sesión de usuario (SQL Editor, service role): se respeta lo pedido.
  if auth.uid() is null then
    return new;
  end if;
  -- Un administrador real puede cambiar roles desde una función propia.
  if exists (select 1 from perfiles where id = auth.uid() and rol = 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rol := 'usuario';
  else
    new.rol := old.rol;
  end if;
  return new;
end;
$function$;
revoke all on function public.proteger_rol_perfil() from public, anon, authenticated;
grant execute on function public.proteger_rol_perfil() to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purgar_cuenta(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rol text;
  v_mascotas uuid[];
  v_placas uuid[];
begin
  select rol into v_rol from public.perfiles where id = p_id;
  if not found then
    raise exception 'cuenta_no_encontrada';
  end if;
  if v_rol = 'admin' then
    raise exception 'cuenta_admin';
  end if;

  select coalesce(array_agg(id), '{}') into v_mascotas
    from public.mascotas where dueno_id = p_id;
  select coalesce(array_agg(id), '{}') into v_placas
    from public.placas where mascota_id = any(v_mascotas);

  delete from public.avistamientos where mascota_id = any(v_mascotas);

  -- Los avisos que la persona dio sobre mascotas de otros dueños son parte del
  -- caso de ese otro dueño: quedan, pero sin ningún dato de quien avisó.
  update public.avistamientos
     set reportado_por = null, contacto = null, foto_url = null
   where reportado_por = p_id;

  delete from public.escaneos
   where mascota_id = any(v_mascotas) or placa_id = any(v_placas);

  delete from public.casos_perdida where mascota_id = any(v_mascotas);
  update public.casos_perdida set rescatista_id = null where rescatista_id = p_id;

  -- Las placas no tienen datos personales: se desvinculan y quedan de baja, para
  -- que un collar viejo nunca abra la ficha de otra mascota.
  update public.placas set mascota_id = null, estado = 'baja' where id = any(v_placas);

  delete from public.mascotas where dueno_id = p_id;
  delete from public.perfiles where id = p_id;
end;
$function$;
revoke all on function public.purgar_cuenta(uuid) from public, anon, authenticated;
grant execute on function public.purgar_cuenta(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.reclamar_avistamiento(p_avistamiento_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_nombre text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  update avistamientos a
     set reportado_por = auth.uid()
    from mascotas m
   where a.id = p_avistamiento_id
     and m.id = a.mascota_id
     and a.reportado_por is null
     and a.creado_en > now() - interval '7 days'
  returning m.nombre into v_nombre;

  if v_nombre is null then
    return json_build_object('ok', false, 'motivo', 'no_reclamable');
  end if;
  return json_build_object('ok', true, 'mascota', v_nombre);
end;
$function$;
revoke all on function public.reclamar_avistamiento(uuid) from public, anon, authenticated;
grant execute on function public.reclamar_avistamiento(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.registrar_avistamiento(p_codigo text, p_lat double precision, p_lng double precision, p_origen text DEFAULT 'gps'::text, p_situacion text DEFAULT NULL::text, p_mensaje text DEFAULT NULL::text, p_contacto text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mascota  mascotas%rowtype;
  v_caso_id  uuid;
  v_avist_id uuid;
  v_con_ubicacion boolean := p_lat is not null and p_lng is not null;
begin
  select m.* into v_mascota
  from placas p join mascotas m on m.id = p.mascota_id
  where p.codigo = p_codigo and p.estado = 'activa';
  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_inexistente');
  end if;

  if not v_con_ubicacion and coalesce(btrim(p_mensaje), '') = '' then
    return json_build_object('ok', false, 'motivo', 'falta_lugar');
  end if;

  -- Un uso real (varias personas que la ven durante una búsqueda) queda muy
  -- lejos; solo frena a quien manda avisos en bucle.
  if (select count(*) from avistamientos
       where mascota_id = v_mascota.id
         and creado_en > now() - interval '1 hour') >= 20 then
    return json_build_object('ok', false, 'motivo', 'demasiados_avisos');
  end if;

  select id into v_caso_id
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  -- Un aviso deliberado abre caso aunque la mascota esté cerca de casa
  if v_caso_id is null then
    insert into casos_perdida (mascota_id, estado, origen, ultima_lat, ultima_lng)
    values (v_mascota.id, 'posible_perdida', 'automatico',
            case when v_con_ubicacion then p_lat end,
            case when v_con_ubicacion then p_lng end)
    returning id into v_caso_id;
  end if;

  insert into avistamientos
    (mascota_id, caso_id, lat, lng, origen, situacion, mensaje, contacto, reportado_por)
  values
    (v_mascota.id, v_caso_id,
     case when v_con_ubicacion then p_lat end,
     case when v_con_ubicacion then p_lng end,
     case when v_con_ubicacion then p_origen else 'manual' end,
     p_situacion, nullif(btrim(p_mensaje), ''), nullif(btrim(p_contacto), ''), auth.uid())
  returning id into v_avist_id;

  if v_con_ubicacion then
    update casos_perdida
       set ultima_lat = p_lat, ultima_lng = p_lng
     where id = v_caso_id;
  end if;

  return json_build_object('ok', true, 'avistamiento_id', v_avist_id, 'caso_id', v_caso_id);
end;
$function$;
revoke all on function public.registrar_avistamiento(text,double precision,double precision,text,text,text,text) from public, anon, authenticated;
grant execute on function public.registrar_avistamiento(text,double precision,double precision,text,text,text,text) to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.registrar_escaneo(p_codigo text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mascota   mascotas%rowtype;
  v_placa     placas%rowtype;
  v_dist      double precision;
  v_lejos     boolean := false;
  v_caso_id   uuid;
begin
  select * into v_placa
  from placas
  where codigo = p_codigo and estado = 'activa';

  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_inexistente');
  end if;

  select * into v_mascota
  from mascotas
  where id = v_placa.mascota_id and activa = true;

  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_sin_mascota');
  end if;

  -- El dueño mirando la ficha de su propia mascota no es "alguien que la
  -- encontró": ni cuenta como escaneo ni dispara la detección automática.
  if auth.uid() is not null and auth.uid() = v_mascota.dueno_id then
    return json_build_object('ok', true, 'propio', true);
  end if;

  if p_lat is not null and v_mascota.domicilio_lat is not null then
    v_dist := distancia_metros(p_lat, p_lng,
                v_mascota.domicilio_lat, v_mascota.domicilio_lng);
    -- El modo paseo (DUE11) suspende la detección automática
    v_lejos := v_dist > v_mascota.radio_metros
               and (v_mascota.pausado_hasta is null
                    or v_mascota.pausado_hasta < now());
  end if;

  insert into escaneos (placa_id, mascota_id, lat, lng, distancia_m)
  values (v_placa.id, v_mascota.id, p_lat, p_lng, round(v_dist)::int);

  select id into v_caso_id
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  if v_caso_id is null and v_lejos then
    insert into casos_perdida (mascota_id, estado, origen, ultima_lat, ultima_lng)
    values (v_mascota.id, 'posible_perdida', 'automatico', p_lat, p_lng)
    returning id into v_caso_id;
  end if;

  return json_build_object(
    'ok', true,
    'mascota_id', v_mascota.id,
    'caso_id', v_caso_id,
    'lejos_de_casa', v_lejos,
    'distancia_m', round(v_dist)::int
  );
end;
$function$;
revoke all on function public.registrar_escaneo(text,double precision,double precision) from public, anon, authenticated;
grant execute on function public.registrar_escaneo(text,double precision,double precision) to public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rutas_fotos_cuenta(p_id uuid)
 RETURNS text[]
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with urls as (
    select m.foto_url as url from public.mascotas m where m.dueno_id = p_id
    union all
    select c.foto_reencuentro_url
      from public.casos_perdida c
      join public.mascotas m on m.id = c.mascota_id
     where m.dueno_id = p_id
    union all
    select a.foto_url
      from public.avistamientos a
     where a.reportado_por = p_id
        or a.mascota_id in (select id from public.mascotas where dueno_id = p_id)
  )
  select coalesce(array_agg(distinct substring(url from '/fotos-mascotas/([^?]+)')), '{}')
    from urls
   where url is not null
     and substring(url from '/fotos-mascotas/([^?]+)') is not null;
$function$;
revoke all on function public.rutas_fotos_cuenta(uuid) from public, anon, authenticated;
grant execute on function public.rutas_fotos_cuenta(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER avistamientos_notificar AFTER INSERT ON public.avistamientos FOR EACH ROW EXECUTE FUNCTION notificar_avistamiento();
CREATE TRIGGER escaneos_notificar AFTER INSERT ON public.escaneos FOR EACH ROW EXECUTE FUNCTION notificar_escaneo();
CREATE TRIGGER notificaciones_enviar AFTER INSERT ON public.notificaciones FOR EACH ROW EXECUTE FUNCTION enviar_notificacion_push();
CREATE TRIGGER notificaciones_limitar BEFORE INSERT ON public.notificaciones FOR EACH ROW EXECUTE FUNCTION limitar_notificacion_push();
CREATE TRIGGER proteger_rol_perfil BEFORE INSERT OR UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION proteger_rol_perfil();

-- ---------------------------------------------------------------------------
-- Seguridad por filas (RLS) y políticas
-- ---------------------------------------------------------------------------
alter table public.avistamientos enable row level security;
alter table public.casos_perdida enable row level security;
alter table public.escaneos enable row level security;
alter table public.mascotas enable row level security;
alter table public.notificaciones enable row level security;
alter table public.perfiles enable row level security;
alter table public.placas enable row level security;
alter table public.suscripciones_push enable row level security;
alter table public.uso_ia enable row level security;

create policy "avistamientos: dueño lee" on public.avistamientos as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = avistamientos.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy "avistamientos: quien reportó lee el suyo" on public.avistamientos as permissive for select to public
  using ((auth.uid() = reportado_por));

create policy "admin puede ver todos los casos de perdida" on public.casos_perdida as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'admin'::text)))));

create policy "casos: dueño lee" on public.casos_perdida as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = casos_perdida.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy "dueños actualizan casos de sus mascotas" on public.casos_perdida as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = casos_perdida.mascota_id) AND (m.dueno_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = casos_perdida.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy "dueños crean casos de sus mascotas" on public.casos_perdida as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = casos_perdida.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy "escaneos: dueño lee" on public.escaneos as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = escaneos.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy "admin puede ver todas las mascotas" on public.mascotas as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'admin'::text)))));

create policy "mascotas: dueño crea" on public.mascotas as permissive for insert to authenticated
  with check ((auth.uid() = dueno_id));

create policy "mascotas: dueño edita" on public.mascotas as permissive for update to authenticated
  using ((auth.uid() = dueno_id))
  with check ((auth.uid() = dueno_id));

create policy "mascotas: dueño lee" on public.mascotas as permissive for select to authenticated
  using ((auth.uid() = dueno_id));

create policy notificaciones_propias_select on public.notificaciones as permissive for select to authenticated
  using ((auth.uid() = perfil_id));

create policy "perfil propio: crear" on public.perfiles as permissive for insert to public
  with check ((auth.uid() = id));

create policy "perfil propio: editar" on public.perfiles as permissive for update to authenticated
  using ((auth.uid() = id))
  with check ((auth.uid() = id));

create policy "perfil propio: ver" on public.perfiles as permissive for select to public
  using ((auth.uid() = id));

create policy "admin puede ver todas las placas" on public.placas as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'admin'::text)))));

create policy duenos_ven_sus_placas on public.placas as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM mascotas m
  WHERE ((m.id = placas.mascota_id) AND (m.dueno_id = auth.uid())))));

create policy suscripciones_push_propias_delete on public.suscripciones_push as permissive for delete to authenticated
  using ((auth.uid() = perfil_id));

create policy suscripciones_push_propias_insert on public.suscripciones_push as permissive for insert to authenticated
  with check ((auth.uid() = perfil_id));

create policy suscripciones_push_propias_select on public.suscripciones_push as permissive for select to authenticated
  using ((auth.uid() = perfil_id));

create policy suscripciones_push_propias_update on public.suscripciones_push as permissive for update to authenticated
  using ((auth.uid() = perfil_id))
  with check ((auth.uid() = perfil_id));

create policy fotos_mascotas_borrado_propio_dueno on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'fotos-mascotas'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy fotos_mascotas_lectura_publica on storage.objects as permissive for select to public
  using ((bucket_id = 'fotos-mascotas'::text));

-- ---------------------------------------------------------------------------
-- Permisos de tablas y columnas (lo que no figura, no está otorgado)
-- ---------------------------------------------------------------------------
revoke all on public.avistamientos from anon, authenticated;
revoke all on public.casos_perdida from anon, authenticated;
revoke all on public.escaneos from anon, authenticated;
revoke all on public.mascotas from anon, authenticated;
revoke all on public.notificaciones from anon, authenticated;
revoke all on public.perfiles from anon, authenticated;
revoke all on public.placas from anon, authenticated;
revoke all on public.suscripciones_push from anon, authenticated;
revoke all on public.uso_ia from anon, authenticated;
grant insert, maintain, references, select, trigger, truncate, update on public.avistamientos to anon;
grant insert, maintain, references, select, trigger, truncate, update on public.avistamientos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.avistamientos to service_role;
grant maintain, references, select, trigger, truncate on public.casos_perdida to anon;
grant maintain, references, select, trigger, truncate on public.casos_perdida to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.casos_perdida to service_role;
grant insert, maintain, references, select, trigger, truncate, update on public.escaneos to anon;
grant insert, maintain, references, select, trigger, truncate, update on public.escaneos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.escaneos to service_role;
grant insert, maintain, references, select, trigger, truncate, update on public.mascotas to anon;
grant insert, maintain, references, select, trigger, truncate, update on public.mascotas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.mascotas to service_role;
grant insert, maintain, references, select, trigger, truncate, update on public.notificaciones to anon;
grant insert, maintain, references, select, trigger, truncate, update on public.notificaciones to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.notificaciones to service_role;
grant maintain, references, select, trigger, truncate on public.perfiles to anon;
grant maintain, references, select, trigger, truncate on public.perfiles to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.perfiles to service_role;
grant insert, maintain, references, select, trigger, truncate, update on public.placas to anon;
grant insert, maintain, references, select, trigger, truncate, update on public.placas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.placas to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.suscripciones_push to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.suscripciones_push to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.suscripciones_push to service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.uso_ia to service_role;
grant insert (mascota_id, estado, origen, mensaje, ultima_lat, ultima_lng) on public.casos_perdida to authenticated;
grant update (estado, mensaje, ultima_lat, ultima_lng, cerrado_en) on public.casos_perdida to authenticated;
grant insert (id, nombre, telefono, privacidad_aceptada_en) on public.perfiles to authenticated;
grant update (nombre, telefono) on public.perfiles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('fotos-mascotas', 'fotos-mascotas', true, null, null) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tareas programadas (pg_cron)
-- ---------------------------------------------------------------------------
select cron.schedule('escalar-casos-sin-respuesta', '*/15 * * * *', 'select public.escalar_casos_sin_respuesta()');

-- ---------------------------------------------------------------------------
-- Secretos en Vault (solo los nombres; el valor se carga a mano)
-- ---------------------------------------------------------------------------
-- notificar_secret: select vault.create_secret('<valor>', 'notificar_secret');
