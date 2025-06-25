import Grid2 from "@mui/material/Grid2";
import ContainersGrid from "./components/ContainersGrid";
import { Header } from "./components/Header";
import AuthStepper from "./components/AuthStepper";
import { useNgrokContext } from "./components/NgrokContext";

export function App() {
  const { authIsSetup } = useNgrokContext();

  return (
    <>
      <Header />
      <Grid2
        container
        direction={"column"}
        spacing={2}
        textAlign={"center"}
        justifyContent={"center"}
        sx={{ mt: 8 }}
      >
        {!authIsSetup ? (
          <AuthStepper />
        ) : (
          <Grid2 sx={{ mt: 2 }}>
            <ContainersGrid />
          </Grid2>
        )}
      </Grid2>
    </>
  );
}
