import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from '@mui/material/styles';
import { DockerMuiV6ThemeProvider } from "@docker/docker-mui-theme";

import { App } from "./App";
import { NgrokContextProvider } from "./components/NgrokContext";
import { buildNgrokTheme } from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/*
      If you eject from MUI (which we don't recommend!), you should add
      the `dockerDesktopTheme` class to your root <html> element to get
      some minimal Docker theming.
    */}
    <DockerMuiV6ThemeProvider>
      <ThemeProvider theme={buildNgrokTheme}>
        <CssBaseline />
        <NgrokContextProvider>
          <App />
        </NgrokContextProvider>
      </ThemeProvider>
    </DockerMuiV6ThemeProvider>
  </React.StrictMode>
);
