import React from 'react';
import { Box, Typography, Radio, Link, useTheme, SvgIcon } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
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

// Kubernetes icon component
const KubernetesIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <SvgIcon sx={sx} viewBox="0 0 18 18" fill="currentColor">
      <path d="M10.503 10.146a.289.289 0 0 0-.178.024.29.29 0 0 0-.141.377l-.002.003.667 1.612a3.405 3.405 0 0 0 1.376-1.729l-1.719-.29-.003.003Zm-2.675.229a.291.291 0 0 0-.336-.222l-.003-.003-1.704.289a3.418 3.418 0 0 0 1.372 1.717l.66-1.596-.005-.006a.288.288 0 0 0 .016-.18ZM9.256 11a.29.29 0 0 0-.513.001H8.74l-.838 1.515a3.413 3.413 0 0 0 2.199.002L9.262 11h-.006Zm2.653-3.52-1.29 1.154v.004a.29.29 0 0 0 .115.5l.002.007 1.67.481a3.463 3.463 0 0 0-.497-2.146Zm-2.396.13a.291.291 0 0 0 .463.222l.005.002 1.41-1a3.43 3.43 0 0 0-1.977-.954l.098 1.729h.001Zm-1.494.228a.291.291 0 0 0 .462-.223l.007-.003.098-1.732a3.4 3.4 0 0 0-1.99.953l1.42 1.007.003-.002Zm-.757 1.309a.291.291 0 0 0 .114-.5l.002-.008L6.08 7.48A3.4 3.4 0 0 0 5.6 9.633l1.662-.48v-.005Zm1.26.509.477.23.477-.23.119-.514-.33-.413h-.531l-.331.412.118.515Z"></path><path d="m16.906 10.67-1.363-5.92a1.066 1.066 0 0 0-.57-.71L9.456 1.408a1.063 1.063 0 0 0-.916 0L3.025 4.042a1.064 1.064 0 0 0-.57.71l-1.361 5.92a1.041 1.041 0 0 0 .038.588 1.023 1.023 0 0 0 .165.297l3.817 4.746a1.053 1.053 0 0 0 .556.357c.088.024.178.037.27.037l6.121-.001a.99.99 0 0 0 .266-.036c.037-.01.073-.021.108-.035a1.088 1.088 0 0 0 .45-.322l3.817-4.748a1.033 1.033 0 0 0 .204-.43 1.04 1.04 0 0 0 0-.455Zm-5.722 2.303c.016.045.034.09.055.133a.259.259 0 0 0-.026.195c.08.184.179.36.293.524.064.084.123.172.177.263.014.025.03.063.043.089a.331.331 0 1 1-.596.282l-.041-.085c-.038-.099-.07-.2-.096-.302a3.072 3.072 0 0 0-.227-.555.26.26 0 0 0-.168-.103l-.07-.127a4.273 4.273 0 0 1-3.047-.007l-.075.135a.268.268 0 0 0-.142.07 2.31 2.31 0 0 0-.256.592 2.73 2.73 0 0 1-.095.303l-.041.084v.001a.331.331 0 1 1-.597-.283l.042-.088a2.74 2.74 0 0 1 .177-.264c.117-.17.217-.35.3-.537a.328.328 0 0 0-.03-.187l.06-.144a4.296 4.296 0 0 1-1.904-2.377l-.144.024a.366.366 0 0 0-.19-.066c-.197.037-.39.094-.575.169a2.798 2.798 0 0 1-.296.113c-.024.007-.059.013-.086.02l-.006.002h-.005a.332.332 0 1 1-.147-.643l.005-.001.003-.001c.027-.007.063-.016.088-.02.105-.015.21-.024.317-.026.2-.013.398-.046.591-.097a.457.457 0 0 0 .142-.143l.139-.04a4.272 4.272 0 0 1 .673-2.98l-.106-.094a.367.367 0 0 0-.066-.19 3.08 3.08 0 0 0-.49-.345 2.76 2.76 0 0 1-.275-.16l-.068-.055-.005-.004a.35.35 0 0 1-.081-.486.318.318 0 0 1 .263-.117.393.393 0 0 1 .23.087l.073.058c.077.073.15.15.218.231.135.148.284.283.445.402a.26.26 0 0 0 .196.02l.119.084a4.247 4.247 0 0 1 2.754-1.324l.008-.14a.36.36 0 0 0 .107-.17c.007-.2-.005-.401-.037-.6a2.774 2.774 0 0 1-.045-.313l.001-.085v-.01a.332.332 0 1 1 .66 0c0 .03.001.068 0 .094-.009.106-.024.21-.045.314a3.092 3.092 0 0 0-.037.6.262.262 0 0 0 .108.164c0 .024.005.104.008.148a4.327 4.327 0 0 1 2.74 1.324l.126-.09a.367.367 0 0 0 .2-.022c.16-.12.31-.254.445-.402.068-.081.14-.158.218-.231.02-.018.05-.04.073-.058a.332.332 0 1 1 .412.516c-.023.018-.052.043-.073.058a2.73 2.73 0 0 1-.275.16 3.09 3.09 0 0 0-.49.345.261.261 0 0 0-.063.187l-.117.105c.586.873.83 1.93.688 2.972l.134.038a.37.37 0 0 0 .142.144c.194.051.392.084.592.097.106.002.211.011.316.025.028.005.068.017.097.023a.331.331 0 1 1-.147.643h-.005l-.007-.003c-.027-.005-.061-.011-.085-.018-.1-.032-.2-.07-.296-.114a3.084 3.084 0 0 0-.576-.17.262.262 0 0 0-.185.07 5.202 5.202 0 0 0-.14-.025 4.296 4.296 0 0 1-1.904 2.394Z"></path>
  </SvgIcon>
);

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
        return <KubernetesIcon {...iconProps} />;
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
        backgroundColor: selected ? `${theme.palette.docker.blue[100]}`: `${theme.palette.background.paper}`,
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.docker.blue[100],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, flexDirection: 'row', justifyContent: 'space-between',
 }}>
        {getIcon()}
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
