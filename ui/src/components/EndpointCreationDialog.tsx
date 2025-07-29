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

import ProgressStepper from './ProgressStepper';
import { EndpointForm, TrafficPolicySection, ContainerInfo } from './EndpointDialog';
import { BindingType, AdditionalOptionsState } from './EndpointDialog/types';
import { CardPanel, DialogContentPanel, DialogActionsPanel } from './styled';

// const ddClient = createDockerDesktopClient(); // Remove for now since unused

export interface StepOneConfig {
  binding: BindingType;
  url?: string;
  additionalOptions: AdditionalOptionsState;
}

export interface StepTwoConfig {
  trafficPolicy: string;
}

interface EndpointCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (config: StepOneConfig) => void;
  onComplete: (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => void;
  containerInfo: {
    imageName: string;
    containerName: string;
    containerID: string;
    targetPort: string;
  };
}

const EndpointCreationDialog: React.FC<EndpointCreationDialogProps> = ({
  open,
  onClose,
  onNext,
  onComplete,
  containerInfo
}) => {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [stepOneConfig, setStepOneConfig] = useState<StepOneConfig>({
    binding: 'public',
    url: '',
    additionalOptions: {
      poolingEnabled: false,
      description: '',
      metadata: ''
    }
  });
  const [stepTwoConfig, setStepTwoConfig] = useState<StepTwoConfig>({
    trafficPolicy: ''
  });



  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setStepOneConfig({
        binding: 'public',
        url: '',
        additionalOptions: {
          poolingEnabled: false,
          description: '',
          metadata: ''
        }
      });
      setStepTwoConfig({
        trafficPolicy: ''
      });
    }
  }, [open]);



  const handleTrafficPolicyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStepTwoConfig({ ...stepTwoConfig, trafficPolicy: event.target.value });
  };

  const handleNextStep = () => {
    onNext(stepOneConfig);
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleComplete = () => {
    onComplete(stepOneConfig, stepTwoConfig);
  };

  const getCreateButtonText = () => {
    return stepTwoConfig.trafficPolicy.trim() ? "Create Endpoint" : "Skip and Create Endpoint";
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
            Create a New Endpoint
          </Typography>
          
          {/* Container Information */}
          <ContainerInfo containerInfo={{
            imageName: containerInfo.imageName,
            containerName: containerInfo.containerName,
            containerID: containerInfo.containerID,
            targetPort: containerInfo.targetPort
          }} />
        </Box>
        
        <IconButton 
          onClick={onClose}
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={currentStep} />

      <DialogContentPanel>
        {currentStep === 1 ? (
          // Step 1: Configure Endpoint
          <EndpointForm
            containerInfo={{
              imageName: containerInfo.imageName,
              containerName: containerInfo.containerName,
              containerID: containerInfo.containerID,
              targetPort: containerInfo.targetPort
            }}
            stepOneConfig={stepOneConfig}
            stepTwoConfig={stepTwoConfig}
            onStepOneChange={setStepOneConfig}
            onStepTwoChange={setStepTwoConfig}
            showTrafficPolicy={false}
            expandedAdditionalOptions={false}
          />
        ) : (
          // Step 2: Traffic Policy
          <CardPanel>
            <TrafficPolicySection
              trafficPolicy={stepTwoConfig.trafficPolicy}
              onTrafficPolicyChange={handleTrafficPolicyChange}
            />
          </CardPanel>
        )}
      </DialogContentPanel>

      <DialogActionsPanel>
        {currentStep === 1 ? (
          <>
            <Button 
              onClick={onClose}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNextStep}
              variant="contained"
              color="primary"
            >
              Next Step
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handlePreviousStep}
              variant="outlined"
              color="primary"
            >
              Previous Step
            </Button>
            <Button 
              onClick={handleComplete}
              variant="contained"
              color="primary"
            >
              {getCreateButtonText()}
            </Button>
          </>
        )}
      </DialogActionsPanel>
    </Dialog>
  );
};

export default EndpointCreationDialog;
