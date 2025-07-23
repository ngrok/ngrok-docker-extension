import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Link,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import LinkIcon from '@mui/icons-material/Link';
import DockerIcon from '@mui/icons-material/ViewModule'; // Using as Docker placeholder
import ContainerIcon from '@mui/icons-material/AllInbox'; // Using as Container placeholder
import PolicyIcon from '@mui/icons-material/Policy';
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { DetectProtocolRequest, DetectProtocolResponse } from "./NgrokContext";

import ProgressStepper from './ProgressStepper';
import BindingCard, { BindingType } from './BindingCard';
import ProtocolWarning from './ProtocolWarning';
import AdditionalOptions, { AdditionalOptionsState } from './AdditionalOptions';

const ddClient = createDockerDesktopClient();

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

  // Protocol detection state
  const [protocolDetection, setProtocolDetection] = useState<DetectProtocolResponse | null>(null);
  const [showProtocolWarning, setShowProtocolWarning] = useState(false);
  const [detectedProtocol, setDetectedProtocol] = useState('');
  const [enteredProtocol, setEnteredProtocol] = useState('');

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
      detectProtocol();
    }
  }, [open]);

  // Protocol detection
  const detectProtocol = () => {
    if (containerInfo.containerID && containerInfo.targetPort) {
      const request: DetectProtocolRequest = { 
        container_id: containerInfo.containerID, 
        port: containerInfo.targetPort 
      };
      
      ddClient.extension.vm?.service?.post('/detect_protocol', request)
        .then((result: any) => {
          const responseData = result?.data || result;
          setProtocolDetection(responseData as DetectProtocolResponse);
          
          // Determine primary detected protocol for placeholder
          let primaryProtocol = 'https';
          if (responseData.https) primaryProtocol = 'https';
          else if (responseData.tls) primaryProtocol = 'tls';
          else if (responseData.tcp) primaryProtocol = 'tcp';
          
          setDetectedProtocol(primaryProtocol);
        })
        .catch(() => {
          setProtocolDetection({
            tcp: false,
            http: false,
            https: false,
            tls: false
          });
          setDetectedProtocol('https'); // Default
        });
    }
  };

  // Check for protocol mismatch when URL changes
  useEffect(() => {
    if (stepOneConfig.url && protocolDetection) {
      const urlProtocol = stepOneConfig.url.split('://')[0]?.toLowerCase();
      if (urlProtocol) {
        setEnteredProtocol(urlProtocol);
        
        // Check if entered protocol matches detected protocols
        const isProtocolMatch = 
          (urlProtocol === 'https' && protocolDetection.https) ||
          (urlProtocol === 'http' && protocolDetection.http) ||
          (urlProtocol === 'tcp' && protocolDetection.tcp) ||
          (urlProtocol === 'tls' && protocolDetection.tls);
        
        setShowProtocolWarning(!isProtocolMatch);
      } else {
        setShowProtocolWarning(false);
      }
    } else {
      setShowProtocolWarning(false);
    }
  }, [stepOneConfig.url, protocolDetection]);

  const getUrlPlaceholder = (binding: BindingType): string => {
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

  const handleBindingChange = (type: BindingType) => {
    setStepOneConfig({ ...stepOneConfig, binding: type });
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStepOneConfig({ ...stepOneConfig, url: event.target.value });
  };

  const handleAdditionalOptionsChange = (options: AdditionalOptionsState) => {
    setStepOneConfig({ ...stepOneConfig, additionalOptions: options });
  };

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

  const openExternalLink = (url: string) => {
    ddClient.host.openExternal(url);
  };

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
          border: '1px solid #efeff2'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #efeff2',
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
              color: '#000000',
              mb: 1
            }}
          >
            Create a New Endpoint
          </Typography>
          
          {/* Container Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DockerIcon sx={{ width: 16, height: 16, color: '#677285' }} />
              <Typography variant="body2" sx={{ color: '#677285', fontSize: '14px' }}>
                {containerInfo.imageName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ContainerIcon sx={{ width: 16, height: 16, color: '#677285' }} />
              <Typography variant="body2" sx={{ color: '#677285', fontSize: '14px' }}>
                {containerInfo.containerName}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <IconButton 
          onClick={onClose}
          sx={{ color: '#677285' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={currentStep} />

      <DialogContent sx={{ p: 2, pt: 0 }}>
        {currentStep === 1 ? (
          // Step 1: Configure Endpoint
          <Box sx={{ 
            backgroundColor: '#efeff2', 
            borderRadius: 1, 
            border: '1px solid #d1d4db',
            p: 2 
          }}>
            {/* Binding Section */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ConnectWithoutContactIcon sx={{ width: 20, height: 20, color: '#677285', mr: 1 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: '16px',
                    fontWeight: 'medium',
                    color: '#000000'
                  }}
                >
                  Binding
                </Typography>
              </Box>
              
              <Grid container spacing={1}>
                {bindingOptions.map((option) => (
                  <Grid item xs={4} key={option.type}>
                    <BindingCard
                      type={option.type}
                      title={option.title}
                      description={option.description}
                      learnMoreUrl={option.learnMoreUrl}
                      selected={stepOneConfig.binding === option.type}
                      onSelect={handleBindingChange}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* URL Section */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LinkIcon sx={{ width: 20, height: 20, color: '#677285', mr: 1 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: '16px',
                    fontWeight: 'medium',
                    color: '#000000'
                  }}
                >
                  URL
                </Typography>
              </Box>
              
              <TextField
                placeholder={getUrlPlaceholder(stepOneConfig.binding)}
                value={stepOneConfig.url}
                onChange={handleUrlChange}
                fullWidth
                size="small"
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#c9c9c9',
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
                  color: '#677285',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  mb: 0.5
                }}
              >
                Leave blank to auto-generate a random URL.
              </Typography>
              
              <Link
                component="button"
                variant="caption"
                onClick={() => openExternalLink('https://ngrok.com/docs/universal-gateway/bindings/')}
                sx={{
                  color: '#086dd7',
                  fontSize: '12px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  p: 0,
                  border: 'none',
                  background: 'none'
                }}
              >
                Learn more
              </Link>
            </Box>

            {/* Additional Options */}
            <AdditionalOptions
              options={stepOneConfig.additionalOptions}
              onChange={handleAdditionalOptionsChange}
            />
          </Box>
        ) : (
          // Step 2: Traffic Policy
          <Box sx={{ 
            backgroundColor: '#efeff2', 
            borderRadius: 1, 
            border: '1px solid #d1d4db',
            p: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PolicyIcon sx={{ width: 20, height: 20, color: '#677285', mr: 1 }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '16px',
                  fontWeight: 'medium',
                  color: '#000000'
                }}
              >
                Traffic Policy
              </Typography>
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#677285',
                fontSize: '14px',
                lineHeight: 1.4,
                mb: 1
              }}
            >
              <Box component="span" sx={{ fontWeight: 'medium', color: '#000000' }}>ngrok's</Box>{' '}
              <Box component="span" sx={{ fontWeight: 'medium', color: '#000000' }}>Traffic Policy</Box>{' '}
              is a configuration language for controlling traffic to your applications.
            </Typography>
            
            <TextField
              value={stepTwoConfig.trafficPolicy}
              onChange={handleTrafficPolicyChange}
              placeholder={`on_http_request:
  - actions:
    - type: custom-response
      config:
        status_code: 200
        body: Hello, World!`}
              fullWidth
              multiline
              rows={16}
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: '#ffffff',
                  fontFamily: 'monospace',
                  '& fieldset': {
                    borderColor: '#c9c9c9',
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
                  padding: '11px 16px',
                  fontSize: '13px',
                  fontFamily: 'Roboto Mono, monospace',
                  color: '#000000'
                }
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => openExternalLink('https://ngrok.com/docs/traffic-policy/')}
                sx={{
                  color: '#086dd7',
                  fontSize: '14px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  p: 0,
                  border: 'none',
                  background: 'none'
                }}
              >
                Learn more
              </Link>
              
              <Link
                component="button"
                variant="body2"
                onClick={() => openExternalLink('https://ngrok.com/docs/traffic-policy/examples/')}
                sx={{
                  color: '#086dd7',
                  fontSize: '14px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  p: 0,
                  border: 'none',
                  background: 'none'
                }}
              >
                View example gallery
              </Link>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        {currentStep === 1 ? (
          <>
            <Button 
              onClick={onClose}
              variant="outlined"
              sx={{
                color: '#116ed0',
                borderColor: '#116ed0',
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: '#e5f2fc',
                  borderColor: '#116ed0'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNextStep}
              variant="contained"
              sx={{
                backgroundColor: '#116ed0',
                '&:hover': {
                  backgroundColor: '#0d5ba8'
                }
              }}
            >
              Next Step
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handlePreviousStep}
              variant="outlined"
              sx={{
                color: '#116ed0',
                borderColor: '#116ed0',
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: '#e5f2fc',
                  borderColor: '#116ed0'
                }
              }}
            >
              Previous Step
            </Button>
            <Button 
              onClick={handleComplete}
              variant="contained"
              sx={{
                backgroundColor: '#116ed0',
                '&:hover': {
                  backgroundColor: '#0d5ba8'
                }
              }}
            >
              {getCreateButtonText()}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EndpointCreationDialog;
