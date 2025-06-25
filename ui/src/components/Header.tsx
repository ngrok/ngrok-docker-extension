import { Typography } from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import SettingsDialog from "./SettingsDialog";
import { useNgrokContext } from "./NgrokContext";

export function Header() {
  const { authIsSetup } = useNgrokContext();

  return (
    <>
      <Grid2 container justifyContent={"space-between"} direction={"row"}>
        <Grid2>
          <Grid2 alignItems="center">
            <Typography data-testid="heading" variant="h3" role="title">
              ngrok
            </Typography>
          </Grid2>
          <Typography
            data-testid="subheading"
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Put your containers online with ngrok's API Gateway.
          </Typography>
        </Grid2>
        {authIsSetup && (
          <Grid2 justifyContent="right">
            <SettingsDialog />
          </Grid2>
        )}
      </Grid2>
    </>
  );
}
