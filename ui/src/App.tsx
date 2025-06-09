import { Grid } from "@mui/material";
import ContainersGrid from "./components/ContainersGrid";
import { Header } from "./components/Header";
import AuthStepper from "./components/AuthStepper";
import { useNgrokContext } from "./components/NgrokContext";

export function App() {
  const { authToken } = useNgrokContext();
  const authIsSetup = authToken != "";

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
