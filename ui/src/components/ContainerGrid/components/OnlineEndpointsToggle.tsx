import { Box, Typography, Switch } from "@mui/material";
import { useNgrokContext } from "../../NgrokContext";

const OnlineEndpointsToggle: React.FC = () => {
  const { onlineEndpointsOnly, setOnlineEndpointsOnly } = useNgrokContext();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
        Endpoints
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch 
          checked={onlineEndpointsOnly}
          onChange={(e) => setOnlineEndpointsOnly(e.target.checked)}
          size="small"
        />
        <Typography variant="body2" color="text.secondary">
          Show only online endpoints
        </Typography>
      </Box>
    </Box>
  );
};

export default OnlineEndpointsToggle;
