# Mi habitación

Prototipo de launcher para Windows con una habitación **3D real** construida en Blender a partir de los modelos proporcionados. La cámara parte de la entrada y una puerta conduce a una sala de colección por géneros. El escenario utiliza `public/models/room.glb`; la antigua imagen `public/room.png` se conserva únicamente como referencia.

## Desarrollo

Requiere Node.js 22.12 o posterior (validado con Node 24) y npm.

```sh
npm ci
npm run dev
```

Abre la dirección que indique Vite, normalmente en el puerto 5173. Deja la terminal abierta. El navegador necesita WebGL 2 y aceleración gráfica. La primera apertura carga aproximadamente 13 MB de geometría y texturas del modelo local.

```sh
npm run build
npm run preview
```

La compilación comprueba TypeScript y crea `dist/`, incluyendo los modelos. Ningún modelo se descarga de una web externa durante el uso de la aplicación.

## Pantalla principal limpia

La entrada centra la vista en la habitación. Los muebles interactivos muestran un contorno ligero al pasar el ratón. La puerta Sala de colección abre una segunda habitación ampliada, con estanterías por género, Favoritos y Más jugados. La vista principal muestra la sala desde la puerta, con suelo, techo y paredes laterales. Las estanterías modulares ocupan la pared del fondo y dos laterales diagonales, aprovechando distintas alturas. Favoritos y Más jugados están en el tramo central, frente a la entrada. Desde allí se puede abrir la biblioteca completa o filtrada por género. Pulsa el ordenador para abrir la biblioteca, los ajustes, las misiones y el inventario. Ctrl+K abre la búsqueda y Escape vuelve atrás. Los controles de teclado de los muebles solo se muestran al recibir foco.

La personalización se desbloquea con un **kit de 75 puntos**, disponible en los ajustes del ordenador y en la tienda. El kit es una compra única; los cambios de ambiente, paredes y sábanas quedan incluidos. Los puntos siguen siendo locales de demostración.

El inventario ofrece Colocar o Mover objeto. La cámara pasa a una vista cenital con cuadrícula de 20 cm para el suelo. Las baldas se editan de frente, a pasos de 5 cm. Escritorio, mesilla y muebles comprados también admiten colocación en superficie. Los botones de giro avanzan 15°. Hay que confirmar Guardar posición; cancelar descarta la propuesta. Se comprueban límites, muebles existentes y solapamiento entre objetos mediante huellas rectangulares conservadoras. Las posiciones antiguas se migran a coordenadas al cargar. Se venden una planta, un taburete y una mesa auxiliar, además de los objetos anteriores.

## Qué puedes probar

- Pulsar el ordenador o cualquier parte del setup para abrir ajustes, tienda, misiones e inventario.
- Entrar por la puerta en la sala de colección, elegir un género y seleccionar sus portadas frontales. Cada apartado muestra sus dos juegos más jugados en la sala. Al abrirlo conserva diez posiciones: dos portadas centrales y los demás lomos a los lados, con huecos vacíos si tiene menos juegos. Los demás juegos están en la biblioteca filtrada.
- Abrir Mis platinos desde el ordenador. Las fichas incluyen progreso y logros.
- Volver con Escape: ficha → sala de colección → entrada. Ctrl+K abre el buscador.
- Buscar entre 60 juegos de ejemplo y filtrar por tienda, género, instalación o favoritos.
- Completar misiones, reclamar sus puntos una sola vez, comprar objetos y colocarlos o guardarlos. El patito y la figura del mago utilizan tus GLB importados. El gato, cristal y robot son modelos 3D provisionales creados por la aplicación.
- Cambiar ambiente, color de paredes y ropa de cama. Los cambios afectan a materiales e iluminación 3D. Las preferencias, el inventario y los favoritos se guardan localmente en el navegador.
- Reducir las animaciones. Las interacciones sobre los modelos también tienen botones accesibles mediante teclado.

Si el modelo o WebGL fallan, se ofrece reintentar y se mantiene disponible la biblioteca. No se utiliza una imagen para simular que el 3D ha cargado.

## Ventana de escritorio en Windows

```sh
npm ci
npm run desktop
```

Electron compila y abre la aplicación sin servidor Vite. Sirve exclusivamente los archivos de `dist/` mediante el protocolo local `room://launcher`, que permite cargar los GLB conservando la seguridad del navegador. La interfaz tiene Node desactivado, aislamiento de contexto y sandbox; las ventanas externas y los permisos están bloqueados. La ventana de Windows todavía necesita validación en Windows; las comprobaciones de navegador se realizan en Linux. No hay instalador aún.

## Pruebas

```sh
npx playwright install chromium
npm test
```

En la nube se reutiliza `/usr/bin/chromium` si existe, con SwiftShader para probar WebGL sin GPU física. Las pruebas requieren modelos 3D reales y verifican render, cámara, selección mediante raycasting, biblioteca, persistencia, compras, carga de una figura importada y recuperación tras una descarga GLB fallida. Los resultados no equivalen a una validación de rendimiento con la GPU del usuario.

