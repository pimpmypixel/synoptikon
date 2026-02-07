import argparse
import json
import os
import pickle
import re

# Fix SSL certificate verification on macOS
import ssl
import sys
import time
import urllib.parse
from datetime import datetime
from hashlib import md5
from pathlib import Path
from typing import cast

import certifi
import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
import osmnx as ox
from geopandas import GeoDataFrame
from geopy.geocoders import Nominatim
from matplotlib.font_manager import FontProperties
from networkx import MultiDiGraph
from tqdm import tqdm

ssl._create_default_https_context = lambda: ssl.create_default_context(
    cafile=certifi.where()
)

THEMES_DIR = "themes"
FONTS_DIR = "fonts"
POSTERS_DIR = "posters"
CACHE_DIR_PATH = os.environ.get("CACHE_DIR", "cache")
CACHE_DIR = Path(CACHE_DIR_PATH)

CACHE_DIR.mkdir(exist_ok=True)


class CacheError(Exception):
    pass


def cache_file(key: str) -> str:
    encoded = md5(key.encode()).hexdigest()
    return f"{encoded}.pkl"


def cache_get(name: str) -> dict | None:
    path = CACHE_DIR / cache_file(name)
    if path.exists():
        with path.open("rb") as f:
            return pickle.load(f)
    return None


def cache_set(name: str, obj) -> None:
    path = CACHE_DIR / cache_file(name)
    try:
        with path.open("wb") as f:
            pickle.dump(obj, f)
    except pickle.PickleError as e:
        raise CacheError(
            f"Serialization error while saving cache for '{name}': {e}"
        ) from e
    except (OSError, IOError) as e:
        raise CacheError(f"File error while saving cache for '{name}': {e}") from e


def get_default_fonts():
    """
    Returns default Roboto font paths.
    """
    return {
        "bold": os.path.join(FONTS_DIR, "Roboto/Roboto-Bold.ttf"),
        "regular": os.path.join(FONTS_DIR, "Roboto/Roboto-Regular.ttf"),
        "light": os.path.join(FONTS_DIR, "Roboto/Roboto-Light.ttf"),
    }


def find_font_family(font_family_name: str) -> dict | None:
    """
    Recursively scans fonts folder for case insensitive font name folders
    and looks for .ttf files with case insensitive words 'regular', 'bold', and 'light'.

    Args:
        font_family_name: Name of the font family to search for (e.g., "merriweather", "montserrat")

    Returns:
        Dictionary with font paths for 'bold', 'regular', 'light' or None if not found
    """
    if not os.path.exists(FONTS_DIR):
        print(f"Warning: Fonts directory '{FONTS_DIR}' not found.")
        return None

    fonts_found = {"bold": None, "regular": None, "light": None}
    font_search_name = (
        font_family_name.lower().replace("_", "").replace("-", "").replace(" ", "")
    )

    matching_folders = []

    for folder in os.listdir(FONTS_DIR):
        folder_path = os.path.join(FONTS_DIR, folder)
        if os.path.isdir(folder_path):
            folder_normalized = (
                folder.lower().replace("_", "").replace("-", "").replace(" ", "")
            )

            score = 0
            if folder_normalized == font_search_name:
                score = 100
            elif font_search_name in folder_normalized:
                score = 50
            elif folder_normalized in font_search_name:
                score = 40

            if score > 0:
                matching_folders.append((score, folder_path))

    matching_folders.sort(reverse=True, key=lambda x: x[0])

    candidates = {"bold": [], "regular": [], "light": []}

    if matching_folders:
        best_folder = matching_folders[0][1]
        for root, dirs, files in os.walk(best_folder):
            for file in files:
                if file.lower().endswith(".ttf"):
                    file_lower = file.lower()
                    file_path = os.path.join(root, file)

                    if "bold" in file_lower:
                        candidates["bold"].append((file, file_path))

                    if "regular" in file_lower:
                        candidates["regular"].append((file, file_path))

                    if "light" in file_lower:
                        candidates["light"].append((file, file_path))

    def score_font(filename, weight):
        base_score = 100

        if weight == "bold":
            patterns = [
                (r"\bbold\.ttf$", 200),
                (r"-bold\.ttf$", 190),
                (r"-semibold\.ttf$", 150),
                (r"-extrabold\.ttf$", 140),
                (r"-black\.ttf$", 130),
            ]
        elif weight == "light":
            patterns = [
                (r"\blight\.ttf$", 200),
                (r"-light\.ttf$", 190),
                (r"-thin\.ttf$", 150),
                (r"-extralight\.ttf$", 140),
            ]
        else:
            patterns = [
                (r"\bregular\.ttf$", 200),
                (r"-regular\.ttf$", 190),
                (r"-medium\.ttf$", 180),
            ]

        import re

        score = base_score
        for pattern, points in patterns:
            if re.search(pattern, filename.lower()):
                score += points
                break

        if "italic" in filename.lower():
            score -= 50

        score -= len(filename)

        return score

    for weight, files_list in candidates.items():
        if files_list:
            scored = [(score_font(f, weight), path) for f, path in files_list]
            scored.sort(reverse=True, key=lambda x: x[0])
            fonts_found[weight] = scored[0][1]

    # Check if we found at least some fonts
    found_any = any(fonts_found.values())
    if found_any:
        missing = [k for k, v in fonts_found.items() if v is None]
        if missing:
            print(
                f"Warning: Font family '{font_family_name}' found but missing weights: {', '.join(missing)}"
            )
        else:
            print(f"✓ Found font family '{font_family_name}' with all weights")
        return fonts_found

    return None


