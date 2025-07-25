import { Typography, Box, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import PowerOffIcon from "@mui/icons-material/PowerOff";

const ddClient = createDockerDesktopClient();

interface ClickableContainerNameProps {
  name: string;
  containerId: string;
  isOnline: boolean;
  isDeleted?: boolean;
  hasEndpointConfig?: boolean;
  isContainerRunning?: boolean;
}

const ClickableContainerName: React.FC<ClickableContainerNameProps> = ({ 
  name, 
  containerId, 
  isOnline,
  isDeleted = false,
  hasEndpointConfig = false,
  isContainerRunning = true
}) => {
  const handleClick = useCallback(async () => {
    if (isDeleted) return; // Don't navigate for deleted containers
    // Navigate to container detail page
    await ddClient.desktopUI.navigate.viewContainer(containerId);
  }, [containerId, isDeleted]);

  const showPowerOffIcon = hasEndpointConfig && !isContainerRunning && !isDeleted;
  


  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        minWidth: 0 // Allow shrinking
      }}
    >
      <Typography
        component={isDeleted ? "span" : "button"}
        variant="body2"
        sx={{
          fontWeight: isOnline ? 500 : 400,
          textDecoration: 'none',
          cursor: isDeleted ? 'default' : 'pointer',
          border: 'none',
          background: 'none',
          padding: 0,
          textAlign: 'left',
          color: isDeleted ? 'text.disabled' : 'inherit',
          fontStyle: isDeleted ? 'italic' : 'normal',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0, // Allow shrinking
          flexGrow: 1,
          marginRight: showPowerOffIcon ? 1 : 0,
          '&:hover': {
            textDecoration: isDeleted ? 'none' : 'underline'
          }
        }}
        onClick={isDeleted ? undefined : handleClick}
      >
        {name}
      </Typography>
      {showPowerOffIcon && (
        <Tooltip title="Container Offline">
          <PowerOffIcon 
            sx={{ 
              fontSize: 16, 
              color: 'text.secondary',
              flexShrink: 0 // Don't shrink the icon
            }} 
          />
        </Tooltip>
      )}
    </Box>
  );
};

export default ClickableContainerName;