## Escena y materiales

La distribución aprobada mide 6,6 × 7,2 m y tiene la cama girada junto a la pared izquierda. El setup, armario y copas proceden de los archivos recibidos. La cama continúa siendo provisional porque el ZIP original superaba el límite de transferencia. Los materiales del ordenador y los trofeos quedan pendientes de una pasada visual posterior; la iluminación WebGL puede diferir del render de Blender.

La escena se renderiza bajo demanda: vuelve a dibujar al mover la cámara, cambiar materiales, colocar objetos o redimensionar la ventana. Se limita la densidad de píxeles y se agrupan las lamas del suelo para reducir llamadas de dibujo. Las transiciones respetan la preferencia de accesibilidad.

`blender/entorno-modelos-usuario.zip` contiene la escena editable y el script de montaje. La versión web añade interacciones, lomos y personalización en `src/room3d.tsx`; editar Blender por sí solo no modifica las funciones del launcher.

## Alcance de los datos

Los juegos, las horas, la instalación, los requisitos y los trofeos son **datos de demostración**, no una lectura del ordenador o las cuentas. Las portadas son provisionales. Jugar y Descargar muestran un aviso; no ejecutan procesos ni descargan juegos. Verifica los requisitos en la fuente oficial antes de utilizarlos como información real.

Steam, Epic, Ubisoft, Xbox/Game Pass, EA, Battle.net, Riot y CD PROJEKT RED aún no están vinculados. CD PROJEKT RED ofrece accesos a su portal oficial de cuenta. El platino es una distinción de esta aplicación al completar su lista de ejemplo, no un trofeo oficial sincronizado.

Los puntos son locales y no tienen valor monetario. Comprar puntos con dinero no está habilitado, no se solicitan credenciales y no se realizan cobros. El backend de cuentas, las integraciones de tiendas, la detección y apertura de juegos y los pagos reales son etapas futuras.

## Iluminación y profundidad

La vista utiliza una luz principal lateral desde la ventana, luces locales cálidas en lámpara y baldas y una aportación fría del monitor. La luz ambiental se mantiene baja para conservar las diferencias entre caras y las sombras. Los modos Atardecer, Noche y Luz suave cambian las intensidades y los colores de estas luces.

Se aplican texturas de madera y lino recuperadas de los archivos proporcionados, con relieve y rugosidad distintos para madera, tejido y metal. El suelo se reconstruye con lamas estrechas y juntas alternadas, agrupadas para reducir llamadas de dibujo. La cámara conserva la vista desde la entrada con un pequeño desplazamiento lateral.

El sombreado de contacto GTAO se calcula al 60 % de resolución y se combina con la imagen completa. Si el navegador no admite render targets de coma flotante, se conserva la iluminación, los materiales, las sombras y el contorno interactivo, omitiendo solo GTAO. Los mapas de sombras se actualizan cuando cambia la geometría o se colocan objetos; no se recalculan solo por mover la cámara.

La cama y las mesillas siguen siendo provisionales mientras se espera una exportación completa del modelo Rhino. Las mejoras de materiales de esta vista no equivalen a convertir ese modelo.

Comparación de la vista general:

| Antes | Ahora |
| --- | --- |
| ![Vista anterior](docs/launcher-before-depth.png) | ![Iluminación y materiales actuales](docs/launcher-3d.png) |

[Ver el ambiente nocturno](docs/launcher-night.png).

Al pasar el ratón por los objetos interactivos, un contorno dorado con brillo marca sus bordes visibles. El efecto no modifica el color ni la emisión de sus materiales y desaparece al retirar el puntero o abrir un diálogo.

## Respuesta del resaltado

La estantería y los juegos utilizan un contorno SVG proyectado desde sus límites, con cuatro lados rectos y un brillo uniforme. El borde no reproduce las irregularidades de la malla. Cambiar de juego actualiza solo ese contorno: no vuelve a ejecutar el render de la habitación ni el sombreado de contacto.

Los movimientos del ratón sobre el canvas se agrupan una vez por fotograma, conservando la última posición, y se comprueban contra volúmenes precalculados. Los botones de juegos actualizan el contorno directamente. Se evitan recorridos de las mallas y actualizaciones de estado React al mover el ratón; los clics sobre el canvas conservan su comprobación precisa de geometría y oclusión. El ordenador utiliza una silueta calculada una vez por cámara y tamaño de ventana, sin iluminación ni posprocesado. Al pasar el ratón se muestra su imagen de contorno guardada, incluidos los huecos entre patas y silla. Los juegos y la estantería mantienen sus contornos ligeros; ningún movimiento del ratón vuelve a renderizar la habitación.

La prueba de interacción recorre doce juegos con ráfagas de eventos, comprueba que cada contorno cambia y que el contador de renders WebGL permanece igual. Mide por separado el trabajo del manejador; esto no equivale a garantizar una tasa de fotogramas en todos los equipos.

