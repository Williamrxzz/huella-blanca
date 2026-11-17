# Eliminar cuentas desde /admin/cuentas (Edge Function `eliminar-cuenta`):
# borra al instante la cuenta, sus mascotas, casos, escaneos, avisos y fotos;
# anonimiza los avisos que dio sobre mascotas de otros; deja la placa de baja;
# no toca a nadie más. Corre contra la base real con cuentas temporales.
#
#   PRUEBAS_EN_PRODUCCION=si python3 tests/e2e/eliminar-cuenta.py
import base64, json, os, subprocess, sys, traceback, urllib.request, urllib.error, uuid, ssl

if os.environ.get('PRUEBAS_EN_PRODUCCION') != 'si':
    print('Estas pruebas escriben en la base de producción. Para correrlas: PRUEBAS_EN_PRODUCCION=si npm run test:e2e', file=sys.stderr)
    sys.exit(2)

REF = 'pgnxanjiswmytdocdhuw'
URL = f'https://{REF}.supabase.co'
CWD = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CTX = ssl.create_default_context(cafile='/etc/ssl/cert.pem')
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
resultados = []


def check(nombre, ok, detalle=''):
    resultados.append(bool(ok))
    print(('PASS ' if ok else 'FAIL ') + nombre + (f'  [{detalle}]' if detalle else ''), flush=True)


def cli(*args):
    return subprocess.run(['npx', 'supabase', *args], cwd=CWD, capture_output=True, text=True).stdout


def db(sql):
    out = subprocess.run(['npx', 'supabase', 'db', 'query', '--linked', sql], cwd=CWD, capture_output=True, text=True)
    txt = out.stdout + out.stderr
    i = txt.find('{')
    if i < 0:
        raise RuntimeError('db: ' + txt[:300])
    obj = json.JSONDecoder().raw_decode(txt[i:])[0]
    if 'rows' not in obj:
        raise RuntimeError('db: ' + json.dumps(obj)[:300])
    return obj['rows']


claves = json.loads(cli('projects', 'api-keys', '--project-ref', REF, '-o', 'json'))
SERVICE = next(k['api_key'] for k in claves if k.get('name') == 'service_role')
ANON = next(k['api_key'] for k in claves if k.get('name') == 'anon')


def http(metodo, ruta, cuerpo=None, token=None, apikey=None, crudo=None, extra=None):
    h = {'apikey': apikey or SERVICE, 'Authorization': 'Bearer ' + (token or SERVICE)}
    if extra:
        h.update(extra)
    datos = crudo
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(URL + ruta, data=datos, headers=h, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try:
            return e.code, json.loads(t)
        except Exception:
            return e.code, t


def rest(metodo, tabla, cuerpo=None, query=''):
    return http(metodo, f'/rest/v1/{tabla}{query}', cuerpo, extra={'Prefer': 'return=representation'})


def existe_en_storage(ruta):
    # Se mira la tabla de Storage, no la URL pública: el CDN sigue sirviendo
    # un rato la copia en caché de una foto ya borrada.
    nombre = ruta.replace("'", "''")
    return db(f"select count(*)::int c from storage.objects where bucket_id = 'fotos-mascotas' and name = '{nombre}'")[0]['c'] > 0


def foto_publica(ruta):
    try:
        with urllib.request.urlopen(f'{URL}/storage/v1/object/public/fotos-mascotas/{ruta}', timeout=30, context=CTX) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def crear_usuario(etiqueta, rol):
    clave = uuid.uuid4().hex + 'Aa1!'
    email = f'{TAG}-{etiqueta}@example.com'
    s, u = http('POST', '/auth/v1/admin/users', {'email': email, 'password': clave, 'email_confirm': True})
    assert s in (200, 201), f'crear {etiqueta}: {s} {u}'
    s, p = rest('POST', 'perfiles', {'id': u['id'], 'nombre': f'PRUEBA {etiqueta}', 'rol': rol})
    assert s in (200, 201), f'perfil {etiqueta}: {s} {p}'
    return {'id': u['id'], 'email': email, 'clave': clave}


def sesion(u):
    s, r = http('POST', '/auth/v1/token?grant_type=password', {'email': u['email'], 'password': u['clave']}, apikey=ANON, token=ANON)
    assert s == 200, f'login {u["email"]}: {s} {r}'
    return r['access_token']


def eliminar(token, id_):
    return http('POST', '/functions/v1/eliminar-cuenta', {'id': id_}, token=token, apikey=ANON)


TAG = 'prueba-elim-' + uuid.uuid4().hex[:8]
users = {}
PL = None
FOTOS = []
cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from escaneos) escaneos, (select count(*) from avistamientos) avistamientos, (select count(*) from auth.users) usuarios_auth, (select count(*) from storage.objects where bucket_id='fotos-mascotas') fotos"
base_inicial = db('select ' + cols)[0]
print('línea base:', base_inicial, flush=True)

