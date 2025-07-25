import * as React from "react";
import {
  Button,
  Container,
  TextField,
  Alert,
  LinearProgress,
  Stack,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import {
  OpenInNew as OpenInNewIcon,
  VpnKey as VpnKeyIcon,
  Error as ErrorIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { useNgrokContext } from "./NgrokContext";
import ngrokLogoSvg from "../assets/ngrok-logo.svg";
import { SecondaryText, FlexRowMb2, FlexRowStart } from "./styled";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function AuthSetup() {
  const { saveAgentSettings } = useNgrokContext();
  const [localAuthToken, setLocalAuthToken] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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
      // Use new API method to configure agent with expected state "online"
      await saveAgentSettings({
        authToken: localAuthToken,
        connectURL: "", // Default to empty
        expectedState: "online" // Set agent to come online automatically
      });
      // Success toast is handled by saveAgentSettings
    } catch (error) {
      console.error('Failed to save authtoken:', error);
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

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm">
      <Grid2 container direction="column" spacing={5} sx={{ py: 8 }}>
        <Grid2 sx={{ textAlign: 'center'}}>
          <FlexRowMb2 sx={{ justifyContent: 'center' }}>
            <img 
              src={ngrokLogoSvg} 
              alt="ngrok" 
              style={{ height: '32px', width: 'auto' }}
            />
          </FlexRowMb2>
          <SecondaryText>
            We just need your authtoken to get started.
          </SecondaryText>
        </Grid2>

        <Grid2>
          <Stack spacing={4} alignItems="center">
            <Button
              variant="outlined"
              size="large"
              endIcon={<OpenInNewIcon />}
              onClick={handleGetToken}
            >
              Get my authtoken on ngrok dashboard
            </Button>

            <FlexRowStart sx={{ gap: 1, width: '100%'}}>
              <TextField
                sx={{ margin:0, flexDirection: 'row', height:42,}}
                fullWidth
                type={showPassword ? "text" : "password"}
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
                  endAdornment: (
                    <InputAdornment position="end">
                      {validationError ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          disabled={isSubmitting}
                          tabIndex={-1}
                          disableFocusRipple
                          disableRipple
                          sx={{ marginRight:0}}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
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
            </FlexRowStart>
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