## Biblioteca y pósteres (0.3.1)

El botón Biblioteca junto a la estantería y Ctrl+K abren la biblioteca amplia con búsqueda, filtros y portadas. Las fichas muestran imágenes de Steam u otras fuentes de arte del juego; se cargan directamente desde sus CDN, sin API ni cuentas. Requieren conexión y pueden dejar de estar disponibles. El entorno de desarrollo bloquea el acceso a esos CDN, por lo que no se ha verificado aquí cada portada externa: las pruebas interceptan una respuesta de imagen para verificar su presentación y prueban el fallo de red. Si la imagen no carga, aparece una ilustración local señalada como reserva. No se usa un rectángulo con el título como sustituto de portada.

Para comprobar la versión descargada, abre el ordenador: debe indicar **0.3.2 · Carátulas y siluetas**. Al sustituir un ZIP, detén Vite con Ctrl+C en la terminal anterior, abre una terminal en la carpeta nueva y ejecuta `npm ci` y `npm run dev`. Abre el puerto que indique esa terminal; recarga la página con Ctrl+Shift+R. Abrir otro ZIP no cambia el proyecto que sirve un Vite antiguo.

Vistas del editor y la biblioteca lateral (esta captura simula la falta de conexión a los CDN de portadas):

| Vista cenital | Colocación en baldas |
| --- | --- |
| ![Plano cenital con planta](docs/editor-floor.png) | ![Objeto en una balda](docs/editor-shelves.png) |

[Referencia del anterior panel lateral](docs/library-dock.png)

## Arrastre y superficies (0.3.1)

Mantén pulsado el botón principal sobre la cuadrícula y arrastra para mover la previsualización. Se mantiene la colocación con un clic. Los movimientos se agrupan por fotograma y se aplican directamente al objeto 3D; React recibe la posición final al soltar. Durante el arrastre se omiten los efectos de posprocesado; al soltar se recuperan las sombras y el render completo. Un borde rojo señala propuestas que no se pueden guardar. La captura del puntero mantiene el arrastre al pasar sobre las etiquetas o salir del canvas, y la cancelación del gesto restaura la propuesta anterior.

Las baldas, la mesilla, el escritorio y la parte superior de la estantería tienen cámaras cercanas para decorar sus superficies. Las etiquetas flotantes solo aparecen en el plano cenital. También se puede decorar la mesa auxiliar y el taburete comprados una vez colocados. Sus adornos acompañan su movimiento y giro, se conservan al recargar y se guardan en el inventario si se retira el mueble que los sostiene. La posición sigue requiriendo Guardar posición; cancelar el editor descarta los cambios.

Vistas de la versión 0.3.1 (las portadas de esta captura usan la reserva sin conexión):

| Sobre la estantería | Mesa comprada |
| --- | --- |
| ![Colocación sobre la estantería](docs/front-cabinet.png) | ![Adorno sobre una mesa](docs/front-table.png) |

![Biblioteca amplia](docs/library-wide.png)

![Zona libre del escritorio](docs/front-desk.png)

## Carátulas, lomos y siluetas (0.3.2)

Biblioteca queda centrado bajo la estantería en la vista cercana. El encuadre deja espacio inferior para el botón. La ficha y las tarjetas utilizan proporción vertical 2:3 y `object-fit: contain`, mostrando toda la ilustración sin deformarla ni recortar títulos. Las imágenes horizontales de reserva conservan su proporción y dejan márgenes.

Los lomos incluyen una pequeña ilustración completa y un fondo impreso derivado del arte, con el título vertical. Sus imágenes se cargan de forma asíncrona, se reducen para ahorrar memoria y se comparten entre actualizaciones. Los cambios de ambiente no repiten sus descargas. Sin arte disponible se conserva un diseño ilustrado local; para usar imágenes como texturas el servidor debe admitir CORS. Las actualizaciones de texturas se agrupan y se posponen mientras se recorren juegos con el ratón.

La biblioteca y la ficha prueban fuentes alternativas de Steam antes de usar la reserva. La ficha permite Reintentar. Minecraft, Hearthstone, los títulos de Riot y Fortnite dependen de otras fuentes externas; algunas direcciones siguen sin estar verificadas y pueden fallar aunque Steam funcione. No se afirma que todas las carátulas estén reparadas o disponibles sin conexión. El paisaje de reserva indica un fallo de carga de la imagen, no que falte el juego ni su licencia.

El contorno del setup se obtiene de una máscara plana de sus mallas y se guarda como PNG transparente. Ese cálculo se repite al cambiar cámara o ventana, no al mover el ratón. La estantería conserva un reborde liso para no reproducir las irregularidades de su modelo.

Capturas de 0.3.2 sin conexión a las fuentes de arte (se ven diseños e ilustraciones de reserva):

| Silueta del setup | Biblioteca bajo el mueble |
| --- | --- |
| ![Contorno de mesa y silla](docs/setup-silhouette.png) | ![Botón bajo la estantería](docs/library-below.png) |

