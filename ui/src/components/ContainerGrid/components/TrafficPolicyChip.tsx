import { Chip } from "@mui/material";

interface TrafficPolicyChipProps {
  enabled: boolean;
  isOnline: boolean;
}

const TrafficPolicyChip: React.FC<TrafficPolicyChipProps> = ({ enabled, isOnline }) => {
  const chipColor = enabled ? '#e6f5f3' : '#dcdee0';
  const textColor = enabled ? '#2e7f74' : '#677285';
  
  return (
    <Chip
      label={enabled ? 'YES' : 'NO'}
      size="small"
      sx={{
        backgroundColor: chipColor,
        color: textColor,
        fontWeight: 500,
        fontSize: '10px',
        textTransform: 'uppercase',
        opacity: isOnline ? 1 : 0.6,
        '& .MuiChip-label': {
          padding: '2px 4px'
        }
      }}
    />
  );
};

export default TrafficPolicyChip;
