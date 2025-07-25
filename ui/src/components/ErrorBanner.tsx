import { Alert, AlertTitle, Collapse } from "@mui/material";
import { useNgrokContext } from "./NgrokContext";

const ErrorBanner: React.FC = () => {
  const { agentStatus } = useNgrokContext();
  const status = agentStatus || { state: 'unknown', connectedAt: '', lastError: '' };
  
  const hasAgentError = Boolean(status.lastError && status.lastError.trim() !== '');
  const hasRequestError = Boolean(status.requestError && status.requestError.trim() !== '');
  
  const shouldShowBanner = hasAgentError || hasRequestError;

  const getErrorTitle = () => {
    if (hasRequestError) {
      return 'Could not connect to docker backend';
    }
    
    switch (status.state) {
      case 'connecting':
        return 'Error connecting to ngrok cloud';
      case 'offline':
        return 'Error connecting to ngrok cloud';
      default:
        return `Unexpected status while in error state (${status.state})`;
    }
  };

  const getErrorMessage = () => {
    if (hasRequestError) {
      return status.requestError;
    }
    return status.lastError;
  };

  return (
    <Collapse in={shouldShowBanner}>
      <Alert 
        severity="error" 
        sx={{ 
          mx: 2, 
          mt: 2,
          borderRadius: 1
        }}
      >
        <AlertTitle>{getErrorTitle()}</AlertTitle>
        {getErrorMessage()}
      </Alert>
    </Collapse>
  );
};

export default ErrorBanner;
