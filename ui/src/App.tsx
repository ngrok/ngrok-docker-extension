import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { Grid, Typography } from "@mui/material";
import SettingsDialog from "./components/SettingsDialog";
import ContainersGrid from "./components/ContainersGrid";

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
    console.log("onSave");
    setAuthIsSetup(true);
  };

  return (
    <>
      <Grid container justifyContent="right">
        <SettingsDialog onSave={onSave} />
      </Grid>
      <Grid
        container
        direction={"column"}
        spacing={2}
        textAlign={"center"}
        justifyContent={"center"}
      >
        <Grid item>
          <Typography variant="h2" color="text.secondary" mt={2}>
            ngrok is the fastest way to put your containers on the internet.
          </Typography>
        </Grid>

        {!authIsSetup ? (
          <Grid item>
            <Typography variant="body1" color="text.secondary" mb={2}>
              To expose your containers to the public internet, you first need
              an Authtoken.
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={2}>
              Sign in or Log into Ngrok to get an Authtoken by clicking on the
              button below. Once you've copied the Authtoken, paste it in the{" "}
              <b>Settings</b> in the upper-right corner of this screen. The
              Authtoken will be saved and you will only have to do this once.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                ddClient.host.openExternal(
                  "https://dashboard.ngrok.com/get-started/your-authtoken"
                );
              }}
            >
              Get Authtoken
            </Button>
          </Grid>
        ) : (
          <Grid mt={2}>
            <ContainersGrid />
          </Grid>
        )}
      </Grid>
    </>
  );
}
