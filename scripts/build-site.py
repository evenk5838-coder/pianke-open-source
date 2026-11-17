"""Build the public project page and its browser demo, using only public files."""
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / '_site'
if target.exists():
    raise SystemExit('Output directory already exists; choose a new empty path.')
target.mkdir(parents=True)
shutil.copytree(root / 'site', target, dirs_exist_ok=True)
shutil.copytree(root / 'docs/media', target / 'media')
shutil.copytree(root / 'outputs/pianke', target / 'app', ignore=shutil.ignore_patterns('.DS_Store', 'preview', 'start.command'))
(target / '.nojekyll').touch()
print('Built public project page and browser demo.')
