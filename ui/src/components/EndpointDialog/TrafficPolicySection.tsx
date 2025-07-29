import React from 'react';
import { Box, TextField, Typography, useTheme } from '@mui/material';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { SectionTitle, LinkButton, IconSmall, IconSecondary, FlexRow } from '../styled';
import { createDockerDesktopClient } from "@docker/extension-api-client";


const ddClient = createDockerDesktopClient();

interface TrafficPolicySectionProps {
  trafficPolicy: string;
  onTrafficPolicyChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  showTitle?: boolean;
}

const TrafficPolicySection: React.FC<TrafficPolicySectionProps> = ({
  trafficPolicy,
  onTrafficPolicyChange,
  showTitle = true
}) => {
  const theme = useTheme();

  const openExternalLink = (url: string) => {
    ddClient.host.openExternal(url);
  };

  return (
    <Box sx={{ mb: showTitle ? 3 : 0 }}>
      {showTitle && (
        <FlexRow sx={{ mb: 2 }}>
          <IconSmall sx={{ mr: 1 }}>
            <IconSecondary>
              <ManageSearchIcon />
            </IconSecondary>
          </IconSmall>
          <SectionTitle>
            Traffic Policy
          </SectionTitle>
        </FlexRow>
      )}
      
      <Typography 
        variant="body2" 
        sx={{ 
          color: theme.palette.text.secondary,
          lineHeight: 1.4,
          mb: 1
        }}
      >
        <Box component="span" sx={{ fontWeight: 'medium' }}>ngrok's</Box>{' '}
        <Box component="span" sx={{ fontWeight: 'medium' }}>Traffic Policy</Box>{' '}
        is a configuration language for controlling traffic to your applications.
      </Typography>
      
      <TextField
        value={trafficPolicy}
        onChange={onTrafficPolicyChange}
        placeholder={`on_http_request:
  - actions:
    - type: basic-auth
      config:
        credentials:
          username:example-password`}
        fullWidth
        multiline
        rows={10}
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            backgroundColor: theme.palette.background.paper,
            fontFamily: 'Roboto Mono, monospace',
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
            fontSize: 12,
            fontFamily: 'Roboto Mono, monospace',
          }
        }}
      />
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <LinkButton onClick={() => openExternalLink('https://ngrok.com/docs/traffic-policy/')}>
          Learn more
        </LinkButton>
        
        <LinkButton onClick={() => openExternalLink('https://ngrok.com/docs/traffic-policy/examples/')}>
          View example gallery
        </LinkButton>
      </Box>
    </Box>
  );
};

export default TrafficPolicySection;
