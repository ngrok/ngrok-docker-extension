// API type definitions for the new persistent backend

// Agent API types
export interface AgentConfig {
  authToken: string;
  connectURL?: string;
  expectedState: "online" | "offline";
}

export interface AgentStatus {
  state: "online" | "offline" | "connecting" | "unknown";
  connectedAt: string;
  latency?: number;
  lastError?: string;
  requestError?: string;
}

export interface AgentResponse {
  // Configuration fields
  authToken: string;
  connectURL?: string;
  expectedState: "online" | "offline";
  
  // Runtime status
  status: AgentStatus;
}

// Endpoint API types
export interface EndpointConfig {
  id: string; // containerID:targetPort
  containerId: string;
  targetPort: string;
  url?: string;
  binding: "public" | "internal" | "kubernetes";
  poolingEnabled: boolean;
  trafficPolicy?: string;
  description?: string;
  metadata?: string;
  expectedState: "online" | "offline";
}

export interface EndpointStatus {
  url?: string;
  state: "online" | "offline";
  lastError?: string;
}

export interface EndpointResponse {
  // Configuration fields (from EndpointConfig)
  id: string;
  containerId: string;
  targetPort: string;
  url?: string;
  binding: "public" | "internal" | "kubernetes";
  poolingEnabled: boolean;
  trafficPolicy?: string;
  description?: string;
  metadata?: string;
  expectedState: "online" | "offline";
  lastStarted?: string;
  
  // Runtime status
  status: EndpointStatus;
}

// Protocol detection types (unchanged)
export interface DetectProtocolRequest {
  container_id: string;
  port: string;
}

export interface DetectProtocolResponse {
  tcp: boolean;
  http: boolean;
  https: boolean;
  tls: boolean;
}
