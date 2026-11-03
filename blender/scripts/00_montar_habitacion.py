"""Montaje opcional. Abre este archivo desde Blender > Scripting y pulsa Run Script.
Crea una habitación nueva. No borra la escena existente. No añade personajes.
Los otros scripts siguen siendo utilizables individualmente.
"""
from pathlib import Path
import bpy
import math
# Blender puede asignar un __file__ virtual a los textos del editor.
# Usa la ruta real del archivo abierto; en modo background usa __file__.
text = getattr(bpy.context.space_data, 'text', None)
source = text.filepath if text and text.filepath else __file__
folder = Path(bpy.path.abspath(source)).resolve().parent
required = ['12_habitacion.py', '01_cama.py', '02_estanteria_juegos.py',
            '03_escritorio.py', '04_silla.py', '05_ordenador.py',
            '06_baldas_trofeos.py', '09_lampara.py', '08_caja_juego.py']
missing = [name for name in required if not (folder / name).is_file()]
if missing:
    message = 'Faltan archivos en ' + str(folder) + ': ' + ', '.join(missing)
    if not bpy.app.background:
        def draw_error(self, context):
            self.layout.label(text='Extrae todos los scripts juntos y abre el archivo 00 desde esa carpeta.')
            self.layout.label(text=str(folder))
        bpy.context.window_manager.popup_menu(draw_error, title='No se encuentran los scripts', icon='ERROR')
    raise FileNotFoundError(message)

def asset(filename, position=(0,0,0), rotation=0):
    path = folder / filename
    result = {'__file__': str(path), '__name__': '__main__'}
    exec(compile(path.read_text(encoding='utf-8'), str(path), 'exec'), result)
    root=result['root'];root.location=position;root.rotation_euler[2]=rotation
    return root

asset('12_habitacion.py')
asset('01_cama.py',(-1.32,.7,0))
asset('02_estanteria_juegos.py',(0,2.10,0))
asset('03_escritorio.py',(1.80,.7,0),-math.pi/2)
asset('04_silla.py',(1.12,.7,0),-math.pi/2)
asset('05_ordenador.py',(1.85,.7,.81),-math.pi/2)
asset('06_baldas_trofeos.py',(2.07,1.05,0),-math.pi/2)
asset('09_lampara.py',(-1.85,-.7,0))
for row,count in [(0,26),(1,24)]:
    for i in range(count):
        asset('08_caja_juego.py',(-.75+i*.058,1.99,.66+row*.52))
print('Habitación montada. Personajes y trofeos se añaden por separado.')