def generate_output_filename(city, theme_name, output_format):
    """
    Generate unique output filename with city, theme, and datetime.
    """
    if not os.path.exists(POSTERS_DIR):
        os.makedirs(POSTERS_DIR)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    city_slug = city.lower().replace(" ", "_")
    ext = output_format.lower()
    filename = f"{city_slug}_{theme_name}_{timestamp}.{ext}"
    return os.path.join(POSTERS_DIR, filename)


def get_available_themes():
    """
    Scans the themes directory and returns a list of available theme names.
    """
    if not os.path.exists(THEMES_DIR):
        os.makedirs(THEMES_DIR)
        return []

    themes = []
    for file in sorted(os.listdir(THEMES_DIR)):
        if file.endswith(".json"):
            theme_name = file[:-5]  # Remove .json extension
            themes.append(theme_name)
    return themes


def load_theme(theme_name="feature_based"):
    """
    Load theme from JSON file in themes directory.
    """
    theme_file = os.path.join(THEMES_DIR, f"{theme_name}.json")

    if not os.path.exists(theme_file):
        print(
            f"⚠ Theme file '{theme_file}' not found. Using default feature_based theme."
        )
        # Fallback to embedded default theme
        return {
            "name": "Feature-Based Shading",
            "bg": "#FFFFFF",
            "text": "#000000",
            "gradient_color": "#FFFFFF",
            "water": "#C0C0C0",
            "parks": "#F0F0F0",
            "road_motorway": "#0A0A0A",
            "road_primary": "#1A1A1A",
            "road_secondary": "#2A2A2A",
            "road_tertiary": "#3A3A3A",
            "road_residential": "#4A4A4A",
            "road_default": "#3A3A3A",
            "fonts": get_default_fonts(),
        }

    with open(theme_file, "r") as f:
        theme = json.load(f)
        # Add default fonts if not specified
        if "fonts" not in theme:
            theme["fonts"] = get_default_fonts()
        print(f"✓ Loaded theme: {theme.get('name', theme_name)}")
        if "description" in theme:
            print(f"  {theme['description']}")
        return theme


# Load theme (can be changed via command line or input)
THEME = None  # Will be loaded later


def create_gradient_fade(ax, color, location="bottom", zorder=10):
    """
    Creates a fade effect at the top or bottom of the map.
    """
    vals = np.linspace(0, 1, 256).reshape(-1, 1)
    gradient = np.hstack((vals, vals))

    rgb = mcolors.to_rgb(color)
    my_colors = np.zeros((256, 4))
    my_colors[:, 0] = rgb[0]
    my_colors[:, 1] = rgb[1]
    my_colors[:, 2] = rgb[2]

    if location == "bottom":
        my_colors[:, 3] = np.linspace(1, 0, 256)
        extent_y_start = 0
        extent_y_end = 0.25
    else:
        my_colors[:, 3] = np.linspace(0, 1, 256)
        extent_y_start = 0.75
        extent_y_end = 1.0

    custom_cmap = mcolors.ListedColormap(my_colors)

    xlim = ax.get_xlim()
    ylim = ax.get_ylim()
    y_range = ylim[1] - ylim[0]

    y_bottom = ylim[0] + y_range * extent_y_start
    y_top = ylim[0] + y_range * extent_y_end

    ax.imshow(
        gradient,
        extent=[xlim[0], xlim[1], y_bottom, y_top],
        aspect="auto",
        cmap=custom_cmap,
        zorder=zorder,
        origin="lower",
    )


