export interface Provider {
  id: `${string}-${string}-${string}-${string}-${string}`
  name: string
  apiKey: string
  baseURL: string
}

export interface ModelInfo {
  provider: string
  model: string
}
