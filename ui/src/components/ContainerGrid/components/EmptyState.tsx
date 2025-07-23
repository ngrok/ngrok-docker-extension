import { Box, Typography, Button } from "@mui/material";
import { AllInbox as ContainerIcon } from "@mui/icons-material";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface EmptyStateProps {
  isFiltered?: boolean;
  onRemoveFilter?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ isFiltered = false, onRemoveFilter }) => {
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
        <ContainerIcon
          sx={{
            fontSize: 32,
            color: 'white'
          }}
        />
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
        {isFiltered ? 'No online endpoints' : 'No containers with ports'}
      </Typography>

      {/* Description - only show for non-filtered state */}
      {!isFiltered && (
        <Typography
          variant="body2"
          sx={{
            color: '#8993a5',
            mb: 3,
            maxWidth: 400
          }}
        >
          The ngrok extension can only forward to running containers with published ports
        </Typography>
      )}

      {/* Action Button */}
      <Button
        variant="contained"
        onClick={isFiltered ? onRemoveFilter : handleViewContainers}
        sx={{
          backgroundColor: '#0055bd',
          color: 'white',
          textTransform: 'none',
          fontWeight: 500,
          px: 3,
          py: 1,
          mt: isFiltered ? 3 : 0,
          '&:hover': {
            backgroundColor: '#003d8a'
          }
        }}
      >
        {isFiltered ? 'Show all endpoints' : 'Start a container'}
      </Button>
    </Box>
  );
};

export default EmptyState;
