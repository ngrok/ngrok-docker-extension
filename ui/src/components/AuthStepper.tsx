import * as React from "react";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import Button from "@mui/material/Button";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import Typography from "@mui/material/Typography";
import Grid2 from "@mui/material/Grid2";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import SettingsDialog from "./SettingsDialog";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

const steps = [
  {
    label: "Get Authtoken",
    description: `To connect your containers to the public internet you need an Authtoken.
    Sign in or Log in ngrok to get an Authtoken by clicking below:`,
  },
  {
    label: "Save the Authtoken in Settings",
    description:
      "Copy your Authtoken and save it in Settings. You only have to do this once.",
  },
  {
    label: "You're all set!",
    description:
      "Start connecting your containers that have published ports to the internet",
  },
];

export default function AuthStepper() {
  const ddClient = useDockerDesktopClient();
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <Grid2 container flex={1} alignItems={"center"} justifyContent={"center"}>
      <Grid2 size={6}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === 2 ? (
                    <Typography variant="caption">
                      {step.description}
                    </Typography>
                  ) : null
                }
              >
                {step.label}
              </StepLabel>

              <StepContent>
                <Typography sx={{ mb: 2 }} align={"left"}>{step.description}</Typography>
                <Grid2
                  container
                  direction="row"
                  alignItems={"left"}
                  justifyContent={"left"}
                  spacing={1}
                >
                  {index !== 0 && (
                    <Grid2>
                      <Button variant="outlined" disabled={index === 0} onClick={handleBack}>
                        Back
                      </Button>
                    </Grid2>
                  )}
                  <Grid2>
                    {index === 0 && activeStep === 0 && (
                      <Button
                        endIcon={<OpenInNewRoundedIcon />}
                        onClick={() => {
                          ddClient.host.openExternal(
                            "https://dashboard.ngrok.com/get-started/your-authtoken"
                          );
                          handleNext();
                        }}
                      >
                        Get Authtoken
                      </Button>
                    )}
                  </Grid2>
                  <Grid2>
                    {index === 1 && activeStep === 1 && <SettingsDialog />}
                  </Grid2>
                </Grid2>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Grid2>
    </Grid2>
  );
}
