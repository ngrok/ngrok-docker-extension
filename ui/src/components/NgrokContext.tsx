import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { statusService } from '../services/statusService';
import * as api from '../services/api';
import {
  AgentConfig,
  AgentStatus,
  AgentResponse,
  EndpointConfig,
  EndpointStatus,
  EndpointResponse
} from '../types/api';

export interface NgrokContainer {
    id: string;
    ContainerId: string;
    Name: string;
    Image: string;
    ImageId: string;
    Port: DockerPort;
}

export interface DockerContainer {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Ports: DockerPort[];
    State: string;
}

export interface DockerPort {
    PublicPort: number;
    PrivatePort?: number;
    Type: string;
}





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

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
    return client;
}

interface NgrokContextType {
    // Loading state
    hasReceivedAgentData: boolean;
    hasReceivedEndpointData: boolean;
    hasReceivedContainerData: boolean;
    
    // Computed state from API
    authIsSetup: boolean;

    // New API-based state
    agentConfig: AgentConfig | null;
    agentStatus: AgentStatus | null;
    endpointConfigs: Record<string, EndpointConfig>;
    endpointStatuses: Record<string, EndpointStatus>;
    
    // Combined getter for UI convenience
    apiEndpoints: EndpointResponse[];
    
    // New actions for API-based management
    saveAgentSettings: (config: AgentConfig) => Promise<void>;
    toggleAgentState: (expectedState: "online" | "offline") => Promise<void>;
    createEndpoint: (config: EndpointConfig) => Promise<void>;
    updateEndpoint: (id: string, config: EndpointConfig) => Promise<void>;
    deleteEndpoint: (id: string) => Promise<void>;
    toggleEndpointState: (id: string, expectedState: "online" | "offline") => Promise<void>;

    // Container management
    containers: Record<string, NgrokContainer>;
    allDockerContainers: DockerContainer[];
    setContainers: (containers: Record<string, NgrokContainer>) => void;

    // UI filters
    onlineEndpointsOnly: boolean;
    setOnlineEndpointsOnly: (value: boolean) => void;
}

const NgrokContext = createContext<NgrokContextType>({
    // Loading state
    hasReceivedAgentData: false,
    hasReceivedEndpointData: false,
    hasReceivedContainerData: false,
    
    // Computed state
    authIsSetup: false,

    // New API-based state
    agentConfig: null,
    agentStatus: null,
    endpointConfigs: {},
    endpointStatuses: {},
    apiEndpoints: [],
    
    // New actions
    saveAgentSettings: async () => { },
    toggleAgentState: async () => { },
    createEndpoint: async () => { },
    updateEndpoint: async () => { },
    deleteEndpoint: async () => { },
    toggleEndpointState: async () => { },

    // Container management
    containers: {},
    allDockerContainers: [],
    setContainers: () => null,
    
    // UI filters
    onlineEndpointsOnly: false,
    setOnlineEndpointsOnly: () => null,
});

