// Exporta el esquema de la base de Supabase a supabase/esquema/esquema.sql.
//
//   npm run esquema:exportar
//
// Por qué existe: `supabase db dump` necesita Docker, que este proyecto no
// usa. Esto arma el mismo resultado leyendo el catálogo de Postgres con
// `supabase db query --linked` (solo lecturas). El archivo resultante es una
// FOTO del esquema actual para reconstruir la base o compararla: no es una
// migración (no va en supabase/migrations) y no lleva datos.
//
// Nunca exporta valores secretos: de Vault solo el nombre de cada secreto.
// Si algún texto exportado parece un secreto (una cadena hexadecimal larga o
// un JWT), aborta sin escribir nada.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SALIDA = join(RAIZ, 'supabase', 'esquema', 'esquema.sql')

function db(sql) {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--linked', sql], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  const t = r.stdout + r.stderr
  const i = t.indexOf('{')
  if (i < 0) throw new Error('db: ' + t.slice(0, 300))
  const o = JSON.parse(t.slice(i, t.lastIndexOf('}') + 1))
  if (!o.rows) throw new Error('db: ' + JSON.stringify(o).slice(0, 300))
  return o.rows
}

const ident = (s) => (/^[a-z_][a-z0-9_]*$/.test(s) ? s : '"' + s.replace(/"/g, '""') + '"')
const literal = (s) => "'" + String(s).replace(/'/g, "''") + "'"

// ---------------------------------------------------------------------------
// Consultas al catálogo
// ---------------------------------------------------------------------------
const TABLAS_PUBLICAS = "select c.oid from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'"

const extensiones = db(`
  select e.extname, n.nspname
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname <> 'plpgsql'
  order by e.extname`)

const tablas = db(`
  select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as rls_forzado,
         obj_description(c.oid, 'pg_class') as comentario
  from pg_class c where c.oid in (${TABLAS_PUBLICAS})
  order by c.relname`)

const columnas = db(`
  select c.relname as tabla, a.attname as columna, format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as no_nulo, pg_get_expr(d.adbin, d.adrelid) as defecto,
         a.attidentity as identidad, a.attgenerated as generada
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.oid in (${TABLAS_PUBLICAS}) and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum`)

const restricciones = db(`
  select c.relname as tabla, k.conname as nombre, k.contype as tipo, pg_get_constraintdef(k.oid) as definicion
  from pg_constraint k join pg_class c on c.oid = k.conrelid
  where c.oid in (${TABLAS_PUBLICAS})
  order by c.relname, case k.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 when 'x' then 3 else 4 end, k.conname`)

const indices = db(`
  select c.relname as tabla, i.relname as indice, pg_get_indexdef(i.oid) as definicion
  from pg_index x
  join pg_class i on i.oid = x.indexrelid
  join pg_class c on c.oid = x.indrelid
  where c.oid in (${TABLAS_PUBLICAS})
    and not exists (select 1 from pg_constraint k where k.conindid = x.indexrelid)
  order by c.relname, i.relname`)

const funciones = db(`
  select p.oid::regprocedure::text as firma, pg_get_functiondef(p.oid) as definicion,
         coalesce((select string_agg(case when a.grantee = 0 then 'public' else a.grantee::regrole::text end, ',' order by 1)
                   from aclexplode(p.proacl) a where a.privilege_type = 'EXECUTE'), '') as ejecutan,
         p.proacl is null as acl_por_defecto
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  order by p.proname, p.oid::regprocedure::text`)

const triggers = db(`
  select c.relname as tabla, t.tgname as nombre, pg_get_triggerdef(t.oid) as definicion
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where c.oid in (${TABLAS_PUBLICAS}) and not t.tgisinternal
  order by c.relname, t.tgname`)

const politicas = db(`
  select schemaname as esquema, tablename as tabla, policyname as nombre, permissive as tipo, roles::text as roles,
         cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
  order by schemaname, tablename, policyname`)

const permisosTabla = db(`
  select c.relname as tabla, a.grantee::regrole::text as rol, string_agg(a.privilege_type, ', ' order by a.privilege_type) as privilegios
  from pg_class c, aclexplode(c.relacl) a
  where c.oid in (${TABLAS_PUBLICAS}) and a.grantee <> 0
    and a.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
  group by c.relname, a.grantee
  order by c.relname, 2`)

const permisosColumna = db(`
  select c.relname as tabla, a.attname as columna, x.grantee::regrole::text as rol, x.privilege_type as privilegio
  from pg_attribute a join pg_class c on c.oid = a.attrelid, aclexplode(a.attacl) x
  where c.oid in (${TABLAS_PUBLICAS}) and a.attacl is not null
    and x.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
  order by c.relname, x.grantee::regrole::text, x.privilege_type, a.attnum`)

const buckets = db('select id, name, public, file_size_limit, allowed_mime_types::text as tipos from storage.buckets order by id')
const trabajosCron = db('select jobname, schedule, command from cron.job order by jobname')
const secretos = db('select name from vault.secrets order by name')

// ---------------------------------------------------------------------------
// Armado del archivo
// ---------------------------------------------------------------------------
const L = []
const seccion = (titulo) => L.push('', '-- ' + '-'.repeat(75), '-- ' + titulo, '-- ' + '-'.repeat(75))

L.push(
  '-- Esquema de la base de Huella Blanca (Supabase, esquema public + Storage).',
  '--',
  '-- ARCHIVO GENERADO por supabase/esquema/exportar.mjs (npm run esquema:exportar)',
  '-- leyendo el catálogo de la base en producción. No editar a mano: después de',
  '-- cambiar la base, volver a generarlo y commitearlo junto con la migración.',
  '--',
  '-- Es una foto del esquema, no una migración: sirve para reconstruir la base',
  '-- en un proyecto nuevo de Supabase (que ya trae auth, storage, los roles anon,',
  '-- authenticated y service_role, y las extensiones disponibles) o para ver de',
  '-- un vistazo cómo está hoy. No incluye datos ni valores secretos.',
  '',
  'set check_function_bodies = false;',
)

seccion('Extensiones')
for (const e of extensiones) L.push(`create extension if not exists ${ident(e.extname)} with schema ${ident(e.nspname)};`)

seccion('Tablas')
for (const t of tablas) {
  const cols = columnas.filter((c) => c.tabla === t.tabla).map((c) => {
    let def = `  ${ident(c.columna)} ${c.tipo}`
    if (c.identidad === 'a') def += ' generated always as identity'
    else if (c.identidad === 'd') def += ' generated by default as identity'
    else if (c.generada === 's') def += ` generated always as (${c.defecto}) stored`
    else if (c.defecto != null) def += ` default ${c.defecto}`
    if (c.no_nulo) def += ' not null'
    return def
  })
  L.push('', `create table public.${ident(t.tabla)} (`, cols.join(',\n'), ');')
  if (t.comentario) L.push(`comment on table public.${ident(t.tabla)} is ${literal(t.comentario)};`)
}

seccion('Restricciones (claves, únicas, checks; las foráneas al final)')
for (const r of restricciones.filter((x) => x.tipo !== 'f')) {
  L.push(`alter table public.${ident(r.tabla)} add constraint ${ident(r.nombre)} ${r.definicion};`)
}
L.push('')
for (const r of restricciones.filter((x) => x.tipo === 'f')) {
  L.push(`alter table public.${ident(r.tabla)} add constraint ${ident(r.nombre)} ${r.definicion};`)
}

seccion('Índices')
for (const i of indices) L.push(i.definicion + ';')

seccion('Funciones')
for (const f of funciones) {
  L.push('', f.definicion.trim() + ';')
  if (!f.acl_por_defecto) {
    L.push(`revoke all on function public.${f.firma.replace(/^public\./, '')} from public, anon, authenticated;`)
    const roles = f.ejecutan.split(',').filter((r) => r && r !== 'postgres' && r !== 'supabase_admin')
    if (roles.length) L.push(`grant execute on function public.${f.firma.replace(/^public\./, '')} to ${roles.join(', ')};`)
  }
}

seccion('Triggers')
for (const t of triggers) L.push(t.definicion + ';')

seccion('Seguridad por filas (RLS) y políticas')
for (const t of tablas) {
  if (t.rls) L.push(`alter table public.${ident(t.tabla)} enable row level security;`)
  if (t.rls_forzado) L.push(`alter table public.${ident(t.tabla)} force row level security;`)
}
for (const p of politicas) {
  const roles = p.roles.replace(/^\{|\}$/g, '').split(',').map((r) => (r === 'public' ? 'public' : ident(r))).join(', ')
  let s = `create policy ${ident(p.nombre)} on ${p.esquema}.${ident(p.tabla)} as ${p.tipo.toLowerCase()} for ${p.cmd.toLowerCase()} to ${roles}`
  if (p.qual) s += `\n  using (${p.qual})`
  if (p.with_check) s += `\n  with check (${p.with_check})`
  L.push('', s + ';')
}

seccion('Permisos de tablas y columnas (lo que no figura, no está otorgado)')
for (const t of tablas) L.push(`revoke all on public.${ident(t.tabla)} from anon, authenticated;`)
for (const p of permisosTabla) L.push(`grant ${p.privilegios.toLowerCase()} on public.${ident(p.tabla)} to ${p.rol};`)
const agrupados = new Map()
for (const p of permisosColumna) {
  const clave = `${p.tabla}|${p.rol}|${p.privilegio}`
  if (!agrupados.has(clave)) agrupados.set(clave, [])
  agrupados.get(clave).push(ident(p.columna))
}
for (const [clave, cols] of agrupados) {
  const [tabla, rol, privilegio] = clave.split('|')
  L.push(`grant ${privilegio.toLowerCase()} (${cols.join(', ')}) on public.${ident(tabla)} to ${rol};`)
}

seccion('Storage: buckets')
for (const b of buckets) {
  L.push(`insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (${literal(b.id)}, ${literal(b.name)}, ${b.public}, ${b.file_size_limit ?? 'null'}, ${b.tipos ? literal(b.tipos) + '::text[]' : 'null'}) on conflict (id) do nothing;`)
}

seccion('Tareas programadas (pg_cron)')
for (const j of trabajosCron) L.push(`select cron.schedule(${literal(j.jobname)}, ${literal(j.schedule)}, ${literal(j.command)});`)

seccion('Secretos en Vault (solo los nombres; el valor se carga a mano)')
for (const s of secretos) L.push(`-- ${s.name}: select vault.create_secret('<valor>', ${literal(s.name)});`)

const texto = L.join('\n') + '\n'

// Defensa: nada que parezca un secreto puede quedar en el archivo.
const sospechoso = texto.match(/\b[0-9a-f]{40,}\b|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/)
if (sospechoso) {
  console.error('El esquema contiene algo que parece un secreto; no se escribió nada. Revisar: ' + sospechoso[0].slice(0, 8) + '…')
  process.exit(1)
}

writeFileSync(SALIDA, texto)
console.log(`Esquema exportado a ${SALIDA.replace(RAIZ + '/', '')}: ${tablas.length} tablas, ${restricciones.length} restricciones, ${indices.length} índices, ${funciones.length} funciones, ${triggers.length} triggers, ${politicas.length} políticas.`)
