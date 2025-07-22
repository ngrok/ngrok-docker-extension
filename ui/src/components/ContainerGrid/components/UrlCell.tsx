import { Box, Typography, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCallback } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface UrlCellProps {
  url: string;
  isOnline: boolean;
}

const UrlCell: React.FC<UrlCellProps> = ({ url, isOnline }) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url);
    ddClient.desktopUI.toast.success('URL copied to clipboard');
  }, [url]);

  const handleUrlClick = useCallback(() => {
    if (isOnline && url) {
      ddClient.host.openExternal(url);
    }
  }, [url, isOnline]);

  if (!url) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        component="button"
        sx={{
          color: isOnline ? '#0055bd' : '#677285',
          fontWeight: isOnline ? 400 : 300,
          textDecoration: isOnline ? 'underline' : 'none',
          cursor: isOnline ? 'pointer' : 'default',
          border: 'none',
          background: 'none',
          padding: 0,
          textAlign: 'left',
          '&:hover': isOnline ? {
            textDecoration: 'underline'
          } : {}
        }}
        onClick={handleUrlClick}
      >
        {url}
      </Typography>
      <IconButton size="small" onClick={handleCopy}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default UrlCell;
