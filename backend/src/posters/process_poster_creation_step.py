import json
import os
import re
import ssl
import sys
import time
import urllib.parse
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


def retry_on_timeout(max_retries=3, delay=2):
    """Decorator to retry a function on timeout/connection errors"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    error_str = str(e).lower()
                    if (
                        "timeout" in error_str
                        or "connection" in error_str
                        or "max retries" in error_str
                    ):
                        if attempt < max_retries - 1:
                            wait_time = delay * (attempt + 1)
                            print(
                                f"Attempt {attempt + 1} failed, retrying in {wait_time}s..."
                            )
                            time.sleep(wait_time)
                            continue
                    raise
            raise last_exception

        return wrapper

    return decorator


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


def generate_output_filename(city: str, theme_name: str, output_format: str) -> str:
    if not os.path.exists(POSTERS_DIR):
        os.makedirs(POSTERS_DIR)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    city_slug = city.lower().replace(" ", "_")
    ext = output_format.lower()
    filename = f"{city_slug}_{theme_name}_{timestamp}.{ext}"
    return os.path.join(POSTERS_DIR, filename)


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
    parsed = urllib.parse.urlparse(url)

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
        params = urllib.parse.parse_qs(parsed.query)
        if "ll" in params:
            coords = params["ll"][0].split(",")
            if len(coords) == 2:
                lat = float(coords[0])
                lon = float(coords[1])
                return (lat, lon, None)

    if "q=" in parsed.query:
        params = urllib.parse.parse_qs(parsed.query)
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
    from geopy.adapters import URLLibAdapter

    # Create geolocator with longer timeout
    geolocator = Nominatim(
        user_agent="city_map_poster",
        timeout=10,  # Increased from default 1 second to 10 seconds
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


async def handler(input_data: Dict[str, Any], context: Any) -> None:
    job_id = input_data.get("jobId")
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
    font_family = input_data.get("fontFamily")
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

        # Override font family if specified
        if font_family:
            custom_fonts = find_font_family(font_family)
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
        import matplotlib.colors as mcolors
        import numpy as np
        from matplotlib.font_manager import FontProperties

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
            parks = ox.features_from_point(
                point, tags={"leisure": "park", "landuse": "grass"}, dist=distance
            )
            time.sleep(0.3)
            try:
                cache_set(parks_key, parks)
            except CacheError:
                pass

        await update_progress(
            context, job_id, "downloading_water", "Downloading water features...", 55
        )

        # Fetch water
        water_key = f"water_{lat}_{lon}_{distance}"
        water = cache_get(water_key)

        if water is None:
            water = ox.features_from_point(
                point, tags={"natural": "water", "waterway": "riverbank"}, dist=distance
            )
            time.sleep(0.3)
            try:
                cache_set(water_key, water)
            except CacheError:
                pass

        await update_progress(context, job_id, "rendering", "Rendering map...", 70)

        # Setup plot
        if width_cm is not None and height_cm is not None:
            width_in = width_cm / 2.54
            height_in = height_cm / 2.54
            fig, ax = plt.subplots(figsize=(width_in, height_in), facecolor=theme["bg"])
        elif landscape:
            fig, ax = plt.subplots(figsize=(16, 12), facecolor=theme["bg"])
        else:
            fig, ax = plt.subplots(figsize=(12, 16), facecolor=theme["bg"])

        ax.set_facecolor(theme["bg"])
        ax.set_position([0, 0, 1, 1])

        # Plot water and parks
        if water is not None and not water.empty:
            water.plot(ax=ax, facecolor=theme["water"], edgecolor="none", zorder=1)
        if parks is not None and not parks.empty:
            parks.plot(ax=ax, facecolor=theme["parks"], edgecolor="none", zorder=2)

        # Get edge colors and widths
        edge_colors = []
        edge_widths = []

        for u, v, data in G.edges(data=True):
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
                width = 0.4

            edge_colors.append(color)
            edge_widths.append(width)

        edge_width_factor = theme.get("edge_width_factor", 1)
        edge_widths = [w * edge_width_factor for w in edge_widths]

        # Plot graph
        ox.plot_graph(
            G,
            ax=ax,
            bgcolor=theme["bg"],
            node_size=0,
            edge_color=edge_colors,
            edge_linewidth=edge_widths,
            show=False,
            close=False,
        )

        # Create gradients
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

        create_gradient_fade(ax, theme["gradient_color"], location="bottom", zorder=10)
        create_gradient_fade(ax, theme["gradient_color"], location="top", zorder=10)

        # Typography
        fonts = theme.get("fonts", get_default_fonts())
        font_main = FontProperties(fname=fonts["bold"], size=60)
        font_sub = FontProperties(fname=fonts["light"], size=22)
        font_coords = FontProperties(fname=fonts["regular"], size=14)

        spaced_city = "  ".join(list(city_name.upper()))

        # Bottom text
        ax.text(
            0.5,
            0.14,
            spaced_city,
            transform=ax.transAxes,
            color=theme["text"],
            ha="center",
            fontproperties=font_main,
            zorder=11,
        )

        country_text = country.upper() if country else ""
        ax.text(
            0.5,
            0.10,
            country_text,
            transform=ax.transAxes,
            color=theme["text"],
            ha="center",
            fontproperties=font_sub,
            zorder=11,
        )

        lat_str = f"{point[0]:.4f}° N" if point[0] >= 0 else f"{abs(point[0]):.4f}° S"
        lon_str = f"{point[1]:.4f}° E" if point[1] >= 0 else f"{abs(point[1]):.4f}° W"
        coords_text = f"{lat_str} / {lon_str}"

        ax.text(
            0.5,
            0.07,
            coords_text,
            transform=ax.transAxes,
            color=theme["text"],
            alpha=0.7,
            ha="center",
            fontproperties=font_coords,
            zorder=11,
        )

        ax.plot(
            [0.4, 0.6],
            [0.125, 0.125],
            transform=ax.transAxes,
            color=theme["text"],
            linewidth=1,
            zorder=11,
        )

        # Border
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
                edgecolor=theme["text"],
                linewidth=linewidth_points,
                zorder=15,
            )
            ax.add_patch(border_rect)

        await update_progress(context, job_id, "saving", "Saving poster...", 90)

        # Generate output filename
        output_file = generate_output_filename(city_name, theme_name, output_format)

        # Save
        fmt = output_format.lower()
        save_kwargs = dict(
            facecolor=theme["bg"],
            bbox_inches="tight",
            pad_inches=0.05,
        )

        if fmt == "png":
            save_kwargs["dpi"] = 300

        plt.savefig(output_file, format=fmt, **save_kwargs)
        plt.close()

        # Save metadata as sidecar JSON file
        metadata = {
            "city": city,
            "country": country,
            "theme": theme_name,
            "distance": distance,
            "format": output_format,
            "landscape": landscape,
            "titleFont": input_data.get("titleFont"),
            "subtitleFont": input_data.get("subtitleFont"),
            "lat": lat,
            "lon": lon,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        metadata_file = output_file.rsplit(".", 1)[0] + ".json"
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

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
        error_msg = str(e)
        context.logger.error(f"Error in poster creation job {job_id}: {error_msg}")
        await update_progress(
            context, job_id, "error", f"Error: {error_msg}", 0, error=error_msg
        )
