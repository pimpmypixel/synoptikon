# Map Poster Generator API

A FastAPI implementation of the map poster generator that provides RESTful endpoints for creating beautiful map posters.

## Features

- **Asynchronous Processing**: Long-running poster generation tasks run in the background
- **All CLI Parameters**: Supports all original command-line arguments
- **Task Management**: Track generation progress and download results
- **Google Maps Integration**: Parse Google Maps URLs for coordinates
- **Multiple Output Formats**: PNG, SVG, PDF support
- **Custom Dimensions**: Specify poster size in centimeters
- **Theme Support**: Choose from available themes

## Installation

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python api.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints

### GET `/`
Root endpoint - API information

### GET `/themes`
List all available themes

**Response:**
```json
{
  "themes": [
    {
      "name": "feature_based",
      "display_name": "Feature-Based Shading",
      "description": "Default theme with road hierarchy shading"
    }
  ]
}
```

### POST `/generate`
Generate a map poster using city/country coordinates

**Request Body:**
```json
{
  "city": "Paris",
  "country": "France",
  "theme": "noir",
  "distance": 10000,
  "width_cm": 30.0,
  "height_cm": 42.0,
  "format": "png",
  "landscape": false,
  "border": 5
}
```

**Response:**
```json
{
  "task_id": "uuid-string",
  "status": "pending",
  "message": "Poster generation started"
}
```

### POST `/generate/google-maps`
Generate a map poster using Google Maps URL

**Request Body:**
```json
{
  "city": "San Francisco",
  "country": "USA",
  "google_maps_url": "https://www.google.com/maps/@37.7749,-122.4194,15z",
  "theme": "sunset",
  "width_cm": 50.0,
  "height_cm": 70.0
}
```

### GET `/status/{task_id}`
Check the status of a generation task

**Response:**
```json
{
  "status": "completed",
  "message": "Poster generation completed successfully",
  "download_url": "/download/uuid-string/filename.png",
  "created_at": "2024-01-01T12:00:00"
}
```

### GET `/download/{task_id}/{filename}`
Download the generated poster file

### GET `/tasks`
List all active tasks

### DELETE `/task/{task_id}`
Delete a task and its generated files

## Request Parameters

All endpoints accept the following parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| city | string | required | City name |
| country | string | required | Country name |
| theme | string | "feature_based" | Theme name |
| distance | integer | 29000 | Map radius in meters |
| width_cm | float | optional | Poster width in centimeters |
| height_cm | float | optional | Poster height in centimeters |
| border | integer | optional | Border width as percentage |
| format | string | "png" | Output format (png, svg, pdf) |
| landscape | boolean | false | Use landscape orientation |
| font_family | string | optional | Custom font family |
| lat | float | optional | Latitude (overrides city/country) |
| lon | float | optional | Longitude (overrides city/country) |

## Usage Examples

### Using curl

```bash
# Generate a poster
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Tokyo",
    "country": "Japan",
    "theme": "midnight_blue",
    "width_cm": 42.0,
    "height_cm": 59.4
  }'

# Check status
curl "http://localhost:8000/status/{task_id}"

# Download poster
curl -O "http://localhost:8000/download/{task_id}/{filename}"
```

### Using Python

```python
import requests

# Generate poster
response = requests.post("http://localhost:8000/generate", json={
    "city": "Amsterdam",
    "country": "Netherlands",
    "theme": "ocean",
    "width_cm": 30.0,
    "height_cm": 30.0
})

task_id = response.json()["task_id"]

# Poll for completion
import time
while True:
    status = requests.get(f"http://localhost:8000/status/{task_id}").json()
    if status["status"] == "completed":
        break
    time.sleep(5)

# Download poster
download_url = f"http://localhost:8000{status['download_url']"
response = requests.get(download_url)

with open("poster.png", "wb") as f:
    f.write(response.content)
```

## Notes

- Generated files are temporarily stored in the `temp_posters/` directory
- Tasks are kept in memory (in production, consider using Redis or a database)
- Maximum concurrent tasks depend on server resources
- Poster generation can take 30-120 seconds depending on map complexity

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 404: Not Found (task or file not found)
- 500: Internal Server Error

Error responses include detailed messages:
```json
{
  "detail": "Theme 'invalid_theme' not found"
}
```