try:
    # ---- datos de prueba: A (se borra), B (control, usuario común), C (admin de prueba), D (otro admin, objetivo prohibido)
    for e, rol in (('a', 'usuario'), ('b', 'usuario'), ('c', 'admin'), ('d', 'admin')):
        users[e] = crear_usuario(e, rol)
    A, B, C, D = (users[k]['id'] for k in 'abcd')
    f_ma, f_re, f_av, f_b = (f'{TAG}/{n}.png' for n in ('mascota-a', 'reencuentro-a', 'aviso-de-a', 'mascota-b'))
    FOTOS = [f_ma, f_re, f_av, f_b]
    for f in FOTOS:
        s, _ = http('POST', f'/storage/v1/object/fotos-mascotas/{f}', crudo=PNG, extra={'Content-Type': 'image/png'})
        assert s in (200, 201), 'subir ' + f
    pub = lambda f: f'{URL}/storage/v1/object/public/fotos-mascotas/{f}'
    s, ma = rest('POST', 'mascotas', {'dueno_id': A, 'nombre': 'PruebaA', 'especie': 'perro', 'foto_url': pub(f_ma), 'domicilio_lat': -46.43, 'domicilio_lng': -67.52})
    s2, mb = rest('POST', 'mascotas', {'dueno_id': B, 'nombre': 'PruebaB', 'especie': 'gato', 'foto_url': pub(f_b)})
    MA, MB = ma[0]['id'], mb[0]['id']
    s, pl = rest('POST', 'placas', {'codigo': 'TP' + uuid.uuid4().hex[:6].upper(), 'mascota_id': MA, 'estado': 'activa'})
    PL = pl[0]['id']
    rest('POST', 'escaneos', {'placa_id': PL, 'mascota_id': MA})
    rest('POST', 'casos_perdida', {'mascota_id': MA, 'estado': 'perdida', 'origen': 'manual', 'foto_reencuentro_url': pub(f_re)})
    rest('POST', 'avistamientos', {'mascota_id': MA, 'origen': 'manual', 'situacion': 'la_vi_pasar', 'mensaje': 'aviso anónimo sobre A'})
    s, av = rest('POST', 'avistamientos', {'mascota_id': MB, 'origen': 'manual', 'situacion': 'la_vi_pasar', 'mensaje': 'aviso de A sobre mascota de B', 'contacto': 'a@example.com', 'foto_url': pub(f_av), 'reportado_por': A})
    AV_B = av[0]['id']
    rest('POST', 'casos_perdida', {'mascota_id': MB, 'estado': 'cerrada', 'origen': 'manual', 'rescatista_id': A})
    rest('POST', 'escaneos', {'mascota_id': MB})
    print('datos de prueba creados', flush=True)
    check('las 4 fotos de prueba existen antes', all(foto_publica(f) == 200 for f in FOTOS))

    tok_c, tok_b = sesion(users['c']), sesion(users['b'])

    # ---- pantalla del admin: lista y detalle con su sesión real
    s, lista = http('POST', '/rest/v1/rpc/admin_listar_cuentas', {}, token=tok_c, apikey=ANON)
    check('admin: la lista de cuentas incluye a A', s == 200 and any(c['id'] == A for c in lista), f'HTTP {s}')
    s, det = http('POST', '/rest/v1/rpc/admin_detalle_cuenta', {'p_id': A}, token=tok_c, apikey=ANON)
    check('admin: el detalle de A trae el domicilio', s == 200 and abs(det['mascotas'][0]['domicilio_lat'] + 46.43) < 1e-6, f'HTTP {s}')
    s, _ = http('POST', '/rest/v1/rpc/admin_listar_cuentas', {}, token=tok_b, apikey=ANON)
    check('usuario común: NO puede listar cuentas', s >= 400, f'HTTP {s}')
    s, _ = http('POST', '/rest/v1/rpc/admin_detalle_cuenta', {'p_id': A}, token=tok_b, apikey=ANON)
    check('usuario común: NO puede ver el detalle (domicilio)', s >= 400, f'HTTP {s}')

    # ---- rechazos de la función eliminar-cuenta
    s, r = eliminar(tok_b, A)
    check('usuario común: NO puede eliminar (403)', s == 403 and r.get('error') == 'no_autorizado', f'{s} {r}')
    check('...y A sigue intacta', db(f"select count(*) c from perfiles where id='{A}'")[0]['c'] == 1)
    s, r = eliminar(tok_c, C)
    check('admin: NO puede eliminarse a sí mismo', s == 400 and r.get('error') == 'cuenta_propia', f'{s} {r}')
    s, r = eliminar(tok_c, D)
    check('admin: NO puede eliminar a otro admin', s == 400 and r.get('error') == 'cuenta_admin', f'{s} {r}')
    s, r = eliminar(tok_c, '00000000-0000-0000-0000-000000000000')
    check('cuenta inexistente: 404', s == 404 and r.get('error') == 'cuenta_no_encontrada', f'{s} {r}')
    s, r = eliminar(tok_c, 'no-es-un-id')
    check('id inválido: 400', s == 400, f'{s} {r}')
    check('...y los admins C y D siguen ahí', db(f"select count(*) c from perfiles where id in ('{C}','{D}')")[0]['c'] == 2)

    # ---- el borrado real, como administrador
    s, r = eliminar(tok_c, A)
    check('admin elimina a A: respuesta ok', s == 200 and r.get('ok') is True, f'{s} {r}')

    q = lambda sql: db(sql)[0]
    check('A no existe en auth.users', q(f"select count(*) c from auth.users where id='{A}'")['c'] == 0)
    check('A no existe en perfiles', q(f"select count(*) c from perfiles where id='{A}'")['c'] == 0)
    check('mascota de A borrada', q(f"select count(*) c from mascotas where id='{MA}'")['c'] == 0)
    check('casos de la mascota de A borrados', q(f"select count(*) c from casos_perdida where mascota_id='{MA}'")['c'] == 0)
    check('escaneos de A borrados', q(f"select count(*) c from escaneos where mascota_id='{MA}' or placa_id='{PL}'")['c'] == 0)
    check('avisos sobre la mascota de A borrados', q(f"select count(*) c from avistamientos where mascota_id='{MA}'")['c'] == 0)
    pla = q(f"select estado, mascota_id from placas where id='{PL}'")
    check('placa de A: desvinculada y de baja (no se borra)', pla['estado'] == 'baja' and pla['mascota_id'] is None, str(pla))
    for f in (f_ma, f_re, f_av):
        check(f'foto borrada de Storage: {f.split("/")[1]}', not existe_en_storage(f))
    av2 = q(f"select reportado_por, contacto, foto_url, mensaje from avistamientos where id='{AV_B}'")
    check('aviso de A sobre mascota de B: queda, sin datos de A', av2['reportado_por'] is None and av2['contacto'] is None and av2['foto_url'] is None and 'B' in av2['mensaje'], str(av2))
    check('caso de B: queda, sin rescatista', q(f"select count(*) filter (where rescatista_id is null) c from casos_perdida where mascota_id='{MB}'")['c'] == 1)
    check('B, su mascota, su escaneo y su foto siguen intactos',
          q(f"select (select count(*) from perfiles where id='{B}') p, (select count(*) from mascotas where id='{MB}') m, (select count(*) from escaneos where mascota_id='{MB}') e")['p'] == 1
          and foto_publica(f_b) == 200)
    s, lista = http('POST', '/rest/v1/rpc/admin_listar_cuentas', {}, token=tok_c, apikey=ANON)
    check('la lista del admin ya no incluye a A', s == 200 and not any(c['id'] == A for c in lista))