export function NgrokContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // New API-based state (primary source of truth)
    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
    const [endpointConfigs, setEndpointConfigs] = useState<Record<string, EndpointConfig>>({});
    const [endpointStatuses, setEndpointStatuses] = useState<Record<string, EndpointStatus>>({});

    // Explicit loading state - tracks when API responses have been received
    const [hasReceivedAgentData, setHasReceivedAgentData] = useState(false);
    const [hasReceivedEndpointData, setHasReceivedEndpointData] = useState(false);
    
    // Computed state from API state
    const authIsSetup = useMemo(() => (agentConfig?.authToken || "") !== "", [agentConfig?.authToken]);

    // Container state
    const [containers, setContainers] = useState<Record<string, NgrokContainer>>({});
    const [allDockerContainers, setAllDockerContainers] = useState<DockerContainer[]>([]);
    const [hasReceivedContainerData, setHasReceivedContainerData] = useState(false);







    const [onlineEndpointsOnly, setOnlineEndpointsOnly] = useState(false);

    const ddClient = useDockerDesktopClient();

    // Combined endpoints for UI
    const apiEndpoints = useMemo((): EndpointResponse[] => {
        return Object.values(endpointConfigs).map(config => ({
            ...config,
            status: endpointStatuses[config.id] || {
                state: "offline",
                lastError: "Status unknown"
            }
        }));
    }, [endpointConfigs, endpointStatuses]);

    // New API-based actions
    const saveAgentSettings = useCallback(async (config: AgentConfig) => {
        try {
            const response = await api.putAgent(config);
            setAgentConfig(response);
            setAgentStatus(response.status);
            ddClient.desktopUI.toast.success("Settings saved successfully");
        } catch (error) {
            console.error('Failed to save agent settings:', error);
            ddClient.desktopUI.toast.error("Failed to save settings");
            throw error;
        }
    }, [ddClient]);

    const toggleAgentState = useCallback(async (expectedState: "online" | "offline") => {
        if (!agentConfig) {
            console.error('Cannot toggle agent state: no agent config available');
            return;
        }
        
        try {
            const updatedConfig = { ...agentConfig, expectedState };
            const response = await api.putAgent(updatedConfig);
            setAgentConfig(response);
            setAgentStatus(response.status);
        } catch (error) {
            console.error('Failed to toggle agent state:', error);
            ddClient.desktopUI.toast.error(`Failed to ${expectedState === 'online' ? 'start' : 'stop'} agent`);
            throw error;
        }
    }, [agentConfig, ddClient]);

    const createEndpoint = useCallback(async (config: EndpointConfig) => {
        try {
            const response = await api.createEndpoint(config);
            // Update local state immediately
            setEndpointConfigs(prev => ({ ...prev, [response.id]: response }));
            setEndpointStatuses(prev => ({ ...prev, [response.id]: response.status }));
            ddClient.desktopUI.toast.success("Endpoint created");
        } catch (error) {
            console.error('Failed to create endpoint:', error);
            ddClient.desktopUI.toast.error("Failed to create endpoint");
            throw error;
        }
    }, [ddClient]);

    const updateEndpoint = useCallback(async (id: string, config: EndpointConfig) => {
        try {
            const response = await api.updateEndpoint(id, config);
            setEndpointConfigs(prev => ({ ...prev, [response.id]: response }));
            setEndpointStatuses(prev => ({ ...prev, [response.id]: response.status }));
            ddClient.desktopUI.toast.success("Endpoint updated");
        } catch (error) {
            console.error('Failed to update endpoint:', error);
            ddClient.desktopUI.toast.error("Failed to update endpoint");
            throw error;
        }
    }, [ddClient]);

    const deleteEndpoint = useCallback(async (id: string) => {
        try {
            await api.deleteEndpoint(id);
            setEndpointConfigs(prev => {
                const newConfigs = { ...prev };
                delete newConfigs[id];
                return newConfigs;
            });
            setEndpointStatuses(prev => {
                const newStatuses = { ...prev };
                delete newStatuses[id];
                return newStatuses;
            });
            ddClient.desktopUI.toast.success("Endpoint deleted");
        } catch (error) {
            console.error('Failed to delete endpoint:', error);
            ddClient.desktopUI.toast.error("Failed to delete endpoint");
            throw error;
        }
    }, [ddClient]);

    const toggleEndpointState = useCallback(async (id: string, expectedState: "online" | "offline") => {
        try {
            const currentConfig = endpointConfigs[id];
            if (!currentConfig) return;
            
            const updatedConfig = { ...currentConfig, expectedState };
            const response = await api.updateEndpoint(id, updatedConfig);
            setEndpointConfigs(prev => ({ ...prev, [response.id]: response }));
            setEndpointStatuses(prev => ({ ...prev, [response.id]: response.status }));
        } catch (error) {
            console.error('Failed to toggle endpoint state:', error);
            ddClient.desktopUI.toast.error(`Failed to ${expectedState === 'online' ? 'start' : 'stop'} endpoint`);
            throw error;
        }
    }, [endpointConfigs, ddClient]);

    const getContainers = async () => {
        try {
            // Get ALL containers (running and stopped) by passing {all: true}
            const loaded = await ddClient.docker.listContainers({all: true});
            const containers = loaded as DockerContainer[];
            setAllDockerContainers(containers);
            updateContainers(containers);
        } finally {
            setHasReceivedContainerData(true);
        }
    }

    function updateContainers(loaded: DockerContainer[]) {
        if (loaded) {
            const newContainers: Record<string, NgrokContainer> = {};
            for (const container of loaded) {
                const publicPorts = container.Ports ? container.Ports.filter(x => x.PublicPort) : [];
                const isRunning = container.State === 'running';

                for (const port of publicPorts) {
                    const container_id = `${container.Id}:${port.PublicPort}`;
                    
                    // Only include containers with published ports if they're also running
                    if (!isRunning) {
                        continue;
                    }
                    
                    const imageId = (container as any).ImageID;
                    if (!containers[container_id]) {
                        newContainers[container_id] = {
                            id: container_id,
                            ContainerId: container.Id,
                            Name: container.Names[0].substring(1),
                            Image: container.Image,
                            ImageId: imageId,
                            Port: port,
                        };
                    } else {
                        newContainers[container_id] = containers[container_id];
                        if (newContainers[container_id].Name !== container.Names[0].substring(1)) {
                            newContainers[container_id].Name = container.Names[0].substring(1);
                        }
                        if (newContainers[container_id].Image !== container.Image) {
                            newContainers[container_id].Image = container.Image;
                        }
                        if (newContainers[container_id].Port.PublicPort !== port.PublicPort) {
                            newContainers[container_id].Port = port;
                        }
                    }
                }
            }

            setContainers(newContainers);
        }
    }





    const handleStatusError = useCallback((error: Error) => {
        console.error('Status polling error:', error);
    }, []);

    // New API polling handlers
    const handleAgentUpdate = useCallback((agent: AgentResponse) => {

        
        setAgentConfig(agent);
        setAgentStatus(agent.status);
        setHasReceivedAgentData(true);
    }, []);

    const handleEndpointsUpdate = useCallback((endpoints: EndpointResponse[]) => {
        const configs: Record<string, EndpointConfig> = {};
        const statuses: Record<string, EndpointStatus> = {};
        
        endpoints.forEach(endpoint => {
            configs[endpoint.id] = endpoint;
            statuses[endpoint.id] = endpoint.status;
        });
        
        setEndpointConfigs(configs);
        setEndpointStatuses(statuses);
        setHasReceivedEndpointData(true);
    }, []);

    useEffect(() => {
        // Load containers immediately on startup regardless of auth status
        getContainers();
    }, []);



    useEffect(() => {
        const containersEvents = async () => {
            await ddClient.docker.cli.exec(
                "events",
                [
                    "--format",
                    `"{{ json . }}"`,
                    "--filter",
                    "type=container",
                    "--filter",
                    "event=start",
                    "--filter",
                    "event=destroy",
                ],
                {
                    stream: {
                        async onOutput(_data: any) {
                            await getContainers();
                        },
                        splitOutputLines: true,
                    },
                }
            );
        };

        containersEvents();
    }, []);

    useEffect(() => {
        // Start API polling (initialization flag is set in handleAgentUpdate)
        statusService.startPolling(handleAgentUpdate, handleEndpointsUpdate, handleStatusError);
        
        return () => {
            statusService.stopPolling();
        };
    }, [handleAgentUpdate, handleEndpointsUpdate, handleStatusError]);

    return (
        <NgrokContext.Provider
            value={{
                // Loading state
                hasReceivedAgentData,
                hasReceivedEndpointData,
                hasReceivedContainerData,
                
                // Computed state
                authIsSetup,

                // New API-based state
                agentConfig,
                agentStatus,
                endpointConfigs,
                endpointStatuses,
                apiEndpoints,
                
                // New actions
                saveAgentSettings,
                toggleAgentState,
                createEndpoint,
                updateEndpoint,
                deleteEndpoint,
                toggleEndpointState,

                // Container management
                containers,
                allDockerContainers,
                setContainers,
                
                // UI filters
                onlineEndpointsOnly,
                setOnlineEndpointsOnly,
            }}
        >
            {children}
        </NgrokContext.Provider>
    );
}

export function useNgrokContext() {
    return useContext(NgrokContext);
}
