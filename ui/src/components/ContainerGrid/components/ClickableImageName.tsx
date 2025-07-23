import { Typography } from "@mui/material";
import { useCallback } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface ClickableImageNameProps {
  image: string;
  isOnline: boolean;
}

const ClickableImageName: React.FC<ClickableImageNameProps> = ({ image, isOnline }) => {
  // Function to trim hostname prefix from image name for display
  const getDisplayImageName = (fullImageName: string): string => {
    // Remove registry hostname prefixes like "docker.io/", "ghcr.io/", etc.
    const withoutRegistry = fullImageName.replace(/^[a-zA-Z0-9.-]+\.(com|io|org|net)\//, '');
    // Remove "library/" prefix for official Docker images
    return withoutRegistry.replace(/^library\//, '');
  };

  const handleClick = useCallback(async () => {
    try {
      // Navigate to image detail page
      // Parse image name and tag (format: name:tag or name@digest)
      const [imageName, imageTag = 'latest'] = image.includes(':') && !image.includes('://') 
        ? image.split(':') 
        : [image, 'latest'];
      await ddClient.desktopUI.navigate.viewImage(imageName, imageTag);
    } catch (error) {
      console.error('Failed to navigate to image:', error);
    }
  }, [image]);

  return (
    <Typography
      component="button"
      variant="body2"
      sx={{
        color: '#000000',
        fontWeight: isOnline ? 500 : 400,
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
      {getDisplayImageName(image)}
    </Typography>
  );
};

export default ClickableImageName;