def get_edge_colors_by_type(G):
    """
    Assigns colors to edges based on road type hierarchy.
    Returns a list of colors corresponding to each edge in the graph.
    """
    edge_colors = []

    for u, v, data in G.edges(data=True):
        # Get the highway type (can be a list or string)
        highway = data.get("highway", "unclassified")

        # Handle list of highway types (take the first one)
        if isinstance(highway, list):
            highway = highway[0] if highway else "unclassified"

        # Assign color based on road type
        if highway in ["motorway", "motorway_link"]:
            color = THEME["road_motorway"]
        elif highway in ["trunk", "trunk_link", "primary", "primary_link"]:
            color = THEME["road_primary"]
        elif highway in ["secondary", "secondary_link"]:
            color = THEME["road_secondary"]
        elif highway in ["tertiary", "tertiary_link"]:
            color = THEME["road_tertiary"]
        elif highway in ["residential", "living_street", "unclassified"]:
            color = THEME["road_residential"]
        else:
            color = THEME["road_default"]

        edge_colors.append(color)

    return edge_colors


def get_edge_widths_by_type(G):
    """
    Assigns line widths to edges based on road type.
    Major roads get thicker lines.
    """
    edge_widths = []

    for u, v, data in G.edges(data=True):
        highway = data.get("highway", "unclassified")

        if isinstance(highway, list):
            highway = highway[0] if highway else "unclassified"

        # Assign width based on road importance
        if highway in ["motorway", "motorway_link"]:
            width = 1.2
        elif highway in ["trunk", "trunk_link", "primary", "primary_link"]:
            width = 1.0
        elif highway in ["secondary", "secondary_link"]:
            width = 0.8
        elif highway in ["tertiary", "tertiary_link"]:
            width = 0.6
        else:
            width = 0.4

        edge_widths.append(width)

    edge_width_factor = THEME.get("edge_width_factor", 1) if THEME else 1
    return [w * edge_width_factor for w in edge_widths]


def fetch_graph(point, dist) -> MultiDiGraph | None:
    lat, lon = point
    graph = f"graph_{lat}_{lon}_{dist}"
    cached = cache_get(graph)
    if cached is not None:
        print("✓ Using cached street network")
        return cast(MultiDiGraph, cached)

    try:
        G = ox.graph_from_point(point, dist=dist, dist_type="bbox", network_type="all")
        time.sleep(0.5)
        try:
            cache_set(graph, G)
        except CacheError as e:
            print(e)
        return G
    except Exception as e:
        print(f"OSMnx error while fetching graph: {e}")
        return None


def fetch_features(point, dist, tags, name) -> GeoDataFrame | None:
    lat, lon = point
    tag_str = "_".join(tags.keys())
    features = f"{name}_{lat}_{lon}_{dist}_{tag_str}"
    cached = cache_get(features)
    if cached is not None:
        print(f"✓ Using cached {name}")
        return cast(GeoDataFrame, cached)

    try:
        data = ox.features_from_point(point, tags=tags, dist=dist)
        time.sleep(0.3)
        try:
            cache_set(features, data)
        except CacheError as e:
            print(e)
        return data
    except Exception as e:
        print(f"OSMnx error while fetching features: {e}")
        return None


def get_coordinates(city, country):
    """
    Fetches coordinates for a given city and country using geopy.
    Includes rate limiting to be respectful to the geocoding service.
    """
    print("Looking up coordinates...")

    # Check cache first
    coords = f"{city},{country}"
    cached = cache_get(coords)
    if cached:
        print(f"✓ Using cached coordinates for {city}, {country}")
        return cached

    # Configure SSL context globally
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
    os.environ["SSL_CERT_FILE"] = certifi.where()

    geolocator = Nominatim(user_agent="city_map_poster")

    # Add a small delay to respect Nominatim's usage policy
    time.sleep(1)

    location = geolocator.geocode(f"{city}, {country}")

    if location:
        print(f"✓ Found: {location.address}")
        print(f"✓ Coordinates: {location.latitude}, {location.longitude}")
        result = (location.latitude, location.longitude)
        try:
            cache_set(coords, result)
        except CacheError as e:
            print(e)
        return result
    else:
        raise ValueError(f"Could not find coordinates for {city}, {country}")


