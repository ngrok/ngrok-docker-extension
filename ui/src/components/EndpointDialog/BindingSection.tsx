import React from 'react';
import { Box, Grid } from '@mui/material';
import CommitIcon from '@mui/icons-material/Commit';
import BindingCard from '../BindingCard';
import { SectionTitle, IconSmall, FlexRow, IconSecondary } from '../styled';
import { BindingType } from './types';


interface BindingSectionProps {
  selectedBinding: BindingType;
  onBindingChange: (type: BindingType) => void;
}

const BindingSection: React.FC<BindingSectionProps> = ({
  selectedBinding,
  onBindingChange
}) => {
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
      description: 'Accessible in clustersrun the ngrok Kubernetes Operator.',
      learnMoreUrl: 'https://ngrok.com/docs/universal-gateway/kubernetes-endpoints/'
    }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <FlexRow sx={{ mb: 2 }}>
        <IconSmall sx={{ mr: 1 }}>
          <IconSecondary>
            <CommitIcon />
          </IconSecondary>
        </IconSmall>
        <SectionTitle>
          Binding
        </SectionTitle>
      </FlexRow>

      <Grid container spacing={2}>
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
