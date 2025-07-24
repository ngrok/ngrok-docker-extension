import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { statusService, AgentStatus } from '../services/statusService';

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
}

export interface DockerPort {
    PublicPort: number;
    PrivatePort?: number;
    Type: string;
}

export interface EndpointConfiguration {
    id: string; // containerId:targetPort
    containerId: string;
    targetPort: string;
    url?: string;
    binding: 'public' | 'internal' | 'kubernetes';
    poolingEnabled: boolean;
    trafficPolicy?: string;
    description?: string;
    metadata?: string;
    lastStarted?: string; // ISO timestamp of when endpoint was last started
}

export interface RunningEndpoint {
    id: string; // same as configuration id
    url: string; // actual ngrok URL
    containerId: string;
    targetPort: string;
    lastStarted: string; // ISO timestamp when endpoint was last started
}

export interface Endpoint {
    id: string;
    url: string;
    containerId: string;
    targetPort: string;
    lastStarted: string;
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
    authToken: string;
    setAuthToken: (authToken: string) => void;
    authIsSetup: boolean;

    connectURL: string;
    setConnectURL: (connectURL: string) => void;

    autoDisconnect: boolean;
    setAutoDisconnect: (autoDisconnect: boolean) => void;
    saveSettings: (authToken: string, connectURL: string, autoDisconnect: boolean) => Promise<void>;

    containers: Record<string, NgrokContainer>;
    setContainers: (containers: Record<string, NgrokContainer>) => void;

    // Legacy endpoints for backward compatibility
    endpoints: Record<string, Endpoint>;
    setEndpoints: (endpoints: Record<string, Endpoint>) => void;

    // New separate state for configurations and running endpoints
    endpointConfigurations: Record<string, EndpointConfiguration>;
    setEndpointConfigurations: (configs: Record<string, EndpointConfiguration>) => void;
    runningEndpoints: Record<string, RunningEndpoint>;
    setRunningEndpoints: (endpoints: Record<string, RunningEndpoint>) => void;

    // Configuration management methods
    createEndpointConfiguration: (config: EndpointConfiguration) => void;
    updateEndpointConfiguration: (id: string, config: EndpointConfiguration) => void;
    deleteEndpointConfiguration: (id: string) => void;

    // Online endpoints filter state
    onlineEndpointsOnly: boolean;
    setOnlineEndpointsOnly: (value: boolean) => void;

    // Agent status
    agentStatus: AgentStatus;
}

const NgrokContext = createContext<NgrokContextType>({
    authToken: "",
    setAuthToken: () => null,
    authIsSetup: false,

    connectURL: "",
    setConnectURL: () => null,

    autoDisconnect: false,
    setAutoDisconnect: () => null,
    saveSettings: async () => { },

    containers: {},
    setContainers: () => null,
    endpoints: {},
    setEndpoints: () => null,
    endpointConfigurations: {},
    setEndpointConfigurations: () => null,
    runningEndpoints: {},
    setRunningEndpoints: () => null,
    createEndpointConfiguration: () => null,
    updateEndpointConfiguration: () => null,
    deleteEndpointConfiguration: () => null,
    onlineEndpointsOnly: false,
    setOnlineEndpointsOnly: () => null,
    agentStatus: {
        status: 'offline',
        timestamp: new Date().toISOString()
    },
});

