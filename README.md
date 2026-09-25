# Fitbook — versión web

Web estática (sin servidor ni base de datos). Los datos de cada persona se guardan en su navegador.

## Desplegar en Vercel (sin instalar nada)
1. Entra en https://vercel.com y crea una cuenta (puedes usar GitHub, GitLab o email).
2. Opción A — arrastrar: en https://vercel.com/new elige «Deploy» sin repositorio y arrastra esta carpeta.
   Opción B — GitHub: sube esta carpeta a un repositorio y en https://vercel.com/new pulsa «Import».
3. Framework Preset: «Other». Build Command: vacío. Output Directory: `.` (la raíz).
4. Pulsa «Deploy». Vercel te dará una URL tipo https://fitbook-xxxx.vercel.app

## Con la terminal (opcional)
    npm i -g vercel
    cd fitbook-web
    vercel          # primera vez: vista previa
    vercel --prod   # publicar

## Actualizar
Sustituye `app.js` por la nueva versión y vuelve a desplegar (o haz push al repositorio).

## Instalar en el móvil
Abre la URL en Chrome (Android) o Safari (iPhone) → menú → «Añadir a pantalla de inicio».

## Contraseña
- La app pide la contraseña al entrar (se recuerda en ese navegador). Es un candado de interfaz: quien mire el código fuente podría verla.
- Para una protección real en el servidor: en Vercel → Project → Settings → Environment Variables añade `FITBOOK_PASSWORD` con la contraseña que quieras y vuelve a desplegar. `middleware.js` pedirá esa contraseña (el usuario da igual) antes de descargar nada.
