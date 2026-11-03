# Habitación con los modelos proporcionados

Versión 2: habitación ampliada a 6,6 × 7,2 m interiores y 3,05 m de altura. Cama girada 90° con cabecero en la pared izquierda, mesilla junto al cabecero y setup más separado. Cámara desde la entrada reencuadrada para mostrar la cama completa. Se ha comprobado que queda dentro del encuadre con al menos un 4,5 % de margen y que el paso entre cama y setup supera 1,2 m. Todavía no sustituye el escenario de la aplicación.

## Archivos principales

- `habitacion-base.glb`: habitación sin figuritas; exportación para importar en Blender 3.0 y otros visores glTF 2.0. Contiene las imágenes necesarias. Algunos detalles procedurales y la iluminación de Blender se simplifican en GLB.
- `habitacion-modelos-usuario.blend`: escena editable guardada con Blender **4.3.2**, con materiales procedurales, cámara, iluminación de área y texturas empaquetadas. Para abrir este archivo utiliza Blender 4.3 o posterior; no se ha probado su apertura en Blender 3.0.
- `vista-entrada.png`: render real de la escena con Eevee, no una imagen generada mediante IA.
- `Objetos opcionales/`: patito y figura en GLB independientes, para futuras funciones de inventario.
- `Fuente/`: script de montaje y modelos recibidos, para reproducirlo con Blender 4.3.2. El script crea una escena nueva sin borrar las existentes. No ejecuta scripts incrustados en los modelos recibidos.

## Para tu Blender 3.0.1

1. Guarda cualquier trabajo abierto antes de continuar.
2. Abre un archivo nuevo; selecciona y elimina el cubo, cámara y luz iniciales para que no se superpongan con la habitación.
3. **Archivo > Importar > glTF 2.0** y selecciona `habitacion-base.glb`.
4. Selecciona la cámara `CAMARA / entrada` y pulsa **Ctrl + 0 del teclado numérico** para convertirla en cámara activa. Pulsa **0 del teclado numérico** para mirar desde ella.
5. Activa la previsualización de materiales. El aspecto puede diferir del render porque el GLB utiliza una iluminación simplificada.

La estructura GLB y la incrustación de sus texturas se han validado. La importación se ha comprobado con Blender 4.3.2; Blender 3.0.1 no está disponible para validarlo directamente.

## Distribución y modelos

- Setup gaming y silla: `Gaming setup Pro`, importados de tu archivo.
- Armario central: `Cupboard_01.blend`, importado y adaptado a la escala de la habitación.
- Cinco trofeos: reutilizan tu `trophy.fbx`, con material platino. Exposición ilustrativa; no representa logros sincronizados.
- Patito: `RubberDuck_LOD0.fbx`, convertido a GLB independiente. No venían sus texturas; se ha aplicado un material amarillo.
- Figura: STL proporcionado. El formato STL no incluía colores; se ha aplicado resina marfil.
- Cama y mesilla: **provisionales**, porque el ZIP de la cama superaba el límite de transferencia de 32 MiB.
- Arquitectura, ventana, cortinas, suelo, alfombra, luces y 50 cajas de juegos: añadidos para completar la escena.

Las figuras están en la colección `07 Figuras opcionales — importadas`, oculta inicialmente en el .blend. Para verlas, activa su visibilidad en el Outliner. Se han separado de la habitación base para mantener vacía la decoración inicial de la aplicación.

La textura de madera del armario no venía incluida y se ha sustituido por un material de roble. La geometría original se conserva, con escala y orientación adaptadas.

## Reproducir

Con Blender 4.3.2 y la carpeta `Fuente/input` incluida:

```sh
blender --background --factory-startup --disable-autoexec --python Fuente/montar_entorno.py -- --input Fuente/input --output salida
```

El script genera el .blend y la vista previa. Para exportar manualmente a GLB, limita la exportación a la escena activa; conserva la cámara y empaqueta las imágenes.
