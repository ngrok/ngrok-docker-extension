import React from 'react';
import { Box, TextField, Typography, useTheme } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ProtocolWarning from '../ProtocolWarning';
import { SectionTitle, LinkButton, IconSmall, FlexRow, IconSecondary } from '../styled';
import { BindingType } from './types';
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface UrlSectionProps {
  binding: BindingType;
  url: string;
  onUrlChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showProtocolWarning: boolean;
  warningData: {
    severity: 'error' | 'warning' | 'info';
    primary: string;
    secondary: string;
  } | null;
  detectedProtocol: string;
  enteredProtocol: string;
}

const UrlSection: React.FC<UrlSectionProps> = ({
  binding,
  url,
  onUrlChange,
  showProtocolWarning,
  warningData,
  detectedProtocol,
  enteredProtocol
}) => {
  const theme = useTheme();

  const getUrlPlaceholder = (binding: BindingType, detectedProtocol: string): string => {
    const baseProtocol = detectedProtocol || 'https';

    
    let placeholder: string;
    switch (binding) {
      case 'internal':
        if (baseProtocol === 'tcp') placeholder = 'tcp://foo.internal:1234';
        else if (baseProtocol === 'tls') placeholder = 'tls://foo.internal:443';
        else placeholder = 'https://foo.internal';
        break;
      case 'kubernetes':
        if (baseProtocol === 'tcp') placeholder = 'tcp://foo.bar:1234';
        else if (baseProtocol === 'tls') placeholder = 'tls://foo.bar:443';
        else placeholder = 'http://foo.bar';
        break;
      case 'public':
      default:
        if (baseProtocol === 'tcp') placeholder = 'tcp://';
        else if (baseProtocol === 'tls') placeholder = 'tls://foo.ngrok.app';
        else placeholder = 'https://foo.ngrok.app';
        break;
    }
    

    return placeholder;
  };

  const openExternalLink = (url: string) => {
    ddClient.host.openExternal(url);
  };

  return (
    <Box sx={{ mb: 1 }}>
      <FlexRow sx={{ mb: 2 }}>
        <IconSmall sx={{ mr: 1 }}>
          <IconSecondary>
            <LinkIcon />
          </IconSecondary>
        </IconSmall>
        <SectionTitle>
          URL
        </SectionTitle>
      </FlexRow>

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
        warningData={warningData}
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