![Ilustración completa en la ficha](docs/poster-fit.png)

## Fichas ampliadas (0.4.0)

Las fichas tienen pestañas Información, Tu actividad y Galería. Se muestran tienda e instalación, géneros, mando, modos, número de jugadores cuando se conoce, idiomas y disponibilidad de voces/subtítulos. Las horas, logros e instalación siguen siendo ejemplos; última partida, tamaño de descarga y tamaño instalado no se inventan y quedan sin confirmar hasta conectar cuentas y detectar instalaciones.

Los juegos con un identificador Steam pueden consultar su ficha pública mediante `/api/store-details/:id`. El servidor de Vite (desarrollo y preview) y el protocolo local de Electron implementan esta ruta con destino fijo, ID numérico, timeout, caché acotada, texto sin HTML y medios HTTPS de CDN conocidos. La fuente Steam se identifica incluso cuando el juego está en otra tienda, pues las ediciones pueden diferir. No hay autenticación ni acceso a las bibliotecas privadas. En hosting estático sin esa ruta, o sin conexión, se mantiene la ficha y el botón de reintento.

La galería carga hasta seis capturas y dos tráileres que devuelva Steam. Las capturas se pueden ampliar y los vídeos usan controles, sin reproducción automática ni precarga. No todos los juegos proporcionan material. Abrir en la tienda conduce a su ficha o catálogo oficial; Electron permite abrir únicamente dominios de tiendas explícitamente admitidos en el navegador del sistema. Las partidas y logros no se comparten ni se suman entre plataformas.

Validación: compilación de producción, dos pruebas de navegador con datos de tienda simulados, fallo de red y reintento; comprobación del saneamiento de la respuesta y rechazo de IDs inválidos. La consulta real a cada tienda y la ventana de Electron en Windows quedan sin verificar en este entorno.

![Ficha ampliada con respuesta de tienda simulada y portada de reserva](docs/game-info.png)

## Lomos legibles (0.4.1)

Se eliminan las miniportadas repetidas y se amplía el título vertical. Las texturas pasan a 192 × 1024, con filtrado anisotrópico; el arte fuente se reduce a 256 píxeles de ancho para no mantener todas las imágenes a tamaño completo. Al señalar o enfocar un juego aparece una carátula lateral completa, sin alterar el render 3D. La previsualización mantiene una ilustración de reserva mientras llega la imagen. Las fuentes externas y sus limitaciones de disponibilidad siguen siendo las mismas.

![Lomos y vista previa, con la red de imágenes desactivada en la prueba](docs/spine-preview.png)

## Cajas de colección (0.4.2)

Los lomos tienen un inserto claro u oscuro, bandas azules y texto vertical de alto contraste, con una franja del arte cuando está disponible. La vista previa conserva la carátula completa. La captura muestra el diseño sin conexión a las fuentes de arte.

![Cajas de colección](docs/spines-physical.png)

En la versión 0.4.3 todos los lomos usan un fondo oscuro con texto claro. La franja sigue mostrando arte cuando se puede cargar; no representa el diseño original del lomo físico.


## Sala de colección y cuenta RED (0.5.0)

La estantería principal y sus juegos desaparecen del dormitorio. Una puerta abre una nueva sala 3D con doce estanterías, una por cada género de los 60 juegos de demostración. Las cajas se muestran de frente, con un máximo de cuatro por estantería. Seleccionar un rótulo o el selector de géneros acerca la cámara a esa estantería. Si una portada mide menos de 65 × 98 píxeles en pantalla, se oculta en lugar de mostrar una miniatura ilegible. El pie de la vista de género ofrece Ver biblioteca de ese género; abre el catálogo completo, restablece los otros filtros y mantiene solo el género elegido. Biblioteca completa y Ctrl+K siguen disponibles.

La sala usa geometría ligera y madera local. La imagen se actualiza al cambiar cámara, tamaño o texturas; señalar una portada no redibuja el 3D. Las portadas mantienen su proporción y se proyectan sobre la cara frontal de cada caja. Requieren acceso a sus CDN; si fallan, aparece la ilustración local con el nombre del juego. Los adornos colocados sobre el armario retirado vuelven al inventario, conservando su propiedad y los puntos. Mis platinos pasa al menú del ordenador.

GOG se sustituye en la interfaz por CD PROJEKT RED. Los ejemplos de The Witcher 3 y Cyberpunk 2077 se agrupan en esa plataforma; Disco Elysium queda en Steam. Crear cuenta e Iniciar sesión abren `https://accounts.cdprojektred.com/` en el navegador del sistema, donde se elige el flujo correspondiente. No se capturan credenciales, no se simula una sesión iniciada y no se sincronizan cuentas ni bibliotecas. Para vincular RED al launcher sigue siendo necesaria una integración oficial de autenticación. El acceso de red a ese portal no pudo verificarse desde este entorno.


Capturas de 0.5.0 con las descargas de imágenes externas bloqueadas para comprobar la reserva sin conexión:

![Puerta de la sala de colección](docs/bedroom-door.png)

