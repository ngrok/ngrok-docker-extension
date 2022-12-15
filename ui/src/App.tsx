import React, { useEffect, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { Grid } from "@mui/material";
import SettingsDialog from "./components/SettingsDialog";
import ContainersGrid from "./components/ContainersGrid";
import { Header } from "./components/Header";
import AuthStepper from "./components/AuthStepper";

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export function App() {
  const ddClient = useDockerDesktopClient();
  const [authIsSetup, setAuthIsSetup] = useState<boolean>(() => {
    return (
      localStorage.getItem("authToken") !== null &&
      localStorage.getItem("authToken") !== ""
    );
  });

  useEffect(() => {
    // If the auth token already exists in the local storage, make a GET /auth request automatically to set up the auth
    const authToken = localStorage.getItem("authToken");
    if (authToken !== null) {
      ddClient.extension.vm?.service?.get(`/auth?token=${authToken}`);
    }
  }, []);

  const onSave = () => {
    setAuthIsSetup(true);
  };

  return (
    <>
      <Header />
      {authIsSetup && (
        <Grid container justifyContent="right">
          <SettingsDialog onSave={onSave} />
        </Grid>
      )}
      <Grid
        container
        direction={"column"}
        spacing={2}
        textAlign={"center"}
        justifyContent={"center"}
        mt={8}
      >
        {!authIsSetup ? (
          <AuthStepper onSave={onSave} />
        ) : (
          <Grid mt={2}>
            <ContainersGrid />
          </Grid>
        )}
      </Grid>
    </>
  );
}
