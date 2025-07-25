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
      position: 'relative', 
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center'
    }}>
      <Box
        component="button"
        sx={{
          fontSize: 14,
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
          width: 'calc(100% - 32px)', // Reserve space for the copy button
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
          position: 'absolute',
          right: -8, // Position slightly outside the cell to avoid clipping
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          width: 28,
          height: 28,
          zIndex: 10, // Ensure it appears above other content
          '.MuiDataGrid-row:hover &': {
            opacity: 1
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default UrlCell;
