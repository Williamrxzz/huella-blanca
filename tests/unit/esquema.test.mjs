// supabase/esquema/esquema.sql reconstruye la base en un PostgreSQL vacío.
//
// Corre sin red: PGlite (PostgreSQL 17 compilado a WebAssembly) en memoria,
// con las piezas que un proyecto de Supabase ya trae simuladas en versión
// mínima (roles, auth.uid(), storage, net.http_post, vault, cron). Si alguien
// cambia la base y exporta un esquema inválido, esto falla.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'

const ESQUEMA = fileURLToPath(new URL('../../supabase/esquema/esquema.sql', import.meta.url))

const PIEZAS_DE_SUPABASE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions; create schema auth; create schema storage; create schema net; create schema vault; create schema cron;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid, created_at timestamptz default now());
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create table net.pedidos (url text, body jsonb);
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 1000) returns bigint language sql as $$ insert into net.pedidos values (url, body); select 1::bigint $$;
  create table vault.secretos (name text, decrypted_secret text);
  create view vault.decrypted_secrets as select * from vault.secretos;
  create function vault.create_secret(v text, n text) returns uuid language sql as $$ insert into vault.secretos values (n, v); select gen_random_uuid() $$;
  create table cron.job (jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job values (n, s, c); select 1::bigint $$;
`

// Extensiones propias de Supabase (o no incluidas en PGlite) que ya están
// simuladas arriba; el esquema no usa funciones de pgcrypto.
const SIMULADAS = /^create extension if not exists (pg_cron|pg_net|pg_stat_statements|supabase_vault|pgcrypto) /

async function baseReconstruida() {
  const db = new PGlite({ extensions: { uuid_ossp } })
  await db.exec(PIEZAS_DE_SUPABASE)
  const sql = readFileSync(ESQUEMA, 'utf8').split('\n').filter((l) => !SIMULADAS.test(l)).join('\n')
  await db.exec(sql)
  return db
}

const contar = async (db, sql) => Number((await db.query(sql)).rows[0].c)

test('el esquema se ejecuta completo y crea todo', async () => {
  const db = await baseReconstruida()
  const tablas = await contar(db, "select count(*) c from pg_tables where schemaname = 'public'")
  const conRls = await contar(db, "select count(*) c from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity")
  assert.ok(tablas >= 9, `tablas: ${tablas}`)
  assert.equal(conRls, tablas, 'RLS activo en todas las tablas públicas')
  assert.ok(await contar(db, "select count(*) c from pg_policies where schemaname in ('public', 'storage')") > 0)
  for (const f of ['ficha_publica', 'registrar_escaneo', 'registrar_avistamiento', 'generar_placa']) {
    assert.equal(await contar(db, `select count(*) c from pg_proc where proname = '${f}'`), 1, f)
  }
  assert.equal(await contar(db, 'select count(*) c from storage.buckets'), 1)
  assert.equal(await contar(db, 'select count(*) c from cron.job'), 1)
  await db.close()
})

test('el navegador no puede escribir perfiles.rol', async () => {
  const db = await baseReconstruida()
  const r = (await db.query("select has_column_privilege('authenticated', 'public.perfiles', 'rol', 'INSERT') i, has_column_privilege('authenticated', 'public.perfiles', 'rol', 'UPDATE') u")).rows[0]
  assert.equal(r.i, false)
  assert.equal(r.u, false)
  await db.close()
})

test('recorrido de humo: alta, ficha pública, escaneo lejos de casa', async () => {
  const db = await baseReconstruida()
  const dueno = '11111111-1111-1111-1111-111111111111'
  const mascota = '22222222-2222-2222-2222-222222222222'
  await db.exec(`
    insert into auth.users values ('${dueno}', 'dueno@example.com');
    insert into perfiles (id, nombre, telefono) values ('${dueno}', 'Dueño', '+5492974123456');
    insert into mascotas (id, dueno_id, nombre, especie, sexo, domicilio_lat, domicilio_lng, radio_metros)
      values ('${mascota}', '${dueno}', 'Prueba', 'perro', 'hembra', -46.438, -67.528, 100);
    insert into placas (codigo, mascota_id, estado) values ('ABCDEF12', '${mascota}', 'activa');
  `)
  assert.equal((await db.query(`select rol from perfiles where id = '${dueno}'`)).rows[0].rol, 'usuario')

  const ficha = (await db.query("select ficha_publica('ABCDEF12') f")).rows[0].f
  assert.equal(ficha.encontrada, true)
  assert.ok(!('domicilio_lat' in ficha) && !('domicilio_lng' in ficha), 'nunca devuelve el domicilio')
  assert.equal(ficha.contacto_tel, null, 'sin caso abierto no viaja el teléfono')

  const escaneo = (await db.query("select registrar_escaneo('ABCDEF12', -46.50, -67.60) r")).rows[0].r
  assert.ok(escaneo.ok && escaneo.lejos_de_casa && escaneo.caso_id)
  const notis = (await db.query('select tipo from notificaciones')).rows
  assert.deepEqual(notis.map((n) => n.tipo), ['posible_perdida'], 'el trigger encoló el aviso al dueño')

  const ficha2 = (await db.query("select ficha_publica('ABCDEF12') f")).rows[0].f
  assert.equal(ficha2.estado, 'posible_perdida')
  assert.equal(ficha2.contacto_tel, 'tel:+5492974123456')

  await assert.rejects(db.query("insert into perfiles (id, nombre, telefono) values (gen_random_uuid(), 'x', '2974123456')"), /perfiles_telefono_e164/)
  await db.close()
})
