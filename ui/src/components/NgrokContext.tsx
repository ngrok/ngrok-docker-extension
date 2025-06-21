import React, { createContext, useContext, useEffect, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

export interface NgrokContainer {
  id: string;
  ContainerId: string;
  Name: string;
  Image: string;
  Port: DockerPort;
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  Ports: DockerPort[];
}

export interface DockerPort {
  PublicPort: number;
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
}

export interface RunningEndpoint {
  id: string; // same as configuration id
  url: string; // actual ngrok URL
  containerId: string;
  targetPort: string;
}

export interface Endpoint {
  id: string;
  url: string;
  containerId: string;
  targetPort: string;
}

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface NgrokContextType {
  authToken: string;
  setAuthToken: (authToken: string) => void;
  authIsSetup: boolean;

  containers: Record<string,NgrokContainer>;
  setContainers: (containers: Record<string, NgrokContainer>) => void;

  // Legacy endpoints for backward compatibility
  endpoints: Record<string,Endpoint>;
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
}

const NgrokContext = createContext<NgrokContextType>({
  authToken: "",
  setAuthToken: () => null,
  authIsSetup: false,
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
});

export function NgrokContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("authToken") ?? ""
  );
  const authIsSetup = authToken !== "";

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

  const getContainers = async () => {
    ddClient.docker.listContainers().then((loaded)=>{
      // console.log("Loaded containers", loaded);
      updateContainers(loaded as DockerContainer[]);
    });

    ddClient.extension.vm?.service?.get("/list_endpoints").then((result: any)=>{
      // console.log('Loaded endpoints', result);
      const endpointsMap: Record<string, Endpoint> = {};
      const runningEndpointsMap: Record<string, RunningEndpoint> = {};
      
      if (result.endpoints) {
        result.endpoints.forEach((endpoint: Endpoint) => {
          endpointsMap[endpoint.id] = endpoint;
          // Also populate running endpoints
          runningEndpointsMap[endpoint.id] = {
            id: endpoint.id,
            url: endpoint.url,
            containerId: endpoint.containerId,
            targetPort: endpoint.targetPort
          };
        });
      }
      updateEndpoints(endpointsMap);
      updateRunningEndpoints(runningEndpointsMap);
    });
  }

  function updateContainers(loaded: DockerContainer[]) {
    if(loaded){
      const newContainers: Record<string, NgrokContainer> = {};
      for(const container of loaded){
        for(const port of container.Ports.filter(x=>x.PublicPort)){
          const container_id = `${container.Id}:${port.PublicPort}`;
          if(!containers[container_id]){
            newContainers[container_id] = {
              id: container_id,
              ContainerId: container.Id,
              Name: container.Names[0].substring(1),
              Image: container.Image,
              Port: port,
            };
          }else{
            newContainers[container_id] = containers[container_id];
            if(newContainers[container_id].Name !== container.Names[0].substring(1)){
              newContainers[container_id].Name = container.Names[0].substring(1);
            }
            if(newContainers[container_id].Image !== container.Image){
              newContainers[container_id].Image = container.Image;
            }
            if(newContainers[container_id].Port.PublicPort !== port.PublicPort){
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

  const ddClient = useDockerDesktopClient();
  useEffect(() => {
    if (authIsSetup) {
      ddClient.extension.vm?.service
        ?.post('/configure_agent', { token: authToken })
        .then((_result) => {
          localStorage.setItem("authToken", authToken);
        });
      
      getContainers();
    }
  }, [authToken, authIsSetup]);

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

  return (
    <NgrokContext.Provider
      value={{
        authToken,
        setAuthToken,
        authIsSetup,
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
      }}
    >
      {children}
    </NgrokContext.Provider>
  );
}

export function useNgrokContext() {
  return useContext(NgrokContext);
}
