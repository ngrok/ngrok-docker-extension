import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

export interface AgentStatus {
  status: 'online' | 'offline' | 'reconnecting' | 'unknown';
  timestamp: string;
  connectionLatency?: number; // milliseconds
  lastError?: string;
}

export class StatusService {
  private pollingInterval: number | null = null;
  private onStatusUpdate: ((status: AgentStatus) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  startPolling(
    onStatusUpdate: (status: AgentStatus) => void,
    onError: (error: Error) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
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
    this.onStatusUpdate = null;
    this.onError = null;
  }

  private async pollStatus() {
    try {
      const result = await ddClient.extension.vm?.service?.get('/agent_status') as any;
      
      // Handle both old and new response structures (Docker Desktop API change)
      const statusData = result?.data || result;
      if (statusData) {
        const status: AgentStatus = {
          status: statusData.status,
          timestamp: statusData.timestamp,
          connectionLatency: statusData.connectionLatency,
          lastError: statusData.lastError
        };
        this.onStatusUpdate?.(status);
      } else {
        this.onStatusUpdate?.({
          status: 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
      this.onStatusUpdate?.({
        status: 'unknown',
        timestamp: new Date().toISOString()
      });
      this.onError?.(error as Error);
    }
  }

  async checkStatusNow() {
    await this.pollStatus();
  }
}

export const statusService = new StatusService();
