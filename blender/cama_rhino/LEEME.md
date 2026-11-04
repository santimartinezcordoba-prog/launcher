# Cama de rafia — preparación de archivos

Se ha leído el `.3dm` original con rhino3dm 8.35.0 y recuperado sus nueve imágenes de textura incrustadas. Las imágenes recuperadas se guardan en `/workspace/scratch/cama-rhino/texturas`, conservando los nombres originales. `diagnostico.json` registra sus nombres y tamaños; las imágenes todavía no se utilizan en el launcher.

El modelo está en pulgadas y contiene 5 mallas, 4 SubD, 10 extrusiones, 5 Breps y 5 curvas. Las extrusiones y los Breps no incluyen mallas de render guardadas; el lector disponible no ofrece la teselación de estas superficies. Convertir solo las mallas disponibles dejaría piezas de la cama y las mesillas incompletas. Por ello, la cama provisional se conserva en la aplicación.

Prerrequisito para integrar el modelo completo: una exportación OBJ, FBX o GLB desde Rhino u otra herramienta que pueda teselar todas sus superficies. Se podrán reutilizar las texturas recuperadas; los materiales de V-Ray requieren adaptación a los materiales PBR del launcher.
