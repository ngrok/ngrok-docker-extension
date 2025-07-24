import { Box, Typography, Switch, useTheme } from "@mui/material";
import { useNgrokContext } from "../../NgrokContext";

interface OnlineEndpointsToggleProps {
  hasContainersWithPorts?: boolean;
}

const OnlineEndpointsToggle: React.FC<OnlineEndpointsToggleProps> = ({ 
  hasContainersWithPorts = true 
}) => {
  const { onlineEndpointsOnly, setOnlineEndpointsOnly } = useNgrokContext();
  const theme = useTheme();

  // Hide the switch when empty state is active AND switch is off
  const shouldHideSwitch = !hasContainersWithPorts && !onlineEndpointsOnly;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
        Endpoints
      </Typography>
      {!shouldHideSwitch && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Switch 
            checked={onlineEndpointsOnly}
            onChange={(e) => setOnlineEndpointsOnly(e.target.checked)}
            size="small"
          />
          <Typography 
            variant="body2" 
            sx={{
              color: onlineEndpointsOnly 
                ? (theme.palette.mode === 'dark' ? '#ffffff' : '#116ED0')
                : '#677285'
            }}
          >
            Show only online endpoints
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default OnlineEndpointsToggle;
