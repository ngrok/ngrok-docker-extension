import { Menu, MenuItem, useTheme } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/Edit";
import ManageSearchIcon from "@mui/icons-material/Search";
import LaunchIcon from "@mui/icons-material/Launch";
import DeleteOutlinedIcon from "@mui/icons-material/Delete";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { useNgrokContext } from "../../NgrokContext";

const ddClient = createDockerDesktopClient();

interface MoreActionsMenuProps {
  containerId: string;
  isOnline: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEditEndpoint: () => void;
  onDeleteEndpoint: () => void;
}

const MoreActionsMenu: React.FC<MoreActionsMenuProps> = ({ 
  containerId, 
  isOnline, 
  anchorEl, 
  onClose,
  onEditEndpoint,
  onDeleteEndpoint
}) => {
  const theme = useTheme();
  const { apiEndpoints } = useNgrokContext();
  const endpoint = apiEndpoints.find(ep => ep.id === containerId);
  const runningEndpoint = endpoint?.status.state === "online" ? endpoint : null;
  
  const isHttpEndpoint = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const extractHostname = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };

  const handleEditEndpoint = () => {
    onEditEndpoint();
    onClose();
  };

  const handleViewTrafficInspector = () => {
    const url = runningEndpoint?.status.url;
    if (url && isHttpEndpoint(url)) {
      const hostname = extractHostname(url);
      const inspectorUrl = `https://dashboard.ngrok.com/traffic-inspector?server-name=${hostname}`;
      ddClient.host.openExternal(inspectorUrl);
    }
    onClose();
  };

  const handleViewDashboard = () => {
    const url = runningEndpoint?.status.url;
    if (url) {
      const dashboardUrl = `https://dashboard.ngrok.com/endpoints?q=${encodeURIComponent(url)}`;
      ddClient.host.openExternal(dashboardUrl);
    }
    onClose();
  };

  const handleDelete = () => {
    onDeleteEndpoint();
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        elevation: 3,
        sx: {
          minWidth: 200,
          '& .MuiMenuItem-root': {
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1,
            fontSize: theme.typography.caption.fontSize,
            color: theme.palette.docker.grey[700]
          }
        }
      }}
    >
      <MenuItem onClick={handleEditEndpoint}>
        <EditOutlinedIcon fontSize="small" sx={{ color: theme.palette.docker.grey[500] }} />
        Edit Endpoint
      </MenuItem>
      
      {isOnline && isHttpEndpoint(runningEndpoint?.status.url || '') && (
        <MenuItem onClick={handleViewTrafficInspector}>
          <ManageSearchIcon fontSize="small" sx={{ color: theme.palette.docker.grey[500] }} />
          View in Traffic Inspector!
        </MenuItem>
      )}
      
      {isOnline && (
        <MenuItem onClick={handleViewDashboard}>
          <LaunchIcon fontSize="small" sx={{ color: theme.palette.docker.grey[500] }} />
          View in ngrok Dashboard
        </MenuItem>
      )}
      
      <MenuItem onClick={handleDelete} >
        <DeleteOutlinedIcon fontSize="small" sx={{ color: theme.palette.docker.grey[500] }} />
        Delete
      </MenuItem>
    </Menu>
  );
};

export default MoreActionsMenu;