| Vista de la sala | Estantería de un género |
| --- | --- |
| ![Sala por géneros](docs/collection-overview.png) | ![Portadas frontales y acceso al género](docs/collection-genre.png) |


## Estanterías ampliadas y vista frontal (0.6.0)

La sala pasa a 19,6 × 21 m y los muebles a unos 4,24 m de ancho, con capacidad para ocho cajas en dos filas. Se incorporan dos estanterías en la zona central: Favoritos y Más jugados. Favoritos utiliza las estrellas guardadas y se actualiza al cambiarlas desde una ficha; Más jugados ordena por las horas del catálogo, que siguen siendo datos de ejemplo. Sus botones Biblioteca abren respectivamente el filtro Favoritos y el catálogo ordenado por Más jugados.

La vista general elegida es frontal y tiene desplazamiento vertical. Ofrece las catorce estanterías, con las dos centrales al principio. Cada previsualización muestra dos portadas grandes; Ver estantería muestra hasta ocho y mantiene el acceso al catálogo completo de esa sección. El encuadre se adapta a la ventana sin ocultar las cajas por un umbral de píxeles, por lo que entrar o salir de F11 no cambia qué juegos aparecen. Las imágenes se precargan al entrar la estantería en la zona visible. La vista general usa un solo canvas con cámaras frontales, se renderiza al cambiar contenido o tamaño y conserva la resolución original de las portadas HTML. Se limita la resolución del fondo 3D para acotar la memoria de vistas largas.

Validación: compilación de producción y ocho pruebas de navegador. Incluyen entrada a 1600 × 770 sin redimensionar, recorrido de las catorce estanterías, carga de sus imágenes, cambio a 1600 × 900 y vuelta, ventana compacta, favoritos que cambian al quitar estrellas, orden de más jugados, biblioteca filtrada, inventario y recuperación sin WebGL. Se usa una ilustración de prueba para verificar la carga y el encuadre; las fuentes reales de carátulas siguen dependiendo de sus servidores externos.

Capturas de validación con ilustraciones de prueba inyectadas únicamente por Playwright:

![Vista frontal con Favoritos y Más jugados](docs/collection-frontal.png)

![Estantería ampliada de Más jugados](docs/collection-expanded.png)


## Habitación 3D como vista principal (0.6.1)

Entrar por la puerta vuelve a mostrar la sala 3D completa, con suelo, paredes, iluminación y los muebles situados en el espacio. Se mantienen las estanterías ampliadas por género y las dos centrales de Favoritos y Más jugados. La vista general permite mirar arrastrando y ampliar con la rueda; Centro, Fondo, Izquierda y Derecha ofrecen encuadres de cada zona. Pulsar un rótulo acerca su estantería y muestra hasta ocho portadas.

Índice frontal abre explícitamente la vista con desplazamiento de 0.6.0; Sala 3D regresa a la habitación. El dormitorio original permanece accesible mediante Volver a mi habitación. Las imágenes se proyectan sobre los objetos y se ocultan detrás de otras estanterías cuando corresponde, sin depender del umbral de tamaño que obligaba a usar F11. La cámara se actualiza bajo demanda y las sombras no se recalculan por cada movimiento del ratón.

Validación: nueve pruebas de navegador que cubren la entrada 3D por defecto, cambio de vistas y arrastre, índice opcional, vuelta al dormitorio, favoritos, más jugados, filtros, tamaño compacto y recuperación sin WebGL; compilación de producción. Las capturas siguientes usan portadas de prueba inyectadas por Playwright:

![Sala 3D restaurada](docs/collection-room-restored.png)

![Vista de las estanterías centrales](docs/collection-room-center.png)


## Primera sala ampliada, con ocho juegos por mueble (0.6.2)

Se recuperan directamente el componente y los estilos de la primera sala de colección (base 0.5.0), conservando su cámara en perspectiva desde dentro, el techo, el suelo, los materiales y el acercamiento animado. Se retiran las vistas añadidas en 0.6.0 y 0.6.1.

La sala se amplía a 22,5 × 17,5 m para alojar catorce estanterías. Los muebles de Favoritos y Más jugados ocupan los dos huecos centrales de la **pared del fondo, frente a la entrada**; no hay estanterías en el centro del suelo. Los otros cuatro muebles del fondo conservan géneros y las paredes laterales alojan cuatro cada una.

Cada estantería mide 3,4 m de ancho y muestra hasta ocho cajas, distribuidas en dos filas de cuatro. Se eligen ocho para conservar el tamaño de las portadas y la separación. Favoritos sigue las estrellas guardadas; Más jugados conserva el orden de horas de ejemplo. Se mantienen los botones de biblioteca con su filtro u orden correspondiente y el acceso al dormitorio original. Las portadas no se ocultan por el antiguo umbral fijo de tamaño de ventana.

