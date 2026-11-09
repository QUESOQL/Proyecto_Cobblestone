/** Mensajes de Supabase Auth, en palabras de la app. */
export function authMessage(m: string): string {
  if (/invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/already registered/i.test(m)) return "Ese correo ya tiene cuenta. Entra con tu contraseña.";
  if (/password should be at least/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/email not confirmed/i.test(m)) return "Confirma tu correo con el enlace que te enviamos y vuelve a entrar.";
  if (/rate limit/i.test(m)) return "Demasiados intentos seguidos. Espera un momento y vuelve a intentar.";
  if (/provider is not enabled|unsupported provider/i.test(m)) return "El inicio con Google todavía no está activado. Usa tu correo por ahora.";
  // Google o Supabase rechazaron el canje del código: casi siempre es el secreto del cliente.
  if (/exchange external code|invalid_client|unauthorized_client/i.test(m))
    return "Google rechazó el inicio de sesión: revisa el ID y el secreto del cliente configurados en Supabase.";
  // Mensaje original al final, para poder diagnosticar errores que no conocemos.
  return `No pudimos entrar. Inténtalo de nuevo. (Detalle: ${m})`;
}
