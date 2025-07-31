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
  const isAssignedWhenStarted = url === '<assigned-when-started>';
  
  const handleCopy = useCallback(() => {
    if (isAssignedWhenStarted) return; // Don't copy placeholder text
    navigator.clipboard.writeText(url);
    ddClient.desktopUI.toast.success('URL copied to clipboard');
  }, [url, isAssignedWhenStarted]);

  const handleUrlClick = useCallback(() => {
    if (isOnline && url && !isAssignedWhenStarted) {
      ddClient.host.openExternal(url);
    }
  }, [url, isOnline, isAssignedWhenStarted]);

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
            color: isAssignedWhenStarted ? 'text.disabled' : (isOnline ? 'primary.main' : 'text.primary'),
            fontWeight: isOnline ? 500 : 400,
            fontStyle: isAssignedWhenStarted ? 'italic' : 'normal',
            textDecoration: isOnline && !isAssignedWhenStarted ? 'underline' : 'none',
            cursor: (isOnline && !isAssignedWhenStarted) ? 'pointer' : 'default',
            border: 'none',
            background: 'none',
            padding: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0, // Allow text to shrink when needed
            '&:hover': (isOnline && !isAssignedWhenStarted) ? {
              textDecoration: 'underline'
            } : {}
          }}
          onClick={handleUrlClick}
        >
          {url}
        </Box>
        {!isAssignedWhenStarted && (
          <IconButton 
            size="small" 
            onClick={handleCopy}
            sx={{
              opacity: 0,
              width: 24,
              height: 24,
              flexShrink: 0,
              transition: 'opacity 0.2s ease',
              '.MuiDataGrid-row:hover &': {
                opacity: 1,
              }
            }}
          >
            <ContentCopyIcon sx={{fontSize: '16px'}} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default UrlCell;
