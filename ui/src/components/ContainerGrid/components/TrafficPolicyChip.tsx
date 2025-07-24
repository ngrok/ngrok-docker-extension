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
        height: 20,
        borderRadius: 4,
        backgroundColor: chipColor,
        color: textColor,
        fontWeight: 500,
        fontSize: 10,
        textTransform: 'uppercase',
        opacity: isOnline ? 1 : 0.6,
        '& .MuiChip-label': {
          padding: '0 6px'
        }
      }}
    />
  );
};

export default TrafficPolicyChip;