def parse_google_maps_url_old(url):
    """
    Parses a Google Maps URL and extracts latitude, longitude, and elevation.
    Supports various Google Maps URL formats.
    Returns (latitude, longitude, elevation) tuple.
    """
    print("Parsing Google Maps URL...")

    # Parse URL components
    parsed = urllib.parse.urlparse(url)

    lat = None
    lon = None
    elevation = None

    # Try format: https://www.google.com/maps/@<lat>,<lon>,<elevation>m
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        print(f"✓ Extracted coordinates and elevation: {lat}, {lon}, {elevation}m")
        return (lat, lon, elevation)

    # Try format: https://www.google.com/maps/@<lat>,<lon>,<zoom>z
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)z", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        print(f"✓ Extracted coordinates: {lat}, {lon}")
        return (lat, lon, None)

    # Try format: https://maps.google.com/?ll=<lat>,<lon>
    if "ll=" in parsed.query:
        params = urllib.parse.parse_qs(parsed.query)
        if "ll" in params:
            coords = params["ll"][0].split(",")
            if len(coords) == 2:
                lat = float(coords[0])
                lon = float(coords[1])
                print(f"✓ Extracted coordinates from ll parameter: {lat}, {lon}")
                return (lat, lon, None)

    # Try format: https://maps.google.com/maps?q=<lat>,<lon>
    if "q=" in parsed.query:
        params = urllib.parse.parse_qs(parsed.query)
        if "q" in params:
            q = params["q"][0]
            coords = q.split(",")
            if len(coords) == 2:
                try:
                    lat = float(coords[0])
                    lon = float(coords[1])
                    print(f"✓ Extracted coordinates from q parameter: {lat}, {lon}")
                    return (lat, lon, None)
                except ValueError:
                    pass

    # Try format: https://www.google.com/maps/place/<name>/@<lat>,<lon>,<elevation>m
    match = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        print(f"✓ Extracted coordinates and elevation: {lat}, {lon}, {elevation}m")
        return (lat, lon, elevation)

    raise ValueError(
        "Could not extract coordinates from Google Maps URL. "
        "Please make sure the URL contains coordinates in a supported format."
    )


