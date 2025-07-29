import React from 'react';
import { Box, Typography, Radio, Link, useTheme } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream';
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { SecondaryText } from './styled';

const ddClient = createDockerDesktopClient();

export type BindingType = 'public' | 'internal' | 'kubernetes';

interface BindingCardProps {
  type: BindingType;
  title: string;
  description: string;
  learnMoreUrl: string;
  selected: boolean;
  onSelect: (type: BindingType) => void;
}

// Kubernetes icon component (simplified)


const BindingCard: React.FC<BindingCardProps> = ({
  type,
  title,
  description,
  learnMoreUrl,
  selected,
  onSelect
}) => {
  const theme = useTheme();
  const getIcon = () => {
    const iconColor = selected ? 'primary.main' : 'text.secondary';
    const iconProps = { sx: { width: 24, height: 24, color: iconColor } };
    
    switch (type) {
      case 'public':
        return <PublicIcon {...iconProps} />;
      case 'internal':
        return <LockIcon {...iconProps} />;
      case 'kubernetes':
        return <SettingsSystemDaydreamIcon {...iconProps} />;
      default:
        return <PublicIcon {...iconProps} />;
    }
  };

  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ddClient.host.openExternal(learnMoreUrl);
  };

  return (
    <Box
      onClick={() => onSelect(type)}
      sx={{
        border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderColor: theme.palette.primary.main
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <Radio
          checked={selected}
          sx={{
            color: theme.palette.text.disabled,
            '&.Mui-checked': {
              color: theme.palette.primary.main,
            },
            p: 0,
            mr: 1.5
          }}
        />
        {getIcon()}
      </Box>
      
      <Typography 
        variant="body2" 
        sx={{ 
          fontWeight: 'medium',
          color: 'text.primary',
          mb: 1,
          fontSize: '14px'
        }}
      >
        {title}
      </Typography>
      
      <SecondaryText 
        sx={{ 
          fontSize: '13px',
          mb: 1.5
        }}
      >
        {description}
      </SecondaryText>
      
      <Link
        component="button"
        variant="caption"
        onClick={handleLearnMoreClick}
        sx={{
          color: selected ? 'primary.main' : 'primary.main',
          fontSize: '12px',
          textDecoration: 'underline',
          cursor: 'pointer',
          p: 0,
          border: 'none',
          background: 'none'
        }}
      >
        Learn More
      </Link>
    </Box>
  );
};

export default BindingCard;
