const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface HelloResponse {
  message: string;
  status: string;
  appName: string;
}

export async function fetchHello(): Promise<HelloResponse> {
  const response = await fetch(`${API_BASE_URL}/hello`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}
