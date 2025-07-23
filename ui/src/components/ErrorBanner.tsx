import { Alert, AlertTitle, Collapse } from "@mui/material";
import { useNgrokContext } from "./NgrokContext";

const ErrorBanner: React.FC = () => {
  const { agentStatus } = useNgrokContext();
  
  const hasAgentError = Boolean(agentStatus.lastError && agentStatus.lastError.trim() !== '');
  const hasRequestError = Boolean(agentStatus.requestError && agentStatus.requestError.trim() !== '');
  
  const shouldShowBanner = (hasAgentError && agentStatus.status === 'reconnecting') || 
    (hasRequestError && agentStatus.status === 'unknown');

  const getErrorTitle = () => {
    switch (agentStatus.status) {
      case 'reconnecting':
        return 'Connection Lost - Reconnecting...';
      case 'unknown':
        return 'Could not connect to docker backend';
      default:
        return `Unexpected error status: ${agentStatus.status}`;
    }
  };

  const getErrorMessage = () => {
    if (agentStatus.status === 'unknown' && hasRequestError) {
      return agentStatus.requestError;
    }
    return agentStatus.lastError;
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
