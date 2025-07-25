import React from 'react';
import { Box, Grid, useTheme } from '@mui/material';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import BindingCard from '../BindingCard';
import { SectionTitle } from '../styled';
import { BindingType } from './types';

interface BindingSectionProps {
  selectedBinding: BindingType;
  onBindingChange: (type: BindingType) => void;
}

const BindingSection: React.FC<BindingSectionProps> = ({
  selectedBinding,
  onBindingChange
}) => {
  const theme = useTheme();

  const bindingOptions = [
    {
      type: 'public' as BindingType,
      title: 'Public',
      description: 'Accessible to clients on the internet.',
      learnMoreUrl: 'https://ngrok.com/docs/universal-gateway/public-endpoints/'
    },
    {
      type: 'internal' as BindingType,
      title: 'Internal',
      description: 'Only accessible to clients on your internal network.',
      learnMoreUrl: 'https://ngrok.com/docs/universal-gateway/internal-endpoints/'
    },
    {
      type: 'kubernetes' as BindingType,
      title: 'Kubernetes Operator',
      description: 'Accessible only in clusters where you run the ngrok Kubernetes Operator.',
      learnMoreUrl: 'https://ngrok.com/docs/universal-gateway/kubernetes-endpoints/'
    }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ConnectWithoutContactIcon sx={{ width: 20, height: 20, color: theme.palette.text.secondary, mr: 1 }} />
        <SectionTitle>
          Binding
        </SectionTitle>
      </Box>
      
      <Grid container spacing={1}>
        {bindingOptions.map((option) => (
          <Grid item xs={4} key={option.type}>
            <BindingCard
              type={option.type}
              title={option.title}
              description={option.description}
              learnMoreUrl={option.learnMoreUrl}
              selected={selectedBinding === option.type}
              onSelect={onBindingChange}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BindingSection;
