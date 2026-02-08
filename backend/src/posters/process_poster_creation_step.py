import json
import math
import os
import re
import sqlite3
import ssl
import sys
import time
from urllib import parse as urlparse
from datetime import datetime, timezone
from hashlib import md5
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from functools import wraps

import certifi

# Fix SSL certificate verification on macOS
ssl._create_default_https_context = lambda: ssl.create_default_context(
    cafile=certifi.where()
)

# Get project root (synoptikon folder)
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
)

# Use maptoposter folder paths
MAPTOPOSTER_DIR = os.path.join(PROJECT_ROOT, "maptoposter")
THEMES_DIR = os.path.join(MAPTOPOSTER_DIR, "themes")
FONTS_DIR = os.path.join(MAPTOPOSTER_DIR, "fonts")

# Posters folder at project root
POSTERS_DIR = os.path.join(PROJECT_ROOT, "posters")

# Cache directory - use maptoposter's cache
CACHE_DIR_PATH = os.environ.get("CACHE_DIR", os.path.join(MAPTOPOSTER_DIR, "cache"))
CACHE_DIR = Path(CACHE_DIR_PATH)

CACHE_DIR.mkdir(exist_ok=True)
POSTERS_DIR_PATH = Path(POSTERS_DIR)
POSTERS_DIR_PATH.mkdir(exist_ok=True)

config = {
    "name": "ProcessPosterCreation",
    "type": "event",
    "subscribes": ["create-poster"],
    "emits": [],
    "flows": ["poster-creation-flow"],
    "description": "Background job that creates map posters from form data",
}


class CacheError(Exception):
    pass


def cache_file(key: str) -> str:
    encoded = md5(key.encode()).hexdigest()
    return f"{encoded}.pkl"


def cache_get(name: str) -> Optional[Dict]:
    path = CACHE_DIR / cache_file(name)
    if path.exists():
        try:
            import pickle

            with path.open("rb") as f:
                return pickle.load(f)
        except Exception:
            return None
    return None


def cache_set(name: str, obj: Any) -> None:
    path = CACHE_DIR / cache_file(name)
    try:
        import pickle

        with path.open("wb") as f:
            pickle.dump(obj, f)
    except Exception as e:
        raise CacheError(f"Cache error for '{name}': {e}") from e


def get_default_fonts() -> Dict[str, str]:
    return {
        "bold": os.path.join(FONTS_DIR, "Roboto/Roboto-Bold.ttf"),
        "regular": os.path.join(FONTS_DIR, "Roboto/Roboto-Regular.ttf"),
        "light": os.path.join(FONTS_DIR, "Roboto/Roboto-Light.ttf"),
    }


def find_font_family(font_family_name: str) -> Optional[Dict[str, str]]:
    if not os.path.exists(FONTS_DIR):
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

    def score_font(filename: str, weight: str) -> int:
        base_score = 100

        if weight == "bold":
            patterns = [
                (r"\bbold\.ttf$", 200),
                (r"-bold\.ttf$", 190),
                (r"-semibold\.ttf$", 150),
            ]
        elif weight == "light":
            patterns = [
                (r"\blight\.ttf$", 200),
                (r"-light\.ttf$", 190),
                (r"-thin\.ttf$", 150),
            ]
        else:
            patterns = [
                (r"\bregular\.ttf$", 200),
                (r"-regular\.ttf$", 190),
                (r"-medium\.ttf$", 180),
            ]

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

    if any(fonts_found.values()):
        return fonts_found

    return None


def generate_output_filename(poster_id: str, output_format: str) -> str:
    if not os.path.exists(POSTERS_DIR):
        os.makedirs(POSTERS_DIR)

    ext = output_format.lower()
    filename = f"{poster_id}.{ext}"
    return os.path.join(POSTERS_DIR, filename)


