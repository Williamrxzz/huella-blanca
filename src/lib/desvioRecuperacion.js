// Enlace de recuperación de contraseña → /restablecer, siempre.
//
// El email de Supabase vuelve a la app con el token en la dirección
// (`#access_token=…&type=recovery`). Si la URL pedida (`/restablecer`) no
// está en la lista de URLs permitidas del proyecto, Supabase vuelve al
// inicio en su lugar, y el inicio mandaría al panel con la sesión abierta,
// sin pedir la contraseña nueva. Este módulo se importa primero en main.jsx,
// antes de crear el cliente de Supabase, y cambia solo la ruta (el token
// queda en la dirección para que el cliente lo lea).
const { pathname, hash, search } = window.location
const esRecuperacion = /[#&]type=recovery(&|$)/.test(hash) || /[?&]type=recovery(&|$)/.test(search)

if (esRecuperacion && pathname !== '/restablecer') {
  window.history.replaceState(null, '', '/restablecer' + search + hash)
}
