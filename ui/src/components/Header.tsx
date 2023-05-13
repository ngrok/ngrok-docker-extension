import { Grid, Typography } from "@mui/material";
import SettingsDialog from "./SettingsDialog";
import { useNgrokContext } from "./NgrokContext";

export function Header() {
  const { authtoken } = useNgrokContext();
  const authIsSetup = authtoken != "";

  return (
    <>
      <Grid container justifyContent={"space-between"} direction={"row"}>
        <Grid>
          <Grid alignItems="center">
            <Typography data-testid="heading" variant="h3" role="title">
              ngrok
            </Typography>
          </Grid>
          <Typography
            data-testid="subheading"
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Quickly create secure public ingress to your web applications running in Docker.
          </Typography>
        </Grid>
        {authIsSetup && (
          <Grid justifyContent="right">
            <SettingsDialog />
          </Grid>
        )}
      </Grid>
    </>
  );
}
