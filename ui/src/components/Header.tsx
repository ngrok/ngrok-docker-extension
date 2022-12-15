import { QuestionAnswerOutlined } from "@mui/icons-material";
import { Grid, Typography } from "@mui/material";

export function Header() {
  return (
    <>
      <Grid container gap={2} alignItems="center">
        <Typography data-testid="heading" variant="h3" role="title">
          Ngrok
        </Typography>
      </Grid>
      <Typography
        data-testid="subheading"
        variant="body1"
        color="text.secondary"
        sx={{ mt: 2 }}
      >
        Expose your containers to the public internet using Ngrok.
      </Typography>
    </>
  );
}
