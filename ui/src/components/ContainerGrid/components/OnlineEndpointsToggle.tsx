import { Typography, Switch, useTheme } from "@mui/material";
import { useNgrokContext } from "../../NgrokContext";
import { FlexRow, FlexRowGap2 } from "../../styled";

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
    <FlexRowGap2 sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
        Endpoints
      </Typography>
      {!shouldHideSwitch && (
        <FlexRow>
          <Switch 
          sx={{
            marginRight: '4px'
          }}
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
            Show only off endpoints
          </Typography>
        </FlexRow>
      )}
    </FlexRowGap2>
  );
};

export default OnlineEndpointsToggle;