except BaseException:
    traceback.print_exc()
    resultados.append(False)
    print('FAIL la prueba se interrumpió (ver el error de arriba)')
finally:
    print('limpiando datos de prueba…', flush=True)
    try:
        ids = [u['id'] for u in users.values()]
        lista_ids = ",".join(f"'{i}'" for i in ids)
        if ids:
            sub = f"select id from mascotas where dueno_id in ({lista_ids})"
            db(f"delete from avistamientos where reportado_por in ({lista_ids}) or mascota_id in ({sub})")
            db(f"delete from escaneos where mascota_id in ({sub})")
            db(f"delete from casos_perdida where mascota_id in ({sub}) or rescatista_id in ({lista_ids})")
            db(f"delete from mascotas where dueno_id in ({lista_ids})")
            db(f"delete from perfiles where id in ({lista_ids})")
            for i in ids:
                http('DELETE', f'/auth/v1/admin/users/{i}')
        if PL:
            db(f"delete from placas where id='{PL}'")
        if FOTOS:
            http('DELETE', '/storage/v1/object/fotos-mascotas', {'prefixes': FOTOS})
    except Exception as e:
        print('ERROR en la limpieza:', e)
    base_final = db('select ' + cols)[0]
    print('línea base final:', base_final)
    check('después de limpiar, la base quedó exactamente como estaba', base_final == base_inicial, f'{base_inicial} -> {base_final}')
    print(f'\nRESULTADO: {sum(resultados)}/{len(resultados)} verificaciones pasaron')
    sys.exit(0 if all(resultados) else 1)
