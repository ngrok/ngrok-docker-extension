import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import DockerIcon from '@mui/icons-material/ViewModule';
import ContainerIcon from '@mui/icons-material/AllInbox';
import { ContainerInfo as ContainerInfoType } from './types';

interface ContainerInfoProps {
  containerInfo: ContainerInfoType;
}

const ContainerInfo: React.FC<ContainerInfoProps> = ({ containerInfo }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <DockerIcon sx={{ width: 16, height: 16, color: theme.palette.text.secondary }} />
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '14px' }}>
          {containerInfo.imageName}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ContainerIcon sx={{ width: 16, height: 16, color: theme.palette.text.secondary }} />
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '14px' }}>
          {containerInfo.containerName}
        </Typography>
      </Box>
    </Box>
  );
};

export default ContainerInfo;
