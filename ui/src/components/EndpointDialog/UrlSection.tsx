import React from 'react';
import { Box, TextField, Typography, useTheme } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ProtocolWarning from '../ProtocolWarning';
import { SectionTitle, LinkButton } from '../styled';
import { BindingType } from './types';
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface UrlSectionProps {
  binding: BindingType;
  url: string;
  onUrlChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showProtocolWarning: boolean;
  detectedProtocol: string;
  enteredProtocol: string;
}

const UrlSection: React.FC<UrlSectionProps> = ({
  binding,
  url,
  onUrlChange,
  showProtocolWarning,
  detectedProtocol,
  enteredProtocol
}) => {
  const theme = useTheme();

  const getUrlPlaceholder = (binding: BindingType, detectedProtocol: string): string => {
    const baseProtocol = detectedProtocol || 'https';
    switch (binding) {
      case 'internal':
        if (baseProtocol === 'tcp') return 'tcp://foo.internal:1234';
        if (baseProtocol === 'tls') return 'tls://foo.internal:443';
        return 'https://foo.internal';
      case 'kubernetes':
        if (baseProtocol === 'tcp') return 'tcp://foo.bar:1234';
        if (baseProtocol === 'tls') return 'tls://foo.bar:443';
        return 'http://foo.bar';
      case 'public':
      default:
        if (baseProtocol === 'tcp') return 'tcp://';
        if (baseProtocol === 'tls') return 'tls://foo.ngrok.app';
        return 'https://foo.ngrok.app';
    }
  };

  const openExternalLink = (url: string) => {
    ddClient.host.openExternal(url);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LinkIcon sx={{ width: 20, height: 20, color: theme.palette.text.secondary, mr: 1 }} />
        <SectionTitle>
          URL
        </SectionTitle>
      </Box>
      
      <TextField
        placeholder={getUrlPlaceholder(binding, detectedProtocol)}
        value={url}
        onChange={onUrlChange}
        fullWidth
        size="small"
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            backgroundColor: theme.palette.background.paper,
            '& fieldset': {
              borderColor: theme.palette.divider,
              borderWidth: '1.5px'
            },
            '&:hover fieldset': {
              borderColor: '#116ed0'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#116ed0'
            }
          },
          '& .MuiOutlinedInput-input': {
            padding: '8px 16px',
            height: '24px'
          }
        }}
      />
      
      <ProtocolWarning
        visible={showProtocolWarning}
        detectedProtocol={detectedProtocol}
        enteredProtocol={enteredProtocol}
      />
      
      <Typography 
        variant="body2" 
        sx={{ 
          color: theme.palette.text.secondary,
          fontSize: '13px',
          lineHeight: 1.4,
          mb: 0.5
        }}
      >
        Leave blank to auto-generate a random URL.
      </Typography>
      
      <LinkButton onClick={() => openExternalLink('https://ngrok.com/docs/universal-gateway/bindings/')}>
        Learn more
      </LinkButton>
    </Box>
  );
};

export default UrlSection;
