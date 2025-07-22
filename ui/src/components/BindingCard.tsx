import React from 'react';
import { Box, Typography, Radio, Link } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { createDockerDesktopClient } from "@docker/extension-api-client";

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
const KubernetesIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Box 
    component="svg" 
    viewBox="0 0 24 24" 
    sx={{ width: 24, height: 24, fill: 'currentColor', ...sx }}
  >
    <path d="M10.204 14.35l.007-.01-.999-2.413a.68.68 0 0 0-.444-.456l-2.582-.71.002-.005-.002-.005 2.582-.71a.68.68 0 0 0 .444-.456l.999-2.413-.007-.01L11.06 6.9l.999 2.413a.68.68 0 0 0 .444.456l2.582.71-.002.005.002.005-2.582.71a.68.68 0 0 0-.444.456l-.999 2.413.007.01L10.204 14.35zM12 2l1.09 3.09L16 4.18l-1.91 2.73L17 8l-2.91 1.09L15 12l-3.09-1.09L12 14l-.91-3.09L8 12l.91-3.09L6 8l2.91-1.09L7 4.18l2.91.91L12 2z"/>
  </Box>
);

const BindingCard: React.FC<BindingCardProps> = ({
  type,
  title,
  description,
  learnMoreUrl,
  selected,
  onSelect
}) => {
  const getIcon = () => {
    switch (type) {
      case 'public':
        return <PublicIcon sx={{ width: 24, height: 24, color: selected ? '#116ed0' : '#677285' }} />;
      case 'internal':
        return <LockIcon sx={{ width: 24, height: 24, color: selected ? '#116ed0' : '#677285' }} />;
      case 'kubernetes':
        return <KubernetesIcon sx={{ width: 24, height: 24, color: selected ? '#116ed0' : '#677285' }} />;
      default:
        return <PublicIcon sx={{ width: 24, height: 24, color: selected ? '#116ed0' : '#677285' }} />;
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
        border: selected ? '2px solid #116ed0' : '1px solid #d1d4db',
        borderRadius: 1,
        backgroundColor: selected ? '#e5f2fc' : '#ffffff',
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderColor: selected ? '#116ed0' : '#116ed0'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <Radio
          checked={selected}
          sx={{
            color: '#d1d4db',
            '&.Mui-checked': {
              color: '#116ed0',
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
          color: '#000000',
          mb: 1,
          fontSize: '14px'
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body2" 
        sx={{ 
          color: '#677285',
          fontSize: '13px',
          lineHeight: 1.4,
          mb: 1.5
        }}
      >
        {description}
      </Typography>
      
      <Link
        component="button"
        variant="caption"
        onClick={handleLearnMoreClick}
        sx={{
          color: '#086dd7',
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
