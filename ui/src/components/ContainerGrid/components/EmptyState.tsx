import { Box, Typography, Button, useTheme } from "@mui/material";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { EmptyStatePanel } from "../../styled";
import ContainerIcon from "../../../assets/container.svg";

const ddClient = createDockerDesktopClient();

interface EmptyStateProps {
  isFiltered?: boolean;
  onRemoveFilter?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ isFiltered = false, onRemoveFilter }) => {
  const theme = useTheme();
  const handleViewContainers = async () => {
    // Navigate to Docker Desktop containers page
    await ddClient.desktopUI.navigate.viewContainers();
  };

  return (
    <EmptyStatePanel>
      {/* Container Icon */}
      <Box
        sx={{
          width: 64,
          height: 64,
          backgroundColor: 'text.disabled',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
          
        }}
      >
        <img
          src={ContainerIcon}
          alt="Container"
          style={{
            width: 32,
            height: 32,
            filter: theme.palette.mode === 'dark' 
              ? 'brightness(0)' // Dark for dark mode
              : 'brightness(0) invert(1)' // Light for light mode
          }}
        />
      </Box>

      {/* Title */}
      <Typography
        variant="h6"
        sx={{
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
            color: 'text.secondary',
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
          textTransform: 'none',
          fontWeight: 500,
          px: 3,
          py: 1,
          mt: isFiltered ? 3 : 0
        }}
      >
        {isFiltered ? 'Show all endpoints' : 'Start a container'}
      </Button>
    </EmptyStatePanel>
  );
};

export default EmptyState;
