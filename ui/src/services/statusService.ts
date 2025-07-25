import * as api from './api';
import { AgentResponse, EndpointResponse } from '../types/api';

export class StatusService {
  private pollingInterval: number | null = null;
  private onAgentUpdate: ((agent: AgentResponse) => void) | null = null;
  private onEndpointsUpdate: ((endpoints: EndpointResponse[]) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  startPolling(
    onAgentUpdate: (agent: AgentResponse) => void,
    onEndpointsUpdate: (endpoints: EndpointResponse[]) => void,
    onError: (error: Error) => void
  ) {
    this.onAgentUpdate = onAgentUpdate;
    this.onEndpointsUpdate = onEndpointsUpdate;
    this.onError = onError;
    
    this.pollStatus();
    
    this.pollingInterval = window.setInterval(() => {
      this.pollStatus();
    }, 5000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.onAgentUpdate = null;
    this.onEndpointsUpdate = null;
    this.onError = null;
  }

  private async pollStatus() {
    try {
      // Poll both agent and endpoints using new API
      const [agentResponse, endpointsResponse] = await Promise.all([
        api.getAgent(),
        api.listEndpoints()
      ]);
      

      
      this.onAgentUpdate?.(agentResponse);
      this.onEndpointsUpdate?.(endpointsResponse.endpoints);
    } catch (error) {
      console.error('Status polling failed:', error);
      this.onError?.(error as Error);
    }
  }

  async checkStatusNow() {
    await this.pollStatus();
  }
}

export const statusService = new StatusService();
