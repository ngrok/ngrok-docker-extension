import * as React from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Stack,
  InputAdornment,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import {
  OpenInNew as OpenInNewIcon,
  VpnKey as VpnKeyIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { useNgrokContext } from "./NgrokContext";
import ngrokLogoSvg from "../assets/ngrok-logo.svg";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function AuthSetup() {
  const { setAuthToken } = useNgrokContext();
  const [localAuthToken, setLocalAuthToken] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const ddClient = useDockerDesktopClient();

  const handleTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalAuthToken(value);
    setValidationError(null);
  };

  const handleGetToken = () => {
    ddClient.host.openExternal(
      "https://dashboard.ngrok.com/get-started/your-authtoken"
    );
  };

  const handleSave = async () => {
    if (!localAuthToken.trim()) {
      setValidationError("Please enter your authtoken");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthToken(localAuthToken);
      ddClient.desktopUI.toast.success("Your ngrok auth token was authorized!");
    } catch (error) {
      setValidationError("Failed to save authtoken. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Container maxWidth="sm">
      <Grid2 container direction="column" spacing={4} sx={{ py: 8 }}>
        <Grid2 sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img 
              src={ngrokLogoSvg} 
              alt="ngrok" 
              style={{ height: '32px', width: 'auto' }}
            />
          </Box>
          <Typography variant="body1" color="text.secondary">
            We just need your authtoken to get started.
          </Typography>
        </Grid2>

        <Grid2>
          <Stack spacing={3} alignItems="center">
            <Button
              variant="outlined"
              size="large"
              endIcon={<OpenInNewIcon />}
              onClick={handleGetToken}
            >
              Get my authtoken on ngrok dashboard
            </Button>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', width: '100%' }}>
              <TextField
                fullWidth
                placeholder="Paste your authtoken here"
                value={localAuthToken}
                onChange={handleTokenChange}
                onKeyPress={handleKeyPress}
                error={!!validationError}
                helperText={validationError}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon color={validationError ? "error" : "action"} />
                    </InputAdornment>
                  ),
                  endAdornment: validationError ? (
                    <InputAdornment position="end">
                      <ErrorIcon color="error" />
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={!localAuthToken.trim() || isSubmitting}
                sx={{ minWidth: 'auto', flexShrink: 0 }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Stack>
        </Grid2>

        {isSubmitting && (
          <Grid2>
            <LinearProgress />
          </Grid2>
        )}

        {validationError && (
          <Grid2>
            <Alert severity="error" variant="outlined">
              {validationError}
            </Alert>
          </Grid2>
        )}


      </Grid2>
    </Container>
  );
}
