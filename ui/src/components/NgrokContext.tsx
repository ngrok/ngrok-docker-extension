import React, { createContext, useContext, useEffect, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

export interface NgrokContainer {
  id: string;
  ContainerId: string;
  Name: string;
  Port: DockerPort;
  
  // v2 Options
  tcp: boolean;
  http: boolean;
  oauth: string;
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Ports: DockerPort[];
}

export interface DockerPort {
  PublicPort: number;
  Type: string;
}

export interface Endpoint {
  id: string;
  url: string;
}

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface IngrokContext {
  authToken: string;
  setAuthToken: (authToken: string) => void;

  containers: Record<string,NgrokContainer>;
  setContainers: (containers: Record<string, NgrokContainer>) => void;

  endpoints: Record<string,Endpoint>;
  setEndpoints: (endpoints: Record<string, Endpoint>) => void;
}

const NgrokContext = createContext<IngrokContext>({
  authToken: "",
  setAuthToken: () => null,
  containers: {},
  setContainers: () => null,
  endpoints: {},
  setEndpoints: () => null,
});

export function NgrokContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("authToken") ?? ""
  );

  const [containers, setContainers] = useState(
    localStorage.getItem("containers") ? JSON.parse(localStorage.getItem("containers") ?? "") : {}
  );

  const [endpoints, setEndpoints] = useState(
    localStorage.getItem("endpoints") ? JSON.parse(localStorage.getItem("endpoints") ?? "") : {}
  );

  const getContainers = async () => {
    ddClient.docker.listContainers().then((loaded)=>{
      // console.log("Loaded containers", loaded);
      updateContainers(loaded as DockerContainer[]);
    });

    ddClient.extension.vm?.service?.get("/progress").then((result: any)=>{
      // console.log('Loaded endpoints', result);
      const endpointsMap: Record<string, Endpoint> = {};
      if (result.endpoints) {
        result.endpoints.forEach((endpoint: Endpoint) => {
          endpointsMap[endpoint.id] = endpoint;
        });
      }
      updateEndpoints(endpointsMap);
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
              Port: port,
              tcp: false,
              http: true,
              oauth: "",
            };
          }else{
            newContainers[container_id] = containers[container_id];
            if(newContainers[container_id].Name !== container.Names[0].substring(1,)){
              newContainers[container_id].Name = container.Names[0].substring(1);
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

  const ddClient = useDockerDesktopClient();
  useEffect(() => {
    ddClient.extension.vm?.service
      ?.post('/auth', { token: authToken })
      .then((result) => {
        localStorage.setItem("authToken", authToken);
      });
    
      getContainers();
    
  }, [authToken]);

  useEffect(() => {
    // If the auth token already exists in the local storage, make a POST /auth request automatically to set up the auth
    if (authToken !== null) {
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
            async onOutput(data: any) {
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
        containers,
        setContainers,
        endpoints,
        setEndpoints,
      }}
    >
      {children}
    </NgrokContext.Provider>
  );
}

export function useNgrokContext() {
  return useContext(NgrokContext);
}