export function NgrokContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [authToken, setAuthToken] = useState(
        localStorage.getItem("authToken") ?? ""
    );
    const authIsSetup = useMemo(() => authToken !== "", [authToken]);

    const [connectURL, setConnectURL] = useState(
        localStorage.getItem("connectURL") ?? ""
    );

    const [autoDisconnect, setAutoDisconnect] = useState(
        localStorage.getItem("autoDisconnect") === "true" ? true : false // Default to false
    );

    const [containers, setContainers] = useState(
        localStorage.getItem("containers") ? JSON.parse(localStorage.getItem("containers") ?? "") : {}
    );

    const [endpoints, setEndpoints] = useState(
        localStorage.getItem("endpoints") ? JSON.parse(localStorage.getItem("endpoints") ?? "") : {}
    );

    // New state for endpoint configurations and running endpoints
    const [endpointConfigurations, setEndpointConfigurations] = useState<Record<string, EndpointConfiguration>>(
        localStorage.getItem("endpointConfigurations") ? JSON.parse(localStorage.getItem("endpointConfigurations") ?? "{}") : {}
    );

    const [runningEndpoints, setRunningEndpoints] = useState<Record<string, RunningEndpoint>>({});

    const [agentStatus, setAgentStatus] = useState<AgentStatus>({
        status: 'unknown',
        timestamp: new Date().toISOString()
    });

    const [onlineEndpointsOnly, setOnlineEndpointsOnly] = useState(false);

    const getContainers = async () => {
        ddClient.docker.listContainers().then((loaded) => {
            const containers = loaded as DockerContainer[];

            updateContainers(containers);
        });

        ddClient.extension.vm?.service?.get("/list_endpoints").then((result: any) => {
            // Handle both old and new response structures (Docker Desktop API change)
            const responseData = result?.data || result;

            const endpointsMap: Record<string, Endpoint> = {};
            const runningEndpointsMap: Record<string, RunningEndpoint> = {};

            if (responseData.endpoints) {
                responseData.endpoints.forEach((endpoint: Endpoint) => {
                    endpointsMap[endpoint.id] = endpoint;
                    // Also populate running endpoints
                    runningEndpointsMap[endpoint.id] = {
                        id: endpoint.id,
                        url: endpoint.url,
                        containerId: endpoint.containerId,
                        targetPort: endpoint.targetPort,
                        lastStarted: endpoint.lastStarted
                    };
                });
            }
            updateEndpoints(endpointsMap);
            updateRunningEndpoints(runningEndpointsMap);
        });
    }

    function updateContainers(loaded: DockerContainer[]) {
        if (loaded) {
            const newContainers: Record<string, NgrokContainer> = {};
            for (const container of loaded) {
                const publicPorts = container.Ports ? container.Ports.filter(x => x.PublicPort) : [];

                for (const port of publicPorts) {
                    const container_id = `${container.Id}:${port.PublicPort}`;
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
            localStorage.setItem("containers", JSON.stringify(newContainers));
        }
    }

    function updateEndpoints(loaded: Record<string, Endpoint>) {
        setEndpoints(loaded);
        localStorage.setItem("endpoints", JSON.stringify(loaded));
    }

    // Configuration management functions
    const createEndpointConfiguration = (config: EndpointConfiguration) => {
        const newConfigs = { ...endpointConfigurations, [config.id]: config };
        setEndpointConfigurations(newConfigs);
        localStorage.setItem("endpointConfigurations", JSON.stringify(newConfigs));
    };

    const updateEndpointConfiguration = (id: string, config: EndpointConfiguration) => {
        const newConfigs = { ...endpointConfigurations, [id]: config };
        setEndpointConfigurations(newConfigs);
        localStorage.setItem("endpointConfigurations", JSON.stringify(newConfigs));
    };

    const deleteEndpointConfiguration = (id: string) => {
        const newConfigs = { ...endpointConfigurations };
        delete newConfigs[id];
        setEndpointConfigurations(newConfigs);
        localStorage.setItem("endpointConfigurations", JSON.stringify(newConfigs));
    };

    const updateRunningEndpoints = (loaded: Record<string, RunningEndpoint>) => {
        setRunningEndpoints(loaded);
    };

    const handleStatusUpdate = useCallback((status: AgentStatus) => {
        setAgentStatus(status);
    }, []);

    const handleStatusError = useCallback((error: Error) => {
        console.error('Status polling error:', error);
        setAgentStatus({
            status: 'unknown',
            timestamp: new Date().toISOString()
        });
    }, []);

    const ddClient = useDockerDesktopClient();

    // Configure agent with specific values
    const configureAgentWithValues = useCallback(async (token: string, connectURL: string, autoDisconnect: boolean) => {
        if (!token) return;

        try {
            await ddClient.extension.vm?.service?.post('/configure_agent', {
                token: token,
                connectURL: connectURL,
                autoDisconnect: autoDisconnect
            });

            // Update localStorage
            localStorage.setItem("authToken", token);
            localStorage.setItem("connectURL", connectURL);
            localStorage.setItem("autoDisconnect", autoDisconnect.toString());
        } catch (error) {
            console.error(`Failed to configure agent: ${JSON.stringify(error)}`);
            // Reset status to unknown on error
            setAgentStatus({
                status: 'unknown',
                timestamp: new Date().toISOString()
            });
            throw error; // Re-throw so saveSettings can handle it
        }
    }, [ddClient]);

    // Configure agent with current state values
    const configureAgent = useCallback(async () => {
        await configureAgentWithValues(authToken, connectURL, autoDisconnect);
    }, [authToken, connectURL, autoDisconnect, configureAgentWithValues]);

    // User-initiated save with toast notification
    const saveSettings = useCallback(async (newAuthToken: string, newConnectURL: string, newAutoDisconnect: boolean) => {
        try {
            // Update state first
            setAuthToken(newAuthToken);
            setConnectURL(newConnectURL);
            setAutoDisconnect(newAutoDisconnect);

            // Configure agent with new values
            await configureAgentWithValues(newAuthToken, newConnectURL, newAutoDisconnect);

            ddClient.desktopUI.toast.success("Settings saved successfully");
        } catch (error) {
            console.error(`Failed to save settings: ${JSON.stringify(error)}`);
            ddClient.desktopUI.toast.error("Failed to save settings");
        }
    }, [configureAgentWithValues, ddClient]);

    useEffect(() => {
        if (authIsSetup) {
            configureAgent();
            getContainers();
        }
    }, [authIsSetup, configureAgent]);

    useEffect(() => {
        // If the auth token already exists in the local storage, make a POST /auth request automatically to set up the auth
        if (authIsSetup) {
            ddClient.extension.vm?.service?.post('/auth', { token: authToken });

            getContainers();
        }
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
                        onClose(exitCode) {
                            console.log("onClose with exit code " + exitCode);
                        },
                        splitOutputLines: true,
                    },
                }
            );
        };

        containersEvents();
    }, []);

    useEffect(() => {
        statusService.startPolling(handleStatusUpdate, handleStatusError);
        return () => {
            statusService.stopPolling();
        };
    }, [handleStatusUpdate, handleStatusError]);

    return (
        <NgrokContext.Provider
            value={{
                authToken,
                setAuthToken,
                authIsSetup,

                connectURL,
                setConnectURL,

                autoDisconnect,
                setAutoDisconnect,
                saveSettings,

                containers,
                setContainers,
                endpoints,
                setEndpoints,
                endpointConfigurations,
                setEndpointConfigurations,
                runningEndpoints,
                setRunningEndpoints,
                createEndpointConfiguration,
                updateEndpointConfiguration,
                deleteEndpointConfiguration,
                onlineEndpointsOnly,
                setOnlineEndpointsOnly,
                agentStatus,
            }}
        >
            {children}
        </NgrokContext.Provider>
    );
}

export function useNgrokContext() {
    return useContext(NgrokContext);
}
