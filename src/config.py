import os

# Screen and game constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
TILE_SIZE = 32
FPS = 60
WALK_SPEED = 150  # pixels per second
AUTOSAVE_INTERVAL = 30000  # 30 seconds in ms

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)

# Paths (relative to project root)
ASSETS_PATH = "assets"
DATA_PATH = "data"
SAVES_PATH = "saves"
CREATURES_FILE = os.path.join(DATA_PATH, "creatures.json")
ROUTES_FILE = os.path.join(DATA_PATH, "routes.json")
SAVE_FILE = os.path.join(SAVES_PATH, "player_save.json")

# Ensure directories exist
os.makedirs(SAVES_PATH, exist_ok=True)
