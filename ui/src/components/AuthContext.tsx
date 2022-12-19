import React, { createContext, useContext, useEffect, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface IAuthContext {
  authToken: string;
  setAuthToken: (authToken: string) => void;
}

const AuthContext = createContext<IAuthContext>({
  authToken: "",
  setAuthToken: () => null,
});

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("authToken") ?? ""
  );

  const ddClient = useDockerDesktopClient();
  useEffect(() => {
    ddClient.extension.vm?.service
      ?.get(`/auth?token=${authToken}`)
      .then((result) => {
        localStorage.setItem("authToken", authToken);
      });
  }, [authToken]);

  useEffect(() => {
    // If the auth token already exists in the local storage, make a GET /auth request automatically to set up the auth
    if (authToken !== null) {
      ddClient.extension.vm?.service?.get(`/auth?token=${authToken}`);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authToken,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
