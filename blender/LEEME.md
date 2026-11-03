# Modelos independientes para Blender

Scripts probados en Blender 4.3.2, con ajustes de rutas y emisión para Blender 3.0 (aún sin prueba completa en esa versión). Compatibles como objetivo con Blender 3.x, 4.x y 5.x, en metros. Cada archivo es independiente y contiene sus materiales y herramientas: puedes compartirlo o abrirlo sin instalar complementos. Son modelos iniciales editables, no assets finales de calidad fotográfica.

## Cómo usarlos

1. Abre Blender y el espacio de trabajo **Scripting**.
2. En el editor de texto, selecciona **Text > Open** y abre uno de los `.py` de `scripts/`.
3. Pulsa **Run Script** (triángulo, o Alt+P con el ratón en el editor de texto).
4. Vuelve a **Layout**. Selecciona la colección nueva en el Outliner y pulsa el punto del teclado numérico para encuadrar el objeto.
5. Usa Material Preview para ver los materiales. En modo Solid se ven grises.

No pegues el archivo en la consola de Python: ábrelo en el editor de texto. Guarda todos los scripts juntos si quieres ejecutar `00_montar_habitacion.py`; el montaje necesita encontrar los demás en su misma carpeta.

Cada ejecución crea una colección y un objeto padre nuevos. **No borra ni sustituye objetos existentes**; ejecutarlo otra vez crea otra copia. El script de habitación también configura una cámara y la resolución de la escena. Guarda primero tu trabajo si utilizas una escena existente.

## Archivos

- `00_montar_habitacion.py`: monta una habitación completa con 50 cajas, sin peluches, figuras ni trofeos desbloqueados.
- `01_cama.py`: cama, cabecero, colchón, almohadas y cubierta con pliegues.
- `02_estanteria_juegos.py`: estantería vacía con armario inferior.
- `03_escritorio.py`: escritorio y cajonera.
- `04_silla.py`: silla de escritorio.
- `05_ordenador.py`: monitor, teclado y ratón.
- `06_baldas_trofeos.py`: dos baldas vacías.
- `07_trofeo_platino.py`: trofeo independiente.
- `08_caja_juego.py`: caja reutilizable, con material provisional de portada y lomo.
- `09_lampara.py`: lámpara con luz cálida.
- `10_personaje_gato.py`: peluche de gato original, opcional.
- `11_personaje_robot.py`: figura de robot original, opcional.
- `12_habitacion.py`: paredes, techo, suelo, alfombra, luces y cámara desde la entrada.

Los personajes no tienen rig ni animaciones. Los materiales procedurales ayudan a retocar los modelos en Blender. Para el launcher, el relieve procedural tendrá que hornearse a texturas: GLB no conserva todos los nodos de Blender. Mantén las piezas separadas para personalización y futuras interacciones.

## Exportar

Guarda una copia `.blend`. Para compartir la geometría utiliza **File > Export > glTF 2.0**, formato **GLB**. Selecciona el modelo y sus piezas y activa **Selected Objects** si exportas un solo mueble. No se exporta ni reemplaza automáticamente la habitación actual del launcher.

## Conector

Un proyecto comunitario conocido es https://github.com/ahujasid/blender-mcp . No es una integración oficial de Blender o de OpenAI. Sigue su README actual: requiere un complemento dentro de Blender, un servidor MCP local y un cliente que pueda utilizar ese servidor. Instalar el complemento por sí solo no conecta este chat. No expongas el puerto local del complemento a Internet. Los scripts de este paquete funcionan sin conector ni acceso remoto.
