-- DUE08 (reducida): reemplazar el código QR de una mascota (2026-11-18).
--
-- Si el collar se pierde o se rompe, el dueño necesita un QR nuevo, y el viejo
-- tiene que dejar de mostrar la ficha (si el collar perdido aparece en otro
-- lado, no debe llevar a la mascota). Al verificar la historia se encontró que
-- generar_placa() permitía que una mascota quedara con dos placas activas.
--
-- * Una sola placa activa por mascota, garantizado por la base (índice único
--   parcial), no solo por el código.
-- * generar_placa() rechaza crear otra si ya hay una activa.
-- * reemplazar_placa(): en una transacción da de baja la activa y crea la
--   nueva. La vieja conserva mascota_id (historial de escaneos) pero, al
--   quedar en 'baja', ficha_publica() y registrar_escaneo() la ignoran.
-- * Los códigos salen de gen_random_bytes (criptográfico) en vez de
--   md5(random()); mismo formato: 8 caracteres hexadecimales en mayúscula.

create unique index if not exists placas_una_activa_por_mascota
  on public.placas (mascota_id) where estado = 'activa';

-- Código nuevo, aleatorio y no repetido. Interna: no la llama el navegador.
create or replace function public.nuevo_codigo_placa()
returns text
language plpgsql
volatile
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_codigo text;
begin
  loop
    v_codigo := upper(encode(extensions.gen_random_bytes(4), 'hex'));
    exit when not exists (select 1 from placas where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;
revoke all on function public.nuevo_codigo_placa() from public, anon, authenticated;

create or replace function public.generar_placa(p_mascota_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'no_autenticado';
  end if;

  -- Se bloquea la mascota para que dos pedidos simultáneos no creen dos placas.
  perform 1 from mascotas where id = p_mascota_id and dueno_id = auth.uid() for update;
  if not found then
    raise exception 'mascota_no_encontrada';
  end if;

  if exists (select 1 from placas where mascota_id = p_mascota_id and estado = 'activa') then
    raise exception 'ya_tiene_placa';
  end if;

  v_codigo := nuevo_codigo_placa();
  insert into placas (codigo, mascota_id, estado) values (v_codigo, p_mascota_id, 'activa');
  return v_codigo;
end;
$$;

create or replace function public.reemplazar_placa(p_mascota_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_anterior text;
  v_codigo text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'motivo', 'no_autenticado');
  end if;

  perform 1 from mascotas where id = p_mascota_id and dueno_id = auth.uid() and activa for update;
  if not found then
    return json_build_object('ok', false, 'motivo', 'mascota_no_encontrada');
  end if;

  update placas set estado = 'baja'
   where mascota_id = p_mascota_id and estado = 'activa'
  returning codigo into v_anterior;

  v_codigo := nuevo_codigo_placa();
  insert into placas (codigo, mascota_id, estado) values (v_codigo, p_mascota_id, 'activa');

  return json_build_object('ok', true, 'codigo', v_codigo, 'anterior', v_anterior);
end;
$$;

revoke all on function public.generar_placa(uuid) from public, anon;
grant execute on function public.generar_placa(uuid) to authenticated;
revoke all on function public.reemplazar_placa(uuid) from public, anon;
grant execute on function public.reemplazar_placa(uuid) to authenticated;
