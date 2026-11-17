// Ficha de ejemplo para /ejemplo ("Ver un ejemplo de ficha" en el inicio).
//
// Hasta el 2026-11-17 ese enlace llevaba a la ficha REAL de Blanca: cada
// visitante registraba un escaneo real, recibía el teléfono del dueño (Blanca
// estaba perdida) y, si tocaba "La vi acá", le mandaba un aviso real con push.
// Ahora la pantalla es la misma, pero con estos datos fijos: no se consulta ni
// se escribe nada en la base, no hay teléfono y el aviso es simulado.
//
// Son los datos públicos de la ficha de Blanca (los que ve cualquiera que
// escanee su placa), con un caso de pérdida simulado para mostrar todo lo que
// ve quien encuentra una mascota perdida. La "última ubicación" es el centro
// de Caleta Olivia, no su domicilio.
export const FICHA_EJEMPLO = {
  encontrada: true,
  nombre: 'Blanca',
  especie: 'perro',
  sexo: 'hembra',
  raza: 'Mestiza',
  tamano: 'mediano',
  color: 'Negra con pecho blanco',
  senas: 'Mancha blanca en la pata delantera derecha',
  caracter: 'temerosa',
  salud: null,
  foto_url:
    'https://pgnxanjiswmytdocdhuw.supabase.co/storage/v1/object/public/fotos-mascotas/8fbf2316-eb8a-4c28-abb0-c5073c3e0d98/1788913102154-WhatsApp%20Image%202026-09-08%20at%2021.18.01.jpeg',
  estado: 'perdida',
  perdida_automatica: false,
  mensaje_perdida: 'Se asusta con los ruidos fuertes. Si la ves, no la persigas: avisanos dónde está.',
  ultima_lat: -46.4436,
  ultima_lng: -67.5181,
  // Sin teléfono real: los botones de contacto se muestran pero no llaman.
  contacto_tel: 'ejemplo',
  contacto_whatsapp: 'ejemplo',
}
