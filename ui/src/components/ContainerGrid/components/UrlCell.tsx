import { Box, IconButton } from "@mui/material";

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
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
    }}>
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <Box
          component="button"
          sx={{
            fontSize: 13,
            color: isOnline ? 'primary.main' : 'text.primary',
            fontWeight: isOnline ? 500 : 400,
            textDecoration: isOnline ? 'underline' : 'none',
            cursor: isOnline ? 'pointer' : 'default',
            border: 'none',
            background: 'none',
            padding: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0, // Allow text to shrink when needed
            '&:hover': isOnline ? {
              textDecoration: 'underline'
            } : {}
          }}
          onClick={handleUrlClick}
        >
          {url}
        </Box>
        <IconButton 
          size="small" 
          onClick={handleCopy}
          sx={{
            opacity: 1,
            width: 24,
            height: 24,
            flexShrink: 0,
          }}
        >
          <ContentCopyIcon fontSize="xs" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default UrlCell;
