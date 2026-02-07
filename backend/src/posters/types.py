from typing import TypedDict


class PosterProgress(TypedDict):
    status: str  # 'queued', 'fetching_data', 'downloading_streets', 'downloading_parks', 'downloading_water', 'rendering', 'saving', 'completed', 'error'
    message: str
    progress: float  # 0-100
    jobId: str
    outputFile: str | None
    error: str | None
    timestamp: str
