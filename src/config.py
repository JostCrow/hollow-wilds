import os

# Screen and game constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
TILE_SIZE = 32
FPS = 60
WALK_SPEED = 150  # pixels per second
AUTOSAVE_INTERVAL = 2000  # 2 seconds in ms
DEBUG_MODE = True  # Toggle with 'd' key to show/hide FPS and debug info

# Colors - UI Design Palette
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (235, 87, 87)
GREEN = (39, 174, 96)
BLUE = (47, 128, 237)

# Extended palette
BG_COLOR = (236, 240, 241)  # Light gray background
PRIMARY = (52, 152, 219)  # Primary blue
PRIMARY_DARK = (41, 128, 185)
ACCENT = (241, 196, 15)  # Accent yellow
SUCCESS = (46, 204, 113)
WARNING = (243, 156, 18)
DANGER = (231, 76, 60)

TEXT_PRIMARY = (33, 37, 41)  # Dark text
TEXT_SECONDARY = (73, 80, 87)
TEXT_INVERSE = (255, 255, 255)

PANEL_BG = (250, 250, 252)
PANEL_BORDER = (222, 226, 230)
PANEL_SHADOW = (0, 0, 0, 40)  # For alpha shadow surfaces

BUTTON_BG = PRIMARY
BUTTON_BG_HOVER = PRIMARY_DARK
BUTTON_TEXT = TEXT_INVERSE
BUTTON_SECONDARY_BG = (108, 117, 125)
BUTTON_SECONDARY_TEXT = TEXT_INVERSE

HP_GREEN = (46, 204, 113)
HP_YELLOW = (241, 196, 15)
HP_RED = (231, 76, 60)

# Paths (relative to project root)
ASSETS_PATH = "assets"
DATA_PATH = "data"
SAVES_PATH = "saves"
CREATURES_FILE = os.path.join(DATA_PATH, "creatures.json")
MOVES_FILE = os.path.join(DATA_PATH, "moves.json")
ROUTES_FILE = os.path.join(DATA_PATH, "routes.json")
SAVE_FILE = os.path.join(SAVES_PATH, "player_save.json")

# Ensure directories exist
os.makedirs(SAVES_PATH, exist_ok=True)
