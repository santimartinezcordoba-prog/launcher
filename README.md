# Mi habitación

Primera demo visual de un launcher para Windows: tu biblioteca de juegos en una habitación acogedora vista desde la puerta.

## Desarrollo

Requiere Node.js 22.12 o posterior (validado con Node 24) y npm.

```sh
npm ci
npm run dev
```

El servidor de desarrollo utiliza el puerto 5173. `npm run build` comprueba los tipos y crea la aplicación en `dist/`. `npm run preview` permite comprobar esa compilación.

## Ventana de escritorio en Windows

```sh
npm ci
npm run desktop
```

Abre una ventana Electron con la compilación local, sin servidor de desarrollo. La integración de Node está desactivada en la interfaz y la ventana utiliza aislamiento de contexto y sandbox. Todavía no hay instalador ni integraciones nativas con las tiendas. La ventana de Windows no se ha validado desde el entorno Linux de desarrollo.

## Pruebas

```sh
npx playwright install chromium
npm test
```

En el entorno de nube se reutiliza `/usr/bin/chromium` si está disponible. Las pruebas verifican navegación, 50 juegos en la estantería, búsqueda y filtros, favoritos persistentes, personalización, fichas y estados de la demo.

## Qué puedes probar

- Acercarte a la estantería y seleccionar cualquiera de sus 50 lomos. Escape vuelve de la ficha a la estantería y de la estantería a la habitación.
- Buscar entre 60 juegos de ejemplo, filtrar por instalación, favoritos, tienda o género y ordenar los resultados. Ctrl+K abre el buscador.
- Fijar favoritos, que tienen prioridad en la estantería; los huecos restantes se rellenan según las horas de juego de muestra.
- Abrir los ajustes desde el ordenador y cambiar el ambiente, el color de paredes y ropa de cama, además de reducir animaciones. Las preferencias y favoritos se guardan localmente.

## Alcance de la demo

El escenario utiliza una imagen conceptual generada y capas interactivas con acercamiento. **No es una escena 3D navegable**; los cambios de color utilizan máscaras aproximadas sobre la imagen. La referencia visual aprobada se conserva en `public/room.png`.

Todos los juegos, tiempos, estados de instalación y requisitos son datos de demostración, no una lectura del ordenador o de las cuentas del usuario. Las portadas tipográficas son provisionales. Jugar y Descargar muestran un aviso; no ejecutan procesos ni descargan juegos. Los requisitos deben consultarse en fuentes oficiales antes de utilizarlos como información real.

Las integraciones con Steam, Epic, Ubisoft, Xbox/Game Pass, EA, Battle.net, Riot y GOG son futuras. Consultar bibliotecas completas requiere estudiar los métodos y permisos de cada plataforma. Figuritas desbloqueables, misiones y pagos tampoco están implementados. No se solicitan credenciales ni se realizan cobros.

## Próximas etapas

1. Validar visuales y navegación en Windows.
2. Sustituir el escenario por geometría y materiales 3D si se necesita movimiento de cámara libre y decoración independiente.
3. Incorporar detección local y apertura de juegos, empezando por Steam.
4. Añadir metadatos verificados, bibliotecas remotas y otras tiendas por etapas.