def parse_google_maps_url(url):
    """
    Parses a Google Maps URL and extracts latitude, longitude, and elevation.
    Supports various Google Maps URL formats.
    Returns (latitude, longitude, elevation) tuple.
    """
    print("Parsing Google Maps URL...")

    # Parse URL components
    parsed = urllib.parse.urlparse(url)

    lat = None
    lon = None
    elevation = None

    # Try format: https://www.google.com/maps/@ <lat>,<lon>,<elevation>m
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        print(f"✓ Extracted coordinates and elevation: {lat}, {lon}, {elevation}m")
        return (lat, lon, elevation)

    # Try format: https://www.google.com/maps/@ <lat>,<lon>,<zoom>z (supports decimal zoom)
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        print(f"✓ Extracted coordinates: {lat}, {lon}")
        return (lat, lon, None)

    # Try format: https://maps.google.com/?ll= <lat>,<lon>
    if "ll=" in parsed.query:
        params = urllib.parse.parse_qs(parsed.query)
        if "ll" in params:
            coords = params["ll"][0].split(",")
            if len(coords) == 2:
                lat = float(coords[0])
                lon = float(coords[1])
                print(f"✓ Extracted coordinates from ll parameter: {lat}, {lon}")
                return (lat, lon, None)

    # Try format: https://maps.google.com/maps?q= <lat>,<lon>
    if "q=" in parsed.query:
        params = urllib.parse.parse_qs(parsed.query)
        if "q" in params:
            q = params["q"][0]
            coords = q.split(",")
            if len(coords) == 2:
                try:
                    lat = float(coords[0])
                    lon = float(coords[1])
                    print(f"✓ Extracted coordinates from q parameter: {lat}, {lon}")
                    return (lat, lon, None)
                except ValueError:
                    pass

    # Try format: https://www.google.com/maps/place/ <name>/@<lat>,<lon>,<elevation>m
    match = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        print(f"✓ Extracted coordinates and elevation: {lat}, {lon}, {elevation}m")
        return (lat, lon, elevation)

    # Try format: https://www.google.com/maps/place/ <name>/@<lat>,<lon>,<zoom>z (supports decimal zoom)
    match = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        print(f"✓ Extracted coordinates: {lat}, {lon}")
        return (lat, lon, None)

    # Try format: data=!...3d<lat>!4d<lon> (precise coordinates in data segment)
    match = re.search(r"3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        print(f"✓ Extracted coordinates from data segment: {lat}, {lon}")
        return (lat, lon, None)

    raise ValueError(
        "Could not extract coordinates from Google Maps URL. "
        "Please make sure the URL contains coordinates in a supported format."
    )


def create_poster(
    city,
    country,
    point,
    dist,
    output_file,
    output_format,
    border=None,
    landscape=False,
    width_cm=None,
    height_cm=None,
):
    print(f"\nGenerating map for {city}, {country}...")

    # Progress bar for data fetching
    with tqdm(
        total=3,
        desc="Fetching map data",
        unit="step",
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}",
    ) as pbar:
        # 1. Fetch Street Network
        pbar.set_description("Downloading street network")
        G = fetch_graph(point, dist)
        if G is None:
            raise ValueError("Failed to fetch street network")
        pbar.update(1)

        # 3. Fetch Parks
        pbar.set_description("Downloading parks/green spaces")
        parks = fetch_features(
            point, tags={"leisure": "park", "landuse": "grass"}, dist=dist, name="parks"
        )
        pbar.update(1)

        # 2. Fetch Water Features
        pbar.set_description("Downloading water features")
        water = fetch_features(
            point,
            tags={"natural": "water", "waterway": "riverbank"},
            dist=dist,
            name="water",
        )
        pbar.update(1)

    print("✓ All data downloaded successfully!")

    # 2. Setup Plot
    print("Rendering map...")
    # Use custom dimensions if provided, otherwise use landscape/portrait defaults
    if width_cm is not None and height_cm is not None:
        # Convert centimeters to inches (1 inch = 2.54 cm)
        width_in = width_cm / 2.54
        height_in = height_cm / 2.54
        fig, ax = plt.subplots(figsize=(width_in, height_in), facecolor=THEME["bg"])
        print(
            f"✓ Using custom dimensions: {width_cm}×{height_cm} cm ({width_in:.1f}×{height_in:.1f} inches)"
        )
    elif landscape:
        fig, ax = plt.subplots(figsize=(16, 12), facecolor=THEME["bg"])
        print("✓ Using landscape orientation (16×12 inches)")
    else:
        fig, ax = plt.subplots(figsize=(12, 16), facecolor=THEME["bg"])
        print("✓ Using portrait orientation (12×16 inches)")
    ax.set_facecolor(THEME["bg"])
    ax.set_position([0, 0, 1, 1])

    # 3. Plot Layers
    # Layer 1: Polygons
    if water is not None and not water.empty:
        water.plot(ax=ax, facecolor=THEME["water"], edgecolor="none", zorder=1)
    if parks is not None and not parks.empty:
        parks.plot(ax=ax, facecolor=THEME["parks"], edgecolor="none", zorder=2)

    # Layer 2: Roads with hierarchy coloring
    print("Applying road hierarchy colors...")
    edge_colors = get_edge_colors_by_type(G)
    edge_widths = get_edge_widths_by_type(G)

    ox.plot_graph(
        G,
        ax=ax,
        bgcolor=THEME["bg"],
        node_size=0,
        edge_color=edge_colors,
        edge_linewidth=edge_widths,
        show=False,
        close=False,
    )

    # Layer 3: Gradients (Top and Bottom)
    create_gradient_fade(ax, THEME["gradient_color"], location="bottom", zorder=10)
    create_gradient_fade(ax, THEME["gradient_color"], location="top", zorder=10)

    # 4. Typography
    fonts = THEME.get("fonts", get_default_fonts())
    font_main = FontProperties(fname=fonts["bold"], size=60)
    font_top = FontProperties(fname=fonts["bold"], size=40)
    font_sub = FontProperties(fname=fonts["light"], size=22)
    font_coords = FontProperties(fname=fonts["regular"], size=14)

    spaced_city = "  ".join(list(city.upper()))

    # --- BOTTOM TEXT ---
    ax.text(
        0.5,
        0.14,
        spaced_city,
        transform=ax.transAxes,
        color=THEME["text"],
        ha="center",
        fontproperties=font_main,
        zorder=11,
    )

    ax.text(
        0.5,
        0.10,
        country.upper(),
        transform=ax.transAxes,
        color=THEME["text"],
        ha="center",
        fontproperties=font_sub,
        zorder=11,
    )

    lat, lon = point
    coords = (
        f"{lat:.4f}° N / {lon:.4f}° E"
        if lat >= 0
        else f"{abs(lat):.4f}° S / {lon:.4f}° E"
    )
    if lon < 0:
        coords = coords.replace("E", "W")

    ax.text(
        0.5,
        0.07,
        coords,
        transform=ax.transAxes,
        color=THEME["text"],
        alpha=0.7,
        ha="center",
        fontproperties=font_coords,
        zorder=11,
    )

    ax.plot(
        [0.4, 0.6],
        [0.125, 0.125],
        transform=ax.transAxes,
        color=THEME["text"],
        linewidth=1,
        zorder=11,
    )

    # --- ATTRIBUTION (bottom right) ---
    font_attr = FontProperties(fname=fonts["light"], size=8)

    #    ax.text(
    #        0.98,
    #        0.02,
    #        "© OpenStreetMap contributors",
    #        transform=ax.transAxes,
    #        color=THEME["text"],
    #        alpha=0.5,
    #        ha="right",
    #        va="bottom",
    #        fontproperties=font_attr,
    #        zorder=11,
    #    )

    # --- BORDER ---
    if border is not None:
        from matplotlib.patches import Rectangle

        border_pct = border / 100

        fig_width, fig_height = fig.get_size_inches()
        min_dim = min(fig_width, fig_height)
        linewidth_points = border_pct * min_dim * 72

        offset = linewidth_points / 2 / 72 / min_dim

        border_rect = Rectangle(
            (offset, offset),
            1 - 2 * offset,
            1 - 2 * offset,
            transform=ax.transAxes,
            fill=False,
            edgecolor=THEME["text"],
            linewidth=linewidth_points,
            zorder=15,
        )
        ax.add_patch(border_rect)
        print(f"✓ Border added: {border}% of poster size")

    # 5. Save
    print(f"Saving to {output_file}...")

    fmt = output_format.lower()
    save_kwargs = dict(
        facecolor=THEME["bg"],
        bbox_inches="tight",
        pad_inches=0.05,
    )

    if fmt == "png":
        # Calculate DPI for full resolution based on physical dimensions
        if width_cm is not None and height_cm is not None:
            # Use 300 DPI for high quality prints
            save_kwargs["dpi"] = 300
            print(f"✓ Using 300 DPI for full resolution at {width_cm}×{height_cm} cm")
        else:
            save_kwargs["dpi"] = 300

    plt.savefig(output_file, format=fmt, **save_kwargs)
    plt.close()

    print(f"✓ Done! Poster saved as {output_file}")


