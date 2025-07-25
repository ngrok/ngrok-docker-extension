import { useEffect, useState } from "react";
import Grid2 from "@mui/material/Grid2";
import { LinearProgress } from "@mui/material";
import ContainerGrid from "./components/ContainerGrid";
import { Header } from "./components/Header";
import AuthSetup from "./components/AuthSetup";
import ErrorBanner from "./components/ErrorBanner";
import { useNgrokContext } from "./components/NgrokContext";

export function App() {
  const { hasReceivedAgentData, hasReceivedEndpointData, hasReceivedContainerData, authIsSetup } = useNgrokContext();
  const [shouldShowLoading, setShouldShowLoading] = useState(false);
  
  const isLoading = !hasReceivedAgentData || !hasReceivedEndpointData || !hasReceivedContainerData;

  useEffect(() => {
    if (isLoading) {
      // Show loading indicator after 250ms delay
      const timer = setTimeout(() => setShouldShowLoading(true), 250);
      return () => clearTimeout(timer);
    } else {
      // Reset immediately when loading completes
      setShouldShowLoading(false);
    }
  }, [isLoading]);

  if (isLoading) {
    if (shouldShowLoading) {
      return <LinearProgress />;
    } else {
      return null; // Render blank during 250ms delay
    }
  }

  return (
    <>
      {authIsSetup && <Header />}
      {authIsSetup && <ErrorBanner />}
      <Grid2
        container
        direction={"column"}
        spacing={2}
        textAlign={"center"}
        justifyContent={"center"}
        sx={{ mt: authIsSetup ? 8 : 0 }}
      >
        {!authIsSetup ? (
          <AuthSetup />
        ) : (
          <Grid2 size={12} sx={{ mt: 2, width: '100%', minWidth: 0 }}>
            <ContainerGrid />
          </Grid2>
        )}
      </Grid2>
    </>
  );
}
