const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface PosterJob {
  jobId: string;
  city: string;
  country: string;
  theme: string;
  format: string;
  status: string;
  progress: number;
  message: string;
  outputFile: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Poster {
  id: string;
  filename: string;
  city: string;
  country: string;
  theme: string;
  format: string;
  distance: number;
  landscape: boolean;
  titleFont?: string;
  subtitleFont?: string;
  paperSize?: string;
  rotation?: number;
  border?: number;
  lat?: number;
  lon?: number;
  widthCm?: number;
  heightCm?: number;
  createdAt: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
}

export async function fetchPosters(): Promise<Poster[]> {
  const response = await fetch(`${API_BASE_URL}/posters/list`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.posters;
}

export async function fetchJobs(): Promise<PosterJob[]> {
  const response = await fetch(`${API_BASE_URL}/posters/jobs`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.jobs;
}

export async function deletePoster(filename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/posters/delete/${filename}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}
