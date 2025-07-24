import { Menu, MenuItem } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import LaunchIcon from "@mui/icons-material/Launch";
import DeleteIcon from "@mui/icons-material/Delete";
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
  const { runningEndpoints } = useNgrokContext();
  const runningEndpoint = runningEndpoints[containerId];
  
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
    if (runningEndpoint && isHttpEndpoint(runningEndpoint.url)) {
      const hostname = extractHostname(runningEndpoint.url);
      const inspectorUrl = `https://dashboard.ngrok.com/traffic-inspector?server-name=${hostname}`;
      ddClient.host.openExternal(inspectorUrl);
    }
    onClose();
  };

  const handleViewDashboard = () => {
    if (runningEndpoint) {
      const dashboardUrl = `https://dashboard.ngrok.com/endpoints?q=${encodeURIComponent(runningEndpoint.url)}`;
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
            py: 1
          }
        }
      }}
    >
      <MenuItem onClick={handleEditEndpoint}>
        <EditIcon fontSize="small" />
        Edit Endpoint
      </MenuItem>
      
      {isOnline && isHttpEndpoint(runningEndpoint?.url || '') && (
        <MenuItem onClick={handleViewTrafficInspector}>
          <SearchIcon fontSize="small" />
          View in Traffic Inspector
        </MenuItem>
      )}
      
      {isOnline && (
        <MenuItem onClick={handleViewDashboard}>
          <LaunchIcon fontSize="small" />
          View in ngrok Dashboard
        </MenuItem>
      )}
      
      <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
        <DeleteIcon fontSize="small" />
        Delete
      </MenuItem>
    </Menu>
  );
};

export default MoreActionsMenu;
