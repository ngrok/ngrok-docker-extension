import { Typography } from "@mui/material";
import { useCallback } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface ClickableContainerNameProps {
  name: string;
  containerId: string;
  isOnline: boolean;
}

const ClickableContainerName: React.FC<ClickableContainerNameProps> = ({ 
  name, 
  containerId, 
  isOnline 
}) => {
  const handleClick = useCallback(async () => {
    // Navigate to container detail page
    await ddClient.desktopUI.navigate.viewContainer(containerId);
  }, [containerId]);

  return (
    <Typography
      component="button"
      variant="body2"
      sx={{
        color: isOnline ? '#000000' : '#677285',
        fontWeight: isOnline ? 400 : 300,
        textDecoration: 'none',
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: 0,
        textAlign: 'left',
        '&:hover': {
          textDecoration: 'underline'
        }
      }}
      onClick={handleClick}
    >
      {name}
    </Typography>
  );
};

export default ClickableContainerName;
