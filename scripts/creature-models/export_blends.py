"""Re-export edited .blend files: blender -b -P export_blends.py -- [names] [--no-render]."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import Model, SPECIES
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
render='--no-render' not in args
names=[arg for arg in args if not arg.startswith('--')] or list(SPECIES)
for name in names: Model.from_blend(name).export(render=render)
