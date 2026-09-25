// Protección con contraseña en el servidor (Vercel Routing Middleware).
// Solo se activa si defines la variable de entorno FITBOOK_PASSWORD en Vercel
// (Project → Settings → Environment Variables). Usuario: cualquiera; contraseña: la de la variable.
export const config = { matcher: '/:path*' };

export default function middleware(request) {
  const pass = process.env.FITBOOK_PASSWORD;
  if (!pass) return; // sin variable: la web queda solo con el candado de la app
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const pw = decoded.slice(decoded.indexOf(':') + 1);
      if (pw === pass) return;
    } catch (e) {}
  }
  return new Response('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Fitbook", charset="UTF-8"' }
  });
}
