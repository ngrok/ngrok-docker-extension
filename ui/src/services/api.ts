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

// Agent API
export const getAgent = async (): Promise<AgentResponse> => {
  const result = await ddClient.extension.vm!.service!.get('/agent');
  return result as AgentResponse;
};

export const putAgent = async (config: AgentConfig): Promise<AgentResponse> => {
  const result = await ddClient.extension.vm!.service!.put('/agent', config);
  return result as AgentResponse;
};

// Endpoints API
export const listEndpoints = async (): Promise<{ endpoints: EndpointResponse[] }> => {
  const result = await ddClient.extension.vm!.service!.get('/endpoints');
  return result as { endpoints: EndpointResponse[] };
};

export const createEndpoint = async (config: EndpointConfig): Promise<EndpointResponse> => {
  const result = await ddClient.extension.vm!.service!.post('/endpoints', config);
  return result as EndpointResponse;
};

export const updateEndpoint = async (id: string, config: EndpointConfig): Promise<EndpointResponse> => {
  const result = await ddClient.extension.vm!.service!.put(`/endpoints/${id}`, config);
  return result as EndpointResponse;
};

export const deleteEndpoint = async (id: string): Promise<void> => {
  await ddClient.extension.vm!.service!.delete(`/endpoints/${id}`);
};

// Utility API (unchanged)
export const detectProtocol = async (request: DetectProtocolRequest): Promise<DetectProtocolResponse> => {
  const result = await ddClient.extension.vm!.service!.post('/detect_protocol', request);
  return result as DetectProtocolResponse;
};