Validación: ocho pruebas de navegador, incluyendo posición real de ambos muebles en la misma pared de fondo, ausencia de muebles en medio, ocho portadas en dos filas legibles, favoritos, más jugados, filtros, vista compacta, recuperación sin WebGL y vuelta al dormitorio; compilación de producción. Las capturas usan imágenes de prueba inyectadas solo por Playwright:

![Primera sala ampliada](docs/collection-original-expanded.png)

![Ocho portadas al acercarse](docs/collection-original-eight.png)


## Encuadre de las catorce estanterías (0.6.3)

Acción pasa a la pared izquierda y Cooperativo a la derecha. El fondo queda con Aventura, Favoritos, Más jugados y Carreras; cada lateral aloja cinco muebles. Se reduce el ancho frontal y se deja espacio de entrada para que la cámara pueda situarse delante de la última estantería lateral. Se mantienen ocho cajas por mueble y los acercamientos de la sala original.

La vista general calcula la posición de la cámara a partir de las ocho esquinas de los catorce muebles y de la proporción real de la ventana. Reserva márgenes horizontales y verticales en lugar de usar una posición fija dentro de las filas laterales. El encuadre se vuelve a calcular al redimensionar, sin recurrir a vistas cenitales ni a una cuadrícula. Los rótulos mantienen la posición de su mueble y ajustan su tamaño a la anchura proyectada; al señalarlos o enfocarlos se muestran a tamaño completo.

Validación: ocho pruebas de navegador y repetición de la comprobación del encuadre final. Para cada uno de los catorce muebles se verifica que sus límites proyectados están dentro de la imagen, con márgenes, a 1600 × 770, 1600 × 900 y 1024 × 650. También se comprueban Acción y Cooperativo en los laterales, Favoritos y Más jugados en la pared del fondo, las ocho portadas y los filtros de biblioteca. Compilación de producción correcta. La captura usa portadas de prueba inyectadas por Playwright:

![Las catorce estanterías completas en el encuadre](docs/collection-complete-frame.png)


## Todas las portadas visibles y más grandes (0.6.4)

La distribución deja de ser un pasillo largo. Las catorce estanterías se reparten en cinco paños poco profundos, orientados hacia la entrada y aprovechando la altura como una pared de biblioteca. Los géneros con hasta cuatro juegos utilizan un módulo bajo; los que necesitan dos filas usan uno alto. Cada módulo admite hasta ocho portadas y se amplía cuando aumenta su colección. Favoritos y Más jugados permanecen en el paño central; Acción queda a la izquierda y Cooperativo a la derecha.

El campo de visión utiliza la pantalla para mostrar los muebles y sus juegos, conservando suelo, paredes y techo 3D. Al pasar el ratón por una portada se abre una ampliación con su título; esta ampliación no redibuja el escenario. Solo aparece al mover el ratón sobre un juego, evitando que se abra automáticamente al entrar por la puerta. Los acercamientos, la biblioteca filtrada, los favoritos y el orden por horas siguen disponibles.

Validación: compilación de producción y ocho pruebas de navegador. La vista general a 1600 × 770 muestra las 66 portadas de las catorce secciones; se mide cada imagen y la más pequeña tiene aproximadamente 68 × 103 píxeles. Se verifican también el encuadre a otros tamaños, la ampliación por ratón sin render 3D adicional, ocho juegos al acercarse, filtros, favoritos, más jugados y recuperación sin WebGL. La captura utiliza portadas de prueba inyectadas por Playwright:

![Sala en abanico con todas las portadas visibles](docs/collection-readable-room.png)


## Sala desde la puerta (0.6.5)

La vista general vuelve a situar al visitante dentro de una habitación: cámara a la altura de la entrada, suelo libre delante, techo diferenciado y paredes laterales con perspectiva. Se sustituye el abanico casi plano de 0.6.4 por tres tramos de fondo y dos laterales a 60 grados. Acción ocupa el lateral izquierdo, Cooperativo el derecho; Favoritos y Más jugados permanecen frente a la entrada.

El campo de visión se adapta al tamaño de la ventana para mantener completos los catorce módulos y reservar espacio para los controles. Las portadas se cargan al entrar sin necesitar F11. La vista general da contexto a la sala; las miniaturas del fondo son menores que en la anterior pared frontal. Pasar el ratón amplía una carátula sin redibujar el 3D, y seleccionar un género acerca hasta ocho juegos en dos filas. Se mantienen la biblioteca filtrada, los favoritos y el regreso al dormitorio.

Validación: compilación de producción y ocho pruebas de navegador. El encuadre se comprueba a 1600 × 770, 1600 × 900 y 1024 × 650; se revisa visualmente la captura con suelo, techo y laterales. También se verifican la ampliación de carátula, las ocho portadas al acercarse, los filtros de biblioteca y el regreso al dormitorio. La captura siguiente utiliza una carátula de prueba, sin depender de los servidores externos de imágenes:

![Vista desde la puerta con suelo, techo y paredes laterales](docs/collection-doorway-room.png)


## Diez huecos fijos por apartado (0.6.6)

