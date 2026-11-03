"""Montaje opcional. Abre este archivo desde Blender > Scripting y pulsa Run Script.
Crea una habitación nueva. No borra la escena existente. No añade personajes.
Los otros scripts siguen siendo utilizables individualmente.
"""
from pathlib import Path
import runpy
import math
folder=Path(__file__).resolve().parent

def asset(filename, position=(0,0,0), rotation=0):
    result=runpy.run_path(str(folder / filename))
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
