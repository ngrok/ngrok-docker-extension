import { useEffect, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { Grid } from "@mui/material";
import ContainersGrid from "./components/ContainersGrid";
import { Header } from "./components/Header";
import AuthStepper from "./components/AuthStepper";
import { useNgrokContext } from "./components/NgrokContext";

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export function App() {
  const { authtoken, containers} = useNgrokContext();
  const authIsSetup = authtoken != "";

  return (
    <>
      <Header />
      <Grid
        container
        direction={"column"}
        spacing={2}
        textAlign={"center"}
        justifyContent={"center"}
        mt={8}
      >
        {!authIsSetup ? (
          <AuthStepper />
        ) : (
          <Grid mt={2}>
            <ContainersGrid />
          </Grid>
        )}
      </Grid>
    </>
  );
}
