import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  Typography,
  Box,
  IconButton,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EndpointForm, ContainerInfo } from './EndpointDialog';
import { StepOneConfig, StepTwoConfig, ContainerInfo as ContainerInfoType, EndpointConfiguration } from './EndpointDialog/types';
import { useNgrokContext } from './NgrokContext';
import { DialogContentPanel, DialogActionsPanel } from './styled';

interface EditEndpointDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => void;
  containerInfo: ContainerInfoType;
  existingConfig: EndpointConfiguration;
  isEndpointOnline: boolean;
}

const EditEndpointDialog: React.FC<EditEndpointDialogProps> = ({
  open,
  onClose,
  onComplete,
  containerInfo,
  existingConfig,
  isEndpointOnline
}) => {
  const theme = useTheme();
  const {} = useNgrokContext();
  
  const [stepOneConfig, setStepOneConfig] = useState<StepOneConfig>({
    binding: existingConfig.binding,
    url: existingConfig.url || '',
    additionalOptions: {
      poolingEnabled: existingConfig.poolingEnabled,
      description: existingConfig.description || '',
      metadata: existingConfig.metadata || ''
    }
  });
  
  const [stepTwoConfig, setStepTwoConfig] = useState<StepTwoConfig>({
    trafficPolicy: existingConfig.trafficPolicy || ''
  });

  const [originalConfig, setOriginalConfig] = useState<{stepOne: StepOneConfig, stepTwo: StepTwoConfig}>();
  const [hasChanges, setHasChanges] = useState(false);

  // Set initial values when dialog opens or config changes
  useEffect(() => {
    if (open) {
      const initialStepOne: StepOneConfig = {
        binding: existingConfig.binding,
        url: existingConfig.url || '',
        additionalOptions: {
          poolingEnabled: existingConfig.poolingEnabled,
          description: existingConfig.description || '',
          metadata: existingConfig.metadata || ''
        }
      };
      
      const initialStepTwo: StepTwoConfig = {
        trafficPolicy: existingConfig.trafficPolicy || ''
      };

      setStepOneConfig(initialStepOne);
      setStepTwoConfig(initialStepTwo);
      setOriginalConfig({ stepOne: initialStepOne, stepTwo: initialStepTwo });
      setHasChanges(false);
    }
  }, [open, existingConfig]);

  // Check for changes whenever config changes
  useEffect(() => {
    if (!originalConfig) return;

    const configsAreEqual = (
      stepOneConfig.binding === originalConfig.stepOne.binding &&
      stepOneConfig.url === originalConfig.stepOne.url &&
      stepOneConfig.additionalOptions.poolingEnabled === originalConfig.stepOne.additionalOptions.poolingEnabled &&
      stepOneConfig.additionalOptions.description === originalConfig.stepOne.additionalOptions.description &&
      stepOneConfig.additionalOptions.metadata === originalConfig.stepOne.additionalOptions.metadata &&
      stepTwoConfig.trafficPolicy === originalConfig.stepTwo.trafficPolicy
    );

    setHasChanges(!configsAreEqual);
  }, [stepOneConfig, stepTwoConfig, originalConfig]);

  const handleComplete = () => {
    onComplete(stepOneConfig, stepTwoConfig);
  };

  const getUpdateButtonText = () => {
    if (isEndpointOnline) {
      return "Update + Restart Endpoint";
    }
    return "Update Endpoint";
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false}
      TransitionComponent={undefined}
      transitionDuration={0}
      PaperProps={{
        sx: {
          width: 674,
          maxWidth: '90vw',
          borderRadius: 2,
          boxShadow: '0px 2px 4px 4px rgba(0,0,0,0.15)',
          border: `1px solid ${theme.palette.divider}`
        }
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: '21px',
              fontWeight: 'medium',
              mb: 1
            }}
          >
            Edit Endpoint
          </Typography>
          
          {/* Container Information */}
          <ContainerInfo containerInfo={containerInfo} />
        </Box>
        
        <IconButton 
          onClick={onClose}
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContentPanel>
        <EndpointForm
          containerInfo={containerInfo}
          stepOneConfig={stepOneConfig}
          stepTwoConfig={stepTwoConfig}
          onStepOneChange={setStepOneConfig}
          onStepTwoChange={setStepTwoConfig}
          showTrafficPolicy={true}
          expandedAdditionalOptions={true}
        />
      </DialogContentPanel>

      <DialogActionsPanel>
        <Button 
          onClick={onClose}
          variant="outlined"
          color="primary"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleComplete}
          variant="contained"
          color="primary"
          disabled={!hasChanges}
        >
          {getUpdateButtonText()}
        </Button>
      </DialogActionsPanel>
    </Dialog>
  );
};

export default EditEndpointDialog;