def update_poster_db(poster_id: str, filename: str, thumbnail: str, file_size: int) -> None:
    """Update poster record in SQLite with final file info."""
    db_path = os.path.join(PROJECT_ROOT, "posters.db")
    try:
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE posters SET filename = ?, thumbnail = ?, file_size = ? WHERE id = ?",
            (os.path.basename(filename), thumbnail, file_size, poster_id),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Warning: failed to update poster DB: {e}")


def load_theme(theme_name: str = "feature_based") -> Dict[str, Any]:
    theme_file = os.path.join(THEMES_DIR, f"{theme_name}.json")

    if not os.path.exists(theme_file):
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
        if "fonts" not in theme:
            theme["fonts"] = get_default_fonts()
        return theme


def parse_google_maps_url(url: str) -> Tuple[float, float, Optional[int]]:
    parsed = urlparse.urlparse(url)

    lat = None
    lon = None
    elevation = None

    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        return (lat, lon, elevation)

    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        return (lat, lon, None)

    if "ll=" in parsed.query:
        params = urlparse.parse_qs(parsed.query)
        if "ll" in params:
            coords = params["ll"][0].split(",")
            if len(coords) == 2:
                lat = float(coords[0])
                lon = float(coords[1])
                return (lat, lon, None)

    if "q=" in parsed.query:
        params = urlparse.parse_qs(parsed.query)
        if "q" in params:
            q = params["q"][0]
            coords = q.split(",")
            if len(coords) == 2:
                try:
                    lat = float(coords[0])
                    lon = float(coords[1])
                    return (lat, lon, None)
                except ValueError:
                    pass

    match = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        elevation = int(match.group(3))
        return (lat, lon, elevation)

    match = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        return (lat, lon, None)

    match = re.search(r"3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
    if match:
        lat = float(match.group(1))
        lon = float(match.group(2))
        return (lat, lon, None)

    raise ValueError("Could not extract coordinates from Google Maps URL")


def get_coordinates(city: str, country: str) -> Tuple[float, float]:
    """
    Fetches coordinates for a given city and country using geopy.
    Includes retry logic and longer timeout for reliability.
    """
    print(f"Looking up coordinates for {city}, {country}...")

    # Check cache first
    coords = f"{city},{country}"
    cached = cache_get(coords)
    if cached:
        print(f"✓ Using cached coordinates for {city}, {country}")
        return cached

    # Configure SSL context globally
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
    os.environ["SSL_CERT_FILE"] = certifi.where()

    from geopy.geocoders import Nominatim

    # Create geolocator with longer timeout
    geolocator = Nominatim(
        user_agent="city_map_poster",
        timeout=10,
    )

    # Add a small delay to respect Nominatim's usage policy
    time.sleep(1)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            location = geolocator.geocode(f"{city}, {country}")

            if location:
                print(f"✓ Found: {location.address}")
                print(f"✓ Coordinates: {location.latitude}, {location.longitude}")
                result = (location.latitude, location.longitude)
                try:
                    cache_set(coords, result)
                except CacheError:
                    pass
                return result
            else:
                raise ValueError(f"Could not find coordinates for {city}, {country}")
        except Exception as e:
            print(f"Geocoding attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = 2 * (attempt + 1)
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise ValueError(
                    f"Failed to get coordinates after {max_retries} attempts: {e}"
                )


def rotate_geometry(geom, angle_deg: float, center_x: float, center_y: float):
    """Rotate a shapely geometry around a center point."""
    from shapely import affinity
    return affinity.rotate(geom, angle_deg, origin=(center_x, center_y))


def rotate_graph(G, angle_deg: float, center_x: float, center_y: float):
    """Rotate all node coordinates in a graph around a center point."""
    import numpy as np

    angle_rad = math.radians(angle_deg)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    for node, data in G.nodes(data=True):
        x = data.get('x', 0)
        y = data.get('y', 0)

        # Translate to origin, rotate, translate back
        dx = x - center_x
        dy = y - center_y

        new_x = dx * cos_a - dy * sin_a + center_x
        new_y = dx * sin_a + dy * cos_a + center_y

        data['x'] = new_x
        data['y'] = new_y

    return G


def rotate_gdf(gdf, angle_deg: float, center_x: float, center_y: float):
    """Rotate all geometries in a GeoDataFrame around a center point."""
    if gdf is None or gdf.empty:
        return gdf

    gdf = gdf.copy()
    gdf['geometry'] = gdf['geometry'].apply(
        lambda geom: rotate_geometry(geom, angle_deg, center_x, center_y)
    )
    return gdf


async def update_progress(
    context: Any,
    job_id: str,
    status: str,
    message: str,
    progress: int,
    output_file: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    """Update progress via stream for real-time updates"""
    timestamp = datetime.now(timezone.utc).isoformat()

    await context.streams.posterProgress.set(
        job_id,
        "status",
        {
            "status": status,
            "message": message,
            "progress": progress,
            "jobId": job_id,
            "outputFile": output_file,
            "error": error,
            "timestamp": timestamp,
        },
    )


def render_poster(
    G,
    parks,
    water,
    theme: Dict[str, Any],
    city_name: str,
    country: str,
    point: Tuple[float, float],
    rotation: float,
    border: Optional[float],
    width_in: float,
    height_in: float,
    is_thumbnail: bool = False,
    is_landscape: bool = False,
):
    """
    Core rendering function for map posters.
    Uses proper projection for undistorted top-down view.
    """
    import osmnx as ox
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors
    import numpy as np
    from matplotlib.font_manager import FontProperties
    import geopandas as gpd

    # Project the graph to UTM for accurate, undistorted rendering
    # This ensures the map looks like a true top-down view
    G_projected = ox.project_graph(G)

    # Get the CRS from the projected graph for consistent projection
    crs = G_projected.graph.get('crs', 'EPSG:3857')

    # Project parks and water to the same CRS
    parks_projected = None
    water_projected = None

    if parks is not None and not parks.empty:
        try:
            parks_projected = parks.to_crs(crs)
        except Exception:
            parks_projected = parks

    if water is not None and not water.empty:
        try:
            water_projected = water.to_crs(crs)
        except Exception:
            water_projected = water

    # Get the center of the projected graph for rotation
    nodes = ox.graph_to_gdfs(G_projected, edges=False)
    center_x = nodes['x'].mean()
    center_y = nodes['y'].mean()

    # Apply rotation to all data if specified
    if rotation and rotation != 0:
        G_projected = rotate_graph(G_projected, rotation, center_x, center_y)
        parks_projected = rotate_gdf(parks_projected, rotation, center_x, center_y)
        water_projected = rotate_gdf(water_projected, rotation, center_x, center_y)

    # Create figure with the specified dimensions
    fig, ax = plt.subplots(figsize=(width_in, height_in), facecolor=theme["bg"])
    ax.set_facecolor(theme["bg"])

    # Position map axes: landscape uses 85/15 split, portrait uses 75/25
    text_fraction = 0.15 if is_landscape else 0.25
    map_fraction = 1.0 - text_fraction
    ax.set_position([0, text_fraction, 1, map_fraction])
    ax.axis('off')

    # Plot water features first (lowest z-order)
    if water_projected is not None and not water_projected.empty:
        try:
            water_projected.plot(ax=ax, facecolor=theme["water"], edgecolor="none", zorder=1)
        except Exception:
            pass

    # Plot parks
    if parks_projected is not None and not parks_projected.empty:
        try:
            parks_projected.plot(ax=ax, facecolor=theme["parks"], edgecolor="none", zorder=2)
        except Exception:
            pass

    # Get edge colors and widths based on road type
    edge_colors = []
    edge_widths = []

    for u, v, data in G_projected.edges(data=True):
        highway = data.get("highway", "unclassified")
        if isinstance(highway, list):
            highway = highway[0] if highway else "unclassified"

        if highway in ["motorway", "motorway_link"]:
            color = theme["road_motorway"]
            width = 1.2
        elif highway in ["trunk", "trunk_link", "primary", "primary_link"]:
            color = theme["road_primary"]
            width = 1.0
        elif highway in ["secondary", "secondary_link"]:
            color = theme["road_secondary"]
            width = 0.8
        elif highway in ["tertiary", "tertiary_link"]:
            color = theme["road_tertiary"]
            width = 0.6
        elif highway in ["residential", "living_street", "unclassified"]:
            color = theme["road_residential"]
            width = 0.4
        else:
            color = theme["road_default"]
            width = 0.3

        edge_colors.append(color)
        edge_widths.append(width)

    edge_width_factor = theme.get("edge_width_factor", 1)

    # Scale line widths for thumbnail
    if is_thumbnail:
        edge_width_factor *= 0.5

    edge_widths = [w * edge_width_factor for w in edge_widths]

    # Compute bbox from projected data for ox.plot_graph
    # This ensures ox.plot_graph doesn't override our view with its own bounds
    nodes_gdf = ox.graph_to_gdfs(G_projected, edges=False)
    x_min, x_max = nodes_gdf['x'].min(), nodes_gdf['x'].max()
    y_min, y_max = nodes_gdf['y'].min(), nodes_gdf['y'].max()
    graph_bbox = (x_min, y_min, x_max, y_max)  # (left, bottom, right, top)

    # Plot the street network with explicit bbox to prevent ox.plot_graph
    # from resetting our view limits
    ox.plot_graph(
        G_projected,
        ax=ax,
        bgcolor=theme["bg"],
        node_size=0,
        edge_color=edge_colors,
        edge_linewidth=edge_widths,
        bbox=graph_bbox,
        show=False,
        close=False,
    )

    # ox.plot_graph sets aspect='equal' for projected CRS via _config_ax.
    # Capture the corrected limits before gradient fades can break them.
    saved_xlim = ax.get_xlim()
    saved_ylim = ax.get_ylim()

    # Create gradient fades at top and bottom of map area
    # Landscape uses smaller fades (10%) since the map area is shorter
    fade_pct = 0.10 if is_landscape else 0.15

    def create_gradient_fade(ax, color, location="bottom", zorder=10):
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
            extent_y_end = fade_pct
        else:
            my_colors[:, 3] = np.linspace(0, 1, 256)
            extent_y_start = 1.0 - fade_pct
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

    create_gradient_fade(ax, theme["gradient_color"], location="bottom", zorder=10)
    create_gradient_fade(ax, theme["gradient_color"], location="top", zorder=10)

    # Restore equal aspect ratio — imshow(aspect="auto") overrides it,
    # which skews the map from the intended 90° top-down orthographic view
    ax.set_aspect('equal')
    ax.set_xlim(saved_xlim)
    ax.set_ylim(saved_ylim)

    # Add text elements in the bottom area
    fonts = theme.get("fonts", get_default_fonts())

    # Scale font sizes for poster size and thumbnail
    base_scale = min(width_in, height_in) / 12
    if is_thumbnail:
        base_scale *= 0.7

    # Landscape uses slightly smaller fonts to fit the compact text area
    font_scale = 0.85 if is_landscape else 1.0
    font_main = FontProperties(fname=fonts["bold"], size=int(60 * base_scale * font_scale))
    font_sub = FontProperties(fname=fonts["light"], size=int(22 * base_scale * font_scale))
    font_coords = FontProperties(fname=fonts["regular"], size=int(14 * base_scale * font_scale))

    spaced_city = "  ".join(list(city_name.upper()))

    # Text positioning — landscape has 15% text area, portrait has 25%
    if is_landscape:
        city_y = 0.09
        country_y = 0.05
        coords_y = 0.02
        line_y = 0.07
    else:
        city_y = 0.15
        country_y = 0.09
        coords_y = 0.05
        line_y = 0.12

    fig.text(
        0.5,
        city_y,
        spaced_city,
        color=theme["text"],
        ha="center",
        va="center",
        fontproperties=font_main,
    )

    country_text = country.upper() if country else ""
    fig.text(
        0.5,
        country_y,
        country_text,
        color=theme["text"],
        ha="center",
        va="center",
        fontproperties=font_sub,
    )

    lat_str = f"{point[0]:.4f}° N" if point[0] >= 0 else f"{abs(point[0]):.4f}° S"
    lon_str = f"{point[1]:.4f}° E" if point[1] >= 0 else f"{abs(point[1]):.4f}° W"
    coords_text = f"{lat_str} / {lon_str}"

    fig.text(
        0.5,
        coords_y,
        coords_text,
        color=theme["text"],
        alpha=0.7,
        ha="center",
        va="center",
        fontproperties=font_coords,
    )

    # Decorative line
    line_ax = fig.add_axes([0.4, line_y, 0.2, 0.001])
    line_ax.axhline(y=0.5, color=theme["text"], linewidth=1)
    line_ax.axis('off')

    # Add border if specified
    if border and border > 0:
        from matplotlib.patches import Rectangle

        border_pct = border / 100
        fig_width, fig_height = fig.get_size_inches()
        min_dim = min(fig_width, fig_height)
        linewidth_points = border_pct * min_dim * 72
        offset_x = linewidth_points / 2 / 72 / fig_width
        offset_y = linewidth_points / 2 / 72 / fig_height

        border_ax = fig.add_axes([0, 0, 1, 1])
        border_ax.set_xlim(0, 1)
        border_ax.set_ylim(0, 1)
        border_ax.axis('off')

        border_rect = Rectangle(
            (offset_x, offset_y),
            1 - 2 * offset_x,
            1 - 2 * offset_y,
            fill=False,
            edgecolor=theme["text"],
            linewidth=linewidth_points,
            zorder=100,
        )
        border_ax.add_patch(border_rect)

    return fig


async def handler(input_data: Dict[str, Any], context: Any) -> None:
    job_id = input_data.get("jobId")
    poster_id = input_data.get("posterId")
    city = input_data.get("city")
    country = input_data.get("country")
    lat = input_data.get("lat")
    lon = input_data.get("lon")
    google_maps_url = input_data.get("googleMapsUrl")
    theme_name = input_data.get("theme", "feature_based")
    distance = input_data.get("distance", 29000)
    border = input_data.get("border")
    output_format = input_data.get("format", "png")
    landscape = input_data.get("landscape", False)
    title_font = input_data.get("titleFont")
    subtitle_font = input_data.get("subtitleFont")
    rotation = input_data.get("rotation", 0)
    width_cm = input_data.get("widthCm")
    height_cm = input_data.get("heightCm")

    context.logger.info(
        f"Starting poster creation job {job_id}", {"city": city, "country": country}
    )

    try:
        # Update progress - fetching data
        await update_progress(
            context, job_id, "fetching_data", "Getting coordinates...", 5
        )

        # Load theme
        theme = load_theme(theme_name)

        # Override font family if specified (use titleFont for main text)
        if title_font:
            custom_fonts = find_font_family(title_font)
            if custom_fonts:
                theme["fonts"] = custom_fonts

        # Get coordinates
        if google_maps_url:
            try:
                coords = parse_google_maps_url(google_maps_url)
                lat = coords[0]
                lon = coords[1]
                elevation = coords[2] if len(coords) > 2 else None

                if elevation and distance == 29000:
                    distance = elevation // 2
            except ValueError as e:
                await update_progress(context, job_id, "error", str(e), 0, error=str(e))
                return

        if lat is not None and lon is not None:
            point = (lat, lon)
            city_name = city if city else "custom_location"
        else:
            point = get_coordinates(city, country)
            city_name = city

        await update_progress(
            context, job_id, "downloading_streets", "Downloading street network...", 15
        )

        # Import required libraries
        import osmnx as ox
        import matplotlib.pyplot as plt

        # Fetch graph
        lat, lon = point
        graph_key = f"graph_{lat}_{lon}_{distance}"
        G = cache_get(graph_key)

        if G is None:
            G = ox.graph_from_point(
                point, dist=distance, dist_type="bbox", network_type="all"
            )
            time.sleep(0.5)
            try:
                cache_set(graph_key, G)
            except CacheError:
                pass

        if G is None:
            raise ValueError("Failed to fetch street network")

        await update_progress(
            context,
            job_id,
            "downloading_parks",
            "Downloading parks and green spaces...",
            35,
        )

        # Fetch parks
        parks_key = f"parks_{lat}_{lon}_{distance}"
        parks = cache_get(parks_key)

        if parks is None:
            try:
                parks = ox.features_from_point(
                    point, tags={"leisure": "park", "landuse": "grass"}, dist=distance
                )
                time.sleep(0.3)
                try:
                    cache_set(parks_key, parks)
                except CacheError:
                    pass
            except Exception:
                parks = None

        await update_progress(
            context, job_id, "downloading_water", "Downloading water features...", 55
        )

        # Fetch water
        water_key = f"water_{lat}_{lon}_{distance}"
        water = cache_get(water_key)

        if water is None:
            try:
                water = ox.features_from_point(
                    point, tags={"natural": "water", "waterway": "riverbank"}, dist=distance
                )
                time.sleep(0.3)
                try:
                    cache_set(water_key, water)
                except CacheError:
                    pass
            except Exception:
                water = None

        await update_progress(context, job_id, "rendering", "Rendering map...", 70)

        # Calculate dimensions
        if width_cm is not None and height_cm is not None:
            width_in = width_cm / 2.54
            height_in = height_cm / 2.54
        elif landscape:
            width_in = 16
            height_in = 12
        else:
            width_in = 12
            height_in = 16

        # Render the poster
        fig = render_poster(
            G=G,
            parks=parks,
            water=water,
            theme=theme,
            city_name=city_name,
            country=country,
            point=point,
            rotation=rotation,
            border=border,
            width_in=width_in,
            height_in=height_in,
            is_thumbnail=False,
            is_landscape=landscape,
        )

        await update_progress(context, job_id, "saving", "Saving poster...", 90)

        # Generate output filename using short UUID
        output_file = generate_output_filename(poster_id, output_format)

        # Save the main poster — use exact figure dimensions (no bbox_inches="tight"
        # which would reshape the carefully laid out 75/25 map/text split)
        fmt = output_format.lower()
        save_kwargs = dict(
            facecolor=theme["bg"],
        )

        if fmt == "png":
            save_kwargs["dpi"] = 300

        plt.savefig(output_file, format=fmt, **save_kwargs)
        plt.close(fig)

        # Generate a PNG thumbnail for gallery preview
        thumbnail_name = f"{poster_id}_thumb.png"
        thumbnail_file = os.path.join(POSTERS_DIR, thumbnail_name)

        thumb_scale = 0.25
        fig_thumb = render_poster(
            G=G,
            parks=parks,
            water=water,
            theme=theme,
            city_name=city_name,
            country=country,
            point=point,
            rotation=rotation,
            border=border,
            width_in=width_in * thumb_scale,
            height_in=height_in * thumb_scale,
            is_thumbnail=True,
            is_landscape=landscape,
        )

        plt.savefig(thumbnail_file, format="png", dpi=150, facecolor=theme["bg"])
        plt.close(fig_thumb)

        # Update poster record in SQLite with final file info
        file_size = os.path.getsize(output_file)
        update_poster_db(poster_id, output_file, thumbnail_name, file_size)

        await update_progress(
            context,
            job_id,
            "completed",
            "Poster created successfully!",
            100,
            output_file=output_file,
        )

        context.logger.info(
            f"Poster creation completed for job {job_id}", {"output_file": output_file}
        )

    except Exception as e:
        import traceback
        error_msg = str(e)
        context.logger.error(f"Error in poster creation job {job_id}: {error_msg}\n{traceback.format_exc()}")
        await update_progress(
            context, job_id, "error", f"Error: {error_msg}", 0, error=error_msg
        )
