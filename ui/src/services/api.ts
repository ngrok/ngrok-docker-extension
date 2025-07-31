import { createDockerDesktopClient } from "@docker/extension-api-client";
import {
  AgentConfig,
  AgentResponse,
  EndpointConfig,
  EndpointResponse,
  DetectProtocolRequest,
  DetectProtocolResponse,
} from "../types/api";

const ddClient = createDockerDesktopClient();

// Helper function to handle both old and new Docker Desktop API response formats
function extractData<T>(result: unknown): T {
  // Check if result has a .data property (new API format)
  if (result && typeof result === 'object' && 'data' in result) {
    return (result as { data: T }).data;
  }
  // Otherwise return the result directly (old API format)
  return result as T;
}

// Agent API
export const getAgent = async (): Promise<AgentResponse> => {
  const result = await ddClient.extension.vm!.service!.get('/agent');
  return extractData<AgentResponse>(result);
};

export const putAgent = async (config: AgentConfig): Promise<AgentResponse> => {
  const result = await ddClient.extension.vm!.service!.put('/agent', config);
  return extractData<AgentResponse>(result);
};

// Endpoints API
export const listEndpoints = async (): Promise<{ endpoints: EndpointResponse[] }> => {
  const result = await ddClient.extension.vm!.service!.get('/endpoints');
  return extractData<{ endpoints: EndpointResponse[] }>(result);
};

export const createEndpoint = async (config: EndpointConfig): Promise<EndpointResponse> => {
  const result = await ddClient.extension.vm!.service!.post('/endpoints', config);
  return extractData<EndpointResponse>(result);
};

export const updateEndpoint = async (id: string, config: EndpointConfig): Promise<EndpointResponse> => {
  const result = await ddClient.extension.vm!.service!.put(`/endpoints/${id}`, config);
  return extractData<EndpointResponse>(result);
};

export const deleteEndpoint = async (id: string): Promise<void> => {
  await ddClient.extension.vm!.service!.delete(`/endpoints/${id}`);
};

// Utility API (unchanged)
export const detectProtocol = async (request: DetectProtocolRequest): Promise<DetectProtocolResponse> => {
  const result = await ddClient.extension.vm!.service!.post('/detect_protocol', request);
  return extractData<DetectProtocolResponse>(result);
};