def print_examples():
    """Print usage examples."""
    print("""
    City Map Poster Generator
    =========================

    Usage:
    python create_map_poster.py --city <city> --country <country> [options]

    Examples:
    # Iconic grid patterns
    python create_map_poster.py -c "New York" -C "USA" -t noir -d 12000           # Manhattan grid
    python create_map_poster.py -c "Barcelona" -C "Spain" -t warm_beige -d 8000   # Eixample district grid

    # Waterfront & canals
    python create_map_poster.py -c "Venice" -C "Italy" -t blueprint -d 4000       # Canal network
    python create_map_poster.py -c "Amsterdam" -C "Netherlands" -t ocean -d 6000  # Concentric canals
    python create_map_poster.py -c "Dubai" -C "UAE" -t midnight_blue -d 15000     # Palm & coastline

    # Radial patterns
    python create_map_poster.py -c "Paris" -C "France" -t pastel_dream -d 10000   # Haussmann boulevards
    python create_map_poster.py -c "Moscow" -C "Russia" -t noir -d 12000          # Ring roads

    # Organic old cities
    python create_map_poster.py -c "Tokyo" -C "Japan" -t japanese_ink -d 15000    # Dense organic streets
    python create_map_poster.py -c "Marrakech" -C "Morocco" -t terracotta -d 5000 # Medina maze
    python create_map_poster.py -c "Rome" -C "Italy" -t warm_beige -d 8000        # Ancient street layout

    # Coastal cities
    python create_map_poster.py -c "San Francisco" -C "USA" -t sunset -d 10000    # Peninsula grid
    python create_map_poster.py -c "Sydney" -C "Australia" -t ocean -d 12000      # Harbor city
    python create_map_poster.py -c "Mumbai" -C "India" -t contrast_zones -d 18000 # Coastal peninsula

    # River cities
    python create_map_poster.py -c "London" -C "UK" -t noir -d 15000              # Thames curves
    python create_map_poster.py -c "Budapest" -C "Hungary" -t copper_patina -d 8000  # Danube split

    # Using Google Maps URL
    python create_map_poster.py -c "San Francisco" -C "USA" -g                    # Will prompt for URL

    # With border
    python create_map_poster.py -c "Paris" -C "France" -t noir -b 5               # 5% border

    # With custom font
    python create_map_poster.py -c "London" -C "UK" --font-family roboto_slab     # Use Roboto Slab font

    # List themes
    python create_map_poster.py --list-themes

    Options:
        --city, -c        City name (required even with --google-maps)
        --country, -C     Country name (required even with --google-maps)
        --theme, -t       Theme name (default: feature_based)
        --distance, -d    Map radius in meters (default: 29000)
        --border, -b      Border width as percentage (N%% border in text color)
        --font-family     Font family name to use (searches fonts folder)
        --lat, --lon      Latitude and longitude (overrides city/country)
        --google-maps, -g Prompt for Google Maps URL to extract coordinates
        --list-themes     List all available themes

    Distance guide:
    4000-6000m   Small/dense cities (Venice, Amsterdam old center)
    8000-12000m  Medium cities, focused downtown (Paris, Barcelona)
    15000-20000m Large metros, full city view (Tokyo, Mumbai)

    Google Maps URL examples:
    https://www.google.com/maps/@37.7749,-122.4194,15z
    https://www.google.com/maps/place/San+Francisco/@37.7749,-122.4194,12z
    https://www.google.com/maps/@55.7873373,12.4654465,8502m/data=!3m1!1e3

    Available themes can be found in the 'themes/' directory.
    Generated posters are saved to 'posters/' directory.
""")


