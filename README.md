# TimeTracker

Control de tiempo por proyecto para Windows, con icono en la bandeja del sistema y un widget flotante de escritorio. Pensado para freelances/agencias que necesitan saber cuánto tiempo dedican a cada cliente para facturar.

## Funcionalidades

- Icono en la bandeja del sistema con menú rápido de proyectos y cronómetro.
- Widget flotante siempre visible, con mosaico de proyectos (logo/imagen incluida), creación rápida de proyectos y tema claro/oscuro.
- Botones de minimizar ("enviar al fondo", sin ocultar el widget) y cerrar.
- Arranque automático con Windows (oculto en la bandeja).
- Gestión de proyectos y clientes: tarifa por hora, imagen/logo, archivado.
- Informe mensual por proyecto/cliente y exportación a CSV (por mes o por rango de fechas personalizado).
- Actualizaciones automáticas: la app comprueba sola si hay una versión nueva publicada y se actualiza en segundo plano.

## Descargar e instalar

Ve a la pestaña [Releases](https://github.com/Factor129/TimeTracker/releases) de este repositorio y descarga **únicamente** `TimeTracker-Setup-X.X.X.exe` de la versión más reciente. Ejecútalo e instala — las siguientes versiones se instalarán solas automáticamente.

Cada release incluye otros dos archivos que **no hay que descargar ni abrir**: `latest.yml` y `TimeTracker-Setup-X.X.X.exe.blockmap`. Son metadatos que la app ya instalada consulta sola en segundo plano para comprobar si hay una versión nueva y descargar solo lo que cambió; no tienen ningún uso manual.

> El instalador no está firmado digitalmente, así que es posible que Windows SmartScreen muestre un aviso la primera vez ("Más información" → "Ejecutar de todas formas").

Tus datos (proyectos, clientes, tiempo registrado) se guardan localmente en tu carpeta de usuario de Windows, separados de la instalación, así que se conservan entre actualizaciones.

## Desarrollo

Requisitos: Node.js 20+.

```bash
npm install
npm run dev      # ejecuta la app en modo desarrollo con recarga en caliente
npm run build     # compila main/preload/renderer a out/
npm run dist:win  # genera el instalador local en dist/ (sin publicar)
```

## Publicar una nueva versión

1. Sube el número de versión en `package.json`.
2. Crea y sube una etiqueta con el mismo número, con el prefijo `v`:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. El workflow de GitHub Actions (`.github/workflows/release.yml`) compila el instalador de Windows y lo publica automáticamente en la pestaña Releases. Los usuarios con una versión anterior instalada la recibirán solos vía auto-actualización.

## Stack técnico

Electron + React + TypeScript, empaquetado con `electron-vite` y `electron-builder`, auto-actualización con `electron-updater`. Los datos se guardan en un archivo JSON local (sin dependencias nativas ni servidores).

## Licencia

MIT — ver [LICENSE](LICENSE).
