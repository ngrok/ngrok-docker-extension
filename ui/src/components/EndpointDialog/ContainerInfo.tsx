import React from 'react';
import DockerIcon from '@mui/icons-material/ViewModule';
import ContainerIcon from '@mui/icons-material/AllInbox';
import { ContainerInfo as ContainerInfoType } from './types';
import { SecondaryText, IconTiny, IconSecondary, FlexRowGap05, FlexRowGap2 } from '../styled';

interface ContainerInfoProps {
  containerInfo: ContainerInfoType;
}

const ContainerInfo: React.FC<ContainerInfoProps> = ({ containerInfo }) => {

  return (
    <FlexRowGap2 sx={{ mt: 1 }}>
      <FlexRowGap05>
        <IconTiny>
          <IconSecondary>
            <DockerIcon />
          </IconSecondary>
        </IconTiny>
        <SecondaryText variant="body2">
          {containerInfo.imageName}
        </SecondaryText>
      </FlexRowGap05>
      <FlexRowGap05>
        <IconTiny>
          <IconSecondary>
            <ContainerIcon />
          </IconSecondary>
        </IconTiny>
        <SecondaryText variant="body2">
          {containerInfo.containerName}
        </SecondaryText>
      </FlexRowGap05>
    </FlexRowGap2>
  );
};

export default ContainerInfo;