def list_themes():
    """List all available themes with descriptions."""
    available_themes = get_available_themes()
    if not available_themes:
        print("No themes found in 'themes/' directory.")
        return

    print("\nAvailable Themes:")
    print("-" * 60)
    for theme_name in available_themes:
        theme_path = os.path.join(THEMES_DIR, f"{theme_name}.json")
        try:
            with open(theme_path, "r") as f:
                theme_data = json.load(f)
                display_name = theme_data.get("name", theme_name)
                description = theme_data.get("description", "")
        except:
            display_name = theme_name
            description = ""
        print(f"  {theme_name}")
        print(f"    {display_name}")
        if description:
            print(f"    {description}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate beautiful map posters for any city",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
    Examples:
    python create_map_poster.py --city "New York" --country "USA"
    python create_map_poster.py --city Tokyo --country Japan --theme midnight_blue
    python create_map_poster.py --city Paris --country France --theme noir --distance 15000
    python create_map_poster.py --lat 40.7128 --lon -74.0060 --theme sunset --distance 10000
    python create_map_poster.py --city "San Francisco" --country "USA" --google-maps
    python create_map_poster.py --list-themes
        """,
    )

    parser.add_argument("--city", "-c", type=str, help="City name")
    parser.add_argument("--country", "-C", type=str, help="Country name")
    parser.add_argument(
        "--theme",
        "-t",
        type=str,
        default="feature_based",
        help="Theme name (default: feature_based)",
    )
    parser.add_argument(
        "--distance",
        "-d",
        type=int,
        default=29000,
        help="Map radius in meters (default: 29000)",
    )
    parser.add_argument(
        "--lat", type=float, help="Latitude (overrides city/country geocoding)"
    )
    parser.add_argument(
        "--lon", type=float, help="Longitude (overrides city/country geocoding)"
    )
    parser.add_argument(
        "--google-maps",
        "-g",
        action="store_true",
        help="Prompt for Google Maps URL to extract coordinates",
    )
    parser.add_argument(
        "--list-themes", action="store_true", help="List all available themes"
    )
    parser.add_argument(
        "--border",
        "-b",
        type=int,
        help="Border width as percentage (N%% border in text color)",
    )
    parser.add_argument(
        "--format",
        "-f",
        default="png",
        choices=["png", "svg", "pdf"],
        help="Output format for poster (default: png)",
    )
    parser.add_argument(
        "--landscape",
        "-L",
        action="store_true",
        help="Create poster in landscape orientation (horizontal)",
    )
    parser.add_argument(
        "--font-family",
        type=str,
        help="Font family name to use (scans fonts folder for matching fonts)",
    )
    parser.add_argument(
        "--width-cm",
        type=float,
        help="Poster width in centimeters (overrides default landscape/portrait dimensions)",
    )
    parser.add_argument(
        "--height-cm",
        type=float,
        help="Poster height in centimeters (overrides default landscape/portrait dimensions)",
    )

    args = parser.parse_args()

    # If no arguments provided, show examples
    if len(sys.argv) == 1:
        print_examples()
        sys.exit(0)

    # List themes if requested
    if args.list_themes:
        list_themes()
        sys.exit(0)

    # Validate required arguments
    if not args.city or not args.country:
        if args.lat is None or args.lon is None and not args.google_maps:
            print(
                "Error: --city and --country are required (unless using --lat/--lon or --google-maps).\n"
            )
            print_examples()
            sys.exit(1)

    # Validate theme exists
    available_themes = get_available_themes()
    if args.theme not in available_themes:
        print(f"Error: Theme '{args.theme}' not found.")
        print(f"Available themes: {', '.join(available_themes)}")
        sys.exit(1)

    # If lat/lon provided, both must be present
    if (args.lat is None) != (args.lon is None):
        print("Error: Both --lat and --lon must be provided together.\n")
        sys.exit(1)

    # If --google-maps is used, city and country are still required
    if args.google_maps and (not args.city or not args.country):
        print(
            "Error: --city and --country are required even when using --google-maps.\n"
        )
        print_examples()
        sys.exit(1)

    print("=" * 50)
    print("City Map Poster Generator")
    print("=" * 50)

    # Load theme
    THEME = load_theme(args.theme)

    # Override font family if specified
    if args.font_family:
        print(f"\nSearching for font family: {args.font_family}")
        custom_fonts = find_font_family(args.font_family)
        if custom_fonts:
            THEME["fonts"] = custom_fonts
        else:
            print(
                f"Warning: Could not find font family '{args.font_family}'. Using default fonts."
            )

    # Get coordinates and generate poster
    try:
        # Handle Google Maps URL
        if args.google_maps:
            print("\nPlease paste your Google Maps URL below:")
            print("Example: https://www.google.com/maps/@37.7749,-122.4194,15z")
            print(
                "         https://www.google.com/maps/place/San+Francisco/@37.7749,-122.4194,12z"
            )
            print(
                "         https://www.google.com/maps/@55.7873373,12.4654465,8502m/data=!3m1!1e3"
            )
            print("         (Elevation will be used as distance/2 if -d not set)\n")

            while True:
                maps_url = input("Google Maps URL: ").strip()
                if not maps_url:
                    print("Error: URL cannot be empty. Please try again.")
                    continue

                try:
                    coords = parse_google_maps_url(maps_url)
                    args.lat = coords[0]
                    args.lon = coords[1]
                    elevation = coords[2] if len(coords) > 2 else None

                    print(f"\n✓ Coordinates extracted: {args.lat}, {args.lon}")

                    if elevation:
                        dist_from_elevation = elevation // 2
                        if 29000 == args.distance:
                            args.distance = dist_from_elevation
                            print(
                                f"✓ Using distance from elevation: {dist_from_elevation}m (elevation {elevation}m ÷ 2)"
                            )

                    break
                except ValueError as e:
                    print(f"Error: {e}")
                    print("Please try again.\n")

        # Get coordinates
        if args.lat is not None and args.lon is not None:
            coords = (args.lat, args.lon)
            print(f"✓ Using coordinates: {coords[0]}, {coords[1]}")
            city_name = args.city if args.city else "custom_location"
        else:
            coords = get_coordinates(args.city, args.country)
            city_name = args.city

        output_file = generate_output_filename(city_name, args.theme, args.format)
        create_poster(
            city_name,
            args.country if args.country else "",
            coords,
            args.distance,
            output_file,
            args.format,
            args.border,
            args.landscape,
            args.width_cm,
            args.height_cm,
        )

        print("\n" + "=" * 50)
        print("✓ Poster generation complete!")
        print("=" * 50)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
