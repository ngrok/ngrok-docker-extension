import Grid2 from "@mui/material/Grid2";
import ContainersGrid from "./components/ContainersGrid";
import { Header } from "./components/Header";
import AuthSetup from "./components/AuthSetup";
import { useNgrokContext } from "./components/NgrokContext";

export function App() {
  const { authIsSetup } = useNgrokContext();

  return (
    <>
      {authIsSetup && <Header />}
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
          <Grid2 sx={{ mt: 2 }}>
            <ContainersGrid />
          </Grid2>
        )}
      </Grid2>
    </>
  );
}