Se amplían la sala, las estanterías y las cajas. Todos los apartados reservan ahora diez posiciones en dos filas de cinco, con el mismo ancho y la misma altura. Las divisiones de madera dejan visibles los huecos libres: Carreras, por ejemplo, muestra su único juego y conserva nueve huecos vacíos. No se añaden juegos ni carátulas de relleno.

La posición y el tamaño de cada apartado son fijos y ya no dependen del número de juegos o favoritos. Se mantienen la vista desde la puerta con suelo, techo y laterales, Favoritos y Más jugados en el fondo y los accesos a la biblioteca. La previsualización por ratón pasa a 230 × 345 píxeles; el acercamiento se ajusta al ancho de cinco cajas. La vista general encuadra toda la sala ampliada, mientras que el acercamiento permite consultar las portadas con detalle.

Validación: compilación de producción y nueve pruebas de navegador. Se comprueban diez juegos ordenados por horas, dos filas de cinco, dimensiones iguales entre apartados llenos y vacíos, nueve huecos libres en Carreras, estabilidad al quitar favoritos, regreso al dormitorio y encuadre a 1600 × 770, 1600 × 900 y 1024 × 650. Las capturas utilizan carátulas de prueba independientes de las fuentes externas:

![Sala ampliada con diez huecos por apartado](docs/collection-ten-slot-room.png)

![Diez portadas en dos filas de cinco](docs/collection-ten-games.png)

![Un juego y nueve huecos libres](docs/collection-nine-free-slots.png)


## Encuadre ampliado y dos rankings (0.6.7)

La sala aprovecha más pantalla: se centra la cámara en la altura de los muebles y se reducen los márgenes libres, manteniendo suelo, techo y laterales. A 1600 × 770, la portada más pequeña pasa de unos 32 × 46 a 36 × 52 píxeles. Los quince apartados conservan diez huecos fijos. Supervivencia ocupa el espacio superior izquierdo que estaba vacío. Su antiguo sitio en el fondo muestra Más jugados recientemente. Más jugados de siempre permanece debajo.

El ranking de siempre ordena por horas acumuladas. Recientemente ordena por horas de los últimos catorce días, excluye juegos sin actividad en ese periodo y abre la biblioteca con ese orden. Los datos de ambas listas son de demostración; no hay sincronización de actividad real.

Validación: compilación de producción, pruebas de los rankings y sus accesos a biblioteca, estabilidad de huecos, favoritos y encuadre a tres tamaños de ventana. Captura con imágenes de prueba:

![Sala ampliada con Supervivencia en el lateral y ambos rankings](docs/collection-two-rankings.png)


## Lectura de carcasas (0.6.8)

La sala conserva su encuadre general y añade zoom de 100 % a 400 % mediante rueda o botones. Arrastrar el fondo desplaza la vista; Restablecer vista recupera el encuadre inicial. Seleccionar un género restablece el zoom y acerca sus diez huecos. Los títulos se muestran sobre las cajas al acercarse a una estantería o ampliar la sala. La previsualización al señalar funciona también en las vistas de género: portada de 270 × 405 píxeles y título completo de 17 píxeles.

Validación: compilación y pruebas de encuadre, zoom real, arrastre, restauración, títulos en la vista cercana y apertura de fichas. Señalar una portada mantiene el escenario sin redibujos adicionales.

La captura usa imágenes de reserva para verificar los títulos sin depender de los servidores externos de carátulas.

![Portadas y títulos en la vista cercana](docs/collection-readable-titles.png)


## Dos portadas destacadas y cajas laterales (0.6.9)

La sala completa muestra únicamente los dos juegos más jugados de cada apartado, con carcasas de mayor tamaño y títulos explícitos. En la sección reciente, el orden usa las horas de los últimos catorce días; en las demás, las horas acumuladas. Se retiran el zoom manual y el arrastre. La sala conserva su suelo, techo, paredes laterales y distribución de géneros.

Pulsar una sección o una de sus portadas abre la estantería: dos cajas de frente en el centro y hasta ocho lomos a los lados. Se mantienen diez posiciones, dejando vacías las que no tienen juego. El primer clic en una caja despliega su portada en el centro con una animación de extracción. El segundo clic en la portada abre la ficha existente para jugar o descargar. Clicar el fondo exterior o pulsar Escape cierra esa portada y conserva el apartado anterior. Las animaciones respetan la preferencia de movimiento reducido. Las acciones de juego y descarga mantienen el comportamiento de demostración del launcher.

Validación: compilación, secuencia completa con animación, selección de un lomo, segundo clic, cierre exterior y Escape, huecos vacíos, ventana compacta, filtros, favoritos, rankings y regreso al dormitorio. En la vista general a 1600 × 770 las portadas más pequeñas miden unos 75 × 106 píxeles, frente a 36 × 52 en 0.6.7. Las capturas usan carátulas de prueba:

![Dos destacados por sección](docs/collection-two-featured.png)

![Portadas centradas y lomos laterales](docs/collection-center-and-spines.png)

