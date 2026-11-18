// Política de privacidad (Ley 25.326 de Protección de los Datos Personales).
// Escrita a partir de cómo funciona la app de verdad: si cambia lo que se
// guarda, quién lo ve o con qué servicio se comparte, hay que actualizarla
// (y la fecha de abajo).
import { Link } from 'react-router-dom'
import Encabezado from '../components/Encabezado'

const ACTUALIZADA = '18 de noviembre de 2026'

export default function Privacidad() {
  return (
    <main className="pagina texto-legal">
      <Encabezado volver="/" />
      <h1>Política de privacidad</h1>
      <p className="ayuda">Actualizada el {ACTUALIZADA}.</p>

      <p>
        Huella Blanca es un proyecto académico de la Universidad Nacional de la Patagonia Austral
        (Caleta Olivia) para identificar mascotas y ayudarlas a volver a su casa. Esta página
        explica qué datos guarda la app, para qué y quién los puede ver.
      </p>

      <h2>Si encontraste una mascota</h2>
      <p>
        No necesitás cuenta para ver su ficha ni para avisar. Cuando abrís la ficha queda
        registrada la fecha y la hora. Si tu navegador ya le había dado permiso de ubicación a esta
        app, también tu ubicación aproximada; nunca te lo pedimos solo por mirar.
      </p>
      <p>
        Si avisás, guardamos el lugar que marcaste (o que describiste), lo que escribiste y, si lo
        dejaste, tu contacto. Eso lo ve solamente la familia de la mascota, para poder
        encontrarla. Si después creás una cuenta, el aviso queda asociado a ella.
      </p>

      <h2>Si tenés una cuenta</h2>
      <ul>
        <li><strong>Tu cuenta:</strong> nombre, email y, si lo cargás, tu celular.</li>
        <li>
          <strong>Tus mascotas:</strong> los datos de su ficha, su foto y la ubicación de tu casa,
          que se guarda solo como un punto en el mapa para saber si alguien la encontró lejos.
        </li>
        <li><strong>Las búsquedas:</strong> los casos de pérdida, los avisos que recibís y los escaneos de su placa.</li>
      </ul>

      <h2>Qué se ve en la ficha pública</h2>
      <p>
        Quien escanea la placa ve el nombre, la foto y los datos de la mascota que vos elegiste
        mostrar. <strong>Nunca ve tu domicilio.</strong> Tu teléfono no se muestra nunca escrito
        en pantalla: solo viaja dentro de los botones de llamar y de WhatsApp, y únicamente
        mientras la mascota está reportada como perdida. Si la reportás como perdida, se muestra
        una zona aproximada (no un punto exacto) de dónde se la vio por última vez.
      </p>

      <h2>Para qué se usan los datos</h2>
      <p>
        Solo para que la mascota vuelva a su casa: mostrar la ficha, avisarte cuando alguien la
        escanea o la ve, y registrar quién ayudó. Con los escaneos y los avisos se arman
        estadísticas generales, sin datos personales. No vendemos ni cedemos datos a nadie, no hay
        publicidad y no se cobra nada.
      </p>

      <h2>Servicios que intervienen</h2>
      <ul>
        <li><strong>Supabase:</strong> guarda la base de datos, las fotos y las cuentas.</li>
        <li><strong>Vercel:</strong> sirve la aplicación.</li>
        <li>
          <strong>Anthropic (Claude):</strong> cuando subís una foto, la analiza para comprobar que
          sea de un animal y sugerir datos de la ficha. No se usa para identificar personas.
        </li>
        <li><strong>OpenStreetMap:</strong> los mapas. Recibe la zona del mapa que se está mirando.</li>
        <li>
          <strong>El servicio de notificaciones de tu navegador</strong> (Google, Apple o Mozilla),
          si activás los avisos en tu teléfono.
        </li>
      </ul>

      <h2>Cuánto tiempo se guardan</h2>
      <p>
        Mientras tengas tu cuenta. Si das de baja una mascota, deja de verse pero su historial se
        conserva. Si eliminás tu cuenta, se borra todo al instante y para siempre: tus datos, tus
        mascotas, sus fotos, sus casos, avisos y escaneos. Los avisos que diste sobre mascotas de
        otras personas quedan en esos casos, pero sin tu nombre ni tu contacto.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés ver y corregir tus datos en <Link to="/perfil">tu perfil</Link>, y eliminar tu
        cuenta desde ahí mismo, sin pedírselo a nadie.
      </p>
      <p className="ayuda">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
        mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
        interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley
        N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de órgano de
        control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que
        interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
        vigentes en materia de protección de datos personales.
      </p>

      <h2>Seguridad</h2>
      <p>
        Las conexiones van cifradas, cada cuenta solo puede leer y modificar lo suyo (lo controla
        la base de datos, no solo la pantalla) y las contraseñas no las guarda la app: las maneja
        el servicio de cuentas de Supabase.
      </p>
    </main>
  )
}
