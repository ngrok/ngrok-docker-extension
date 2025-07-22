import { Box, Typography, Button } from "@mui/material";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

const EmptyState: React.FC = () => {
  const handleViewContainers = async () => {
    // Navigate to Docker Desktop containers page
    await ddClient.desktopUI.navigate.viewContainers();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        backgroundColor: '#f9f9fa',
        borderRadius: '8px',
        p: 4
      }}
    >
      {/* Container Icon */}
      <Box
        sx={{
          width: 64,
          height: 64,
          backgroundColor: '#8993a5',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 8H4V6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2zm0 2v8c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-8h16zM8 14h8v2H8v-2z"
            fill="white"
          />
        </svg>
      </Box>

      {/* Title */}
      <Typography
        variant="h6"
        sx={{
          color: '#000000',
          fontWeight: 600,
          mb: 1
        }}
      >
        No Containers With Ports
      </Typography>

      {/* Description */}
      <Typography
        variant="body2"
        sx={{
          color: '#8993a5',
          mb: 3,
          maxWidth: 400
        }}
      >
        The <strong>ngrok</strong> extension can only run on containers with open ports.
      </Typography>

      {/* Action Button */}
      <Button
        variant="contained"
        onClick={handleViewContainers}
        sx={{
          backgroundColor: '#0055bd',
          color: 'white',
          textTransform: 'none',
          fontWeight: 500,
          px: 3,
          py: 1,
          '&:hover': {
            backgroundColor: '#003d8a'
          }
        }}
      >
        View containers
      </Button>
    </Box>
  );
};

export default EmptyState;