![Portada extraída para abrir su ficha](docs/collection-selected-case.png)


## Personajes, tienda y primera persona (0.7.0)

La entrada ofrece elegir entre El Bollo, El Fideo, El Pepino y El Cabezón. El primer personaje es gratuito; desbloquear cada uno de los demás cuesta 180 puntos. Cambiar entre personajes comprados no vuelve a cobrar puntos. La opción Elegir personaje al iniciar permite mostrar este selector en cada arranque o entrar directamente con el último aspecto.

La tienda añade un apartado Personaje con una previsualización 3D. El Taller de tintes cuesta 120 puntos y desbloquea colores libres para cuerpo, manoplas, peto/mangas y zapatos. También hay gorro de pescador (80), corona (180), gafas (90), mirada despistada (60) y sonrisa (60). Los artículos y el aspecto de cada personaje se guardan en el navegador; cambiar de personaje recupera sus colores y accesorios. Las manos y mangas de primera persona reflejan el personaje y los colores elegidos.

Las recompensas son pequeñas: bronce 1, plata 2, oro 4 y platino 8 puntos. El registro usa un identificador por juego y logro para impedir cobros repetidos al volver a abrir una ficha o recargar. Los logros que ya existían al migrar la partida no generan una entrega masiva automática; sus recompensas de ejemplo pueden recogerse desde la ficha. Al detectar logros nuevos, la conciliación los recompensa una sola vez. Los seis logros del juego de ejemplo y su platino suman 19 puntos. Los trofeos todavía son ilustrativos: no se han conectado cuentas reales.

WASD o flechas mueven al personaje con colisiones contra paredes y muebles. El botón Activar ratón captura el cursor para mirar; también se puede mirar manteniendo el botón derecho. E o clic permiten interactuar con objetos cercanos; el aviso aparece a menos de 2,6 metros. Escape suelta el ratón y los diálogos pausan el movimiento. El botón Vista de habitación conserva el modo anterior, y Entrar en primera persona permite regresar.

La puerta se abre con una animación y comunica el dormitorio con una biblioteca recorrible. Las estanterías muestran sus dos destacados; acercarse permite escoger una de sus cajas. El cajón Catálogo abre todos los juegos para recuperar los que no están expuestos. Solo se lleva una caja: al tomar otra, la anterior vuelve a su sitio. La caja se conserva al pasar de habitación. La biblioteca añade un segundo ordenador retro, manteniendo el ordenador moderno en el dormitorio. Acercarse al lector con una caja reproduce la apertura de la bandeja y la inserción del disco, y abre la ficha para confirmar Jugar o Descargar. El lanzamiento y las descargas mantienen el comportamiento de demostración; no se inician aplicaciones externas.

Se agrupa el parquet del dormitorio y se simplifica la iluminación del modo caminable. Cambiar colores actualiza las manos y el modelo del probador sin recargar la habitación. Las pruebas anteriores se ejecutan explícitamente en la vista de habitación; las de primera persona verifican el modo nuevo desde una sesión limpia.

Capturas con imágenes de reserva para los juegos:

![Dormitorio en primera persona](docs/first-person-bedroom.png)

![Probador del Bollo](docs/bollo-wardrobe.png)

![Caja en la mano](docs/game-in-bollo-hands.png)

![Ordenador retro y lector](docs/retro-disc-animation.png)


## Biblioteca compacta y movimiento (0.7.1)

La sala de la biblioteca es más pequeña y muestra hasta diez juegos por sección, en dos filas de cinco. La velocidad al caminar aumenta. El primer clic en la escena captura el ratón para mirar; Escape lo libera y también se puede mirar con el botón derecho. La biblioteca completa sigue disponible desde el catálogo.


## Sala más compacta (0.7.2)

La biblioteca ocupa menos espacio y expone hasta ocho juegos por sección en dos filas de cuatro. El primer clic en la escena solicita pantalla completa y captura el ratón; el navegador puede rechazar la solicitud y permite salir de ella por sus propios controles.


## Cámara y pausa (0.7.3)

La cámara sigue el ratón sobre la escena sin mantener botones. Escape pausa el movimiento y abre Continuar, Ajustes, Soporte y Salir. Salir vuelve a la vista general; los menús recuperan el cursor. En el navegador, la captura ilimitada del ratón sigue requiriendo una interacción del usuario.


## Ratón capturado (0.7.4)

Entrar captura el ratón tras completar la pantalla completa. Permite girar indefinidamente y mirar casi 90 grados al techo y al suelo. Escape libera el cursor y abre el menú de pausa. El navegador requiere el clic inicial para autorizar la captura.


## Transiciones sin interrupciones (0.7.5)

Se elimina la pantalla de entrar y controlar la cámara. Se conserva el mismo lienzo y la captura del ratón al cambiar de sala. El ordenador retro está contra la pared de entrada, orientado al interior; sus colisiones y la animación del disco siguen su nueva posición. La primera interacción en la escena o una tecla de movimiento solicita la captura cuando el navegador la necesita.
