import { Typography } from "@mui/material";
import { useCallback } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface ClickableImageNameProps {
    image: string;
    imageId: string;
    isOnline: boolean;
}

const ClickableImageName: React.FC<ClickableImageNameProps> = ({ image, imageId, isOnline }) => {
    // Function to trim hostname prefix from image name for display
    const getDisplayImageName = (fullImageName: string): string => {
        // Remove registry hostname prefixes like "docker.io/", "ghcr.io/", etc.
        const withoutRegistry = fullImageName.replace(/^[a-zA-Z0-9.-]+\.(com|io|org|net)\//, '');
        // Remove "library/" prefix for official Docker images
        return withoutRegistry.replace(/^library\//, '');
    };

    const handleClick = useCallback(async () => {
        try {
            if (!imageId) {
                return;
            }

            const [, imageTag = 'latest'] = image.includes(':') && !image.includes('://')
                ? image.split(':')
                : [image, 'latest'];

            await ddClient.desktopUI.navigate.viewImage(imageId, imageTag);
        } catch (error) {
            console.error('Failed to navigate to image:', error);
        }
    }, [image, imageId]);

    return (
        <Typography
            component="button"
            variant="body2"
            sx={{
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
