import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { DetectProtocolRequest, DetectProtocolResponse } from "../NgrokContext";
import { CardPanel } from '../styled';
import BindingSection from './BindingSection';
import UrlSection from './UrlSection';
import TrafficPolicySection from './TrafficPolicySection';
import AdditionalOptions from '../AdditionalOptions';
import { StepOneConfig, StepTwoConfig, ContainerInfo, BindingType, AdditionalOptionsState } from './types';

const ddClient = createDockerDesktopClient();

interface EndpointFormProps {
  containerInfo: ContainerInfo;
  stepOneConfig: StepOneConfig;
  stepTwoConfig: StepTwoConfig;
  onStepOneChange: (config: StepOneConfig) => void;
  onStepTwoChange: (config: StepTwoConfig) => void;
  showTrafficPolicy?: boolean;
  expandedAdditionalOptions?: boolean;
}

const EndpointForm: React.FC<EndpointFormProps> = ({
  containerInfo,
  stepOneConfig,
  stepTwoConfig,
  onStepOneChange,
  onStepTwoChange,
  showTrafficPolicy = false,
  expandedAdditionalOptions = false
}) => {
  // Protocol detection state
  const [protocolDetection, setProtocolDetection] = useState<DetectProtocolResponse | null>(null);
  const [showProtocolWarning, setShowProtocolWarning] = useState(false);
  const [detectedProtocol, setDetectedProtocol] = useState('');
  const [enteredProtocol, setEnteredProtocol] = useState('');

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

  // Detect protocol on mount
  useEffect(() => {
    detectProtocol();
  }, [containerInfo.containerID, containerInfo.targetPort]);

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

  const handleBindingChange = (type: BindingType) => {
    onStepOneChange({ ...stepOneConfig, binding: type });
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onStepOneChange({ ...stepOneConfig, url: event.target.value });
  };

  const handleAdditionalOptionsChange = (options: AdditionalOptionsState) => {
    onStepOneChange({ ...stepOneConfig, additionalOptions: options });
  };

  const handleTrafficPolicyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onStepTwoChange({ ...stepTwoConfig, trafficPolicy: event.target.value });
  };

  return (
    <Box>
      {/* Main Configuration Card */}
      <CardPanel>
        {/* Binding Section */}
        <BindingSection
          selectedBinding={stepOneConfig.binding}
          onBindingChange={handleBindingChange}
        />

        {/* URL Section */}
        <UrlSection
          binding={stepOneConfig.binding}
          url={stepOneConfig.url || ''}
          onUrlChange={handleUrlChange}
          showProtocolWarning={showProtocolWarning}
          detectedProtocol={detectedProtocol}
          enteredProtocol={enteredProtocol}
        />
      </CardPanel>

      {/* Traffic Policy Section (if enabled) - in its own card */}
      {showTrafficPolicy && (
        <Box sx={{ mt: 2 }}>
          <CardPanel>
            <TrafficPolicySection
              trafficPolicy={stepTwoConfig.trafficPolicy}
              onTrafficPolicyChange={handleTrafficPolicyChange}
              showTitle={true}
            />
          </CardPanel>
        </Box>
      )}

      {/* Additional Options - as peer element */}
      <Box sx={{ mt: 2 }}>
        <AdditionalOptions
          options={stepOneConfig.additionalOptions}
          onChange={handleAdditionalOptionsChange}
          expanded={expandedAdditionalOptions}
        />
      </Box>
    </Box>
  );
};

export default EndpointForm;
