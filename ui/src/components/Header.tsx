import { Grid, Typography } from "@mui/material";
import SettingsDialog from "./SettingsDialog";
import { useNgrokContext } from "./NgrokContext";

export function Header() {
  const { authToken } = useNgrokContext();
  const authIsSetup = authToken != "";

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
            Expose your containers to the public internet using ngrok.
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
