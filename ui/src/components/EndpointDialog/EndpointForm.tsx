import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { DetectProtocolRequest, DetectProtocolResponse } from "../NgrokContext";
import { CardPanel } from '../styled';
import BindingSection from './BindingSection';
import UrlSection from './UrlSection';
import TrafficPolicySection from './TrafficPolicySection';
import AdditionalOptions from '../AdditionalOptions';
import { StepOneConfig, StepTwoConfig, ContainerInfo, BindingType, AdditionalOptionsState } from './types';
import * as api from '../../services/api';

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
  const [warningData, setWarningData] = useState<{
    severity: 'error' | 'warning' | 'info';
    primary: string;
    secondary: string;
  } | null>(null);
  const [detectedProtocol, setDetectedProtocol] = useState('');
  const [enteredProtocol, setEnteredProtocol] = useState('');

  // Protocol detection
  const detectProtocol = () => {
    if (containerInfo.containerID && containerInfo.targetPort) {
      const request: DetectProtocolRequest = { 
        container_id: containerInfo.containerID, 
        port: containerInfo.targetPort 
      };
      
      api.detectProtocol(request)
        .then((result: DetectProtocolResponse) => {
          const responseData = result;

          setProtocolDetection(responseData as DetectProtocolResponse);
          
          // Determine primary detected protocol for placeholder
          let primaryProtocol = 'https';
          if (responseData.https) primaryProtocol = 'https';
          else if (responseData.tls) primaryProtocol = 'tls';
          else if (responseData.http) primaryProtocol = 'http';
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
      // Only show warnings if URL contains :// (user has finished typing protocol)
      if (!stepOneConfig.url.includes('://')) {
        setShowProtocolWarning(false);
        setWarningData(null);
        return;
      }

      const urlProtocol = stepOneConfig.url.split('://')[0]?.toLowerCase();
      if (urlProtocol) {
        setEnteredProtocol(urlProtocol);
        
        // Consolidated protocol validation with messages and severity
        const getProtocolWarning = (detected: DetectProtocolResponse, entered: string) => {
          const hasHttp = detected.http || detected.https;

          switch (entered) {
            case 'http':
            case 'https':
              // HTTP/HTTPS are interchangeable - only warn if no HTTP detected
              if (!hasHttp) {
                return {
                  show: true,
                  severity: 'warning' as const,
                  primary: `We haven't detected HTTP on your endpoint. Are you sure you want to use ${entered.toUpperCase()}?`,
                  secondary: 'This might not work if your service doesn\'t support HTTP.'
                };
              }
              return { show: false };
              
            case 'tcp':
              // TCP over HTTP is valid but HTTPS is better
              if (hasHttp) {
                return {
                  show: true,
                  severity: 'info' as const,
                  primary: `While TCP will work, we recommend using HTTPS for better security and features.`,
                  secondary: 'HTTPS provides encryption and works with more ngrok features.'
                };
              }
              // Exact TCP match is fine
              if (!detected.tcp) {
                return {
                  show: true,
                  severity: 'warning' as const,
                  primary: `We haven't detected TCP on your endpoint. Are you sure you want to use TCP?`,
                  secondary: 'This might not work if your service doesn\'t support TCP.'
                };
              }
              return { show: false };
              
            case 'tls':
              // TLS over HTTP is valid but HTTPS is better  
              if (hasHttp) {
                return {
                  show: true,
                  severity: 'info' as const,
                  primary: `While TLS will work, we recommend using HTTPS for better security and features.`,
                  secondary: 'HTTPS provides encryption and works with more ngrok features.'
                };
              }
              // Exact TLS match is fine
              if (!detected.tls) {
                return {
                  show: true,
                  severity: 'warning' as const,
                  primary: `We haven't detected TLS on your endpoint. Are you sure you want to use TLS?`,
                  secondary: 'This might not work if your service doesn\'t support TLS.'
                };
              }
              return { show: false };
              
            default:
              // Unsupported protocol
              return {
                show: true,
                severity: 'error' as const,
                primary: `${entered.toUpperCase()} is not a supported protocol.`,
                secondary: 'Supported protocols are HTTP, HTTPS, TCP, and TLS.'
              };
          }
        };

        const warningResult = getProtocolWarning(protocolDetection, urlProtocol);
        

        
        setShowProtocolWarning(warningResult.show);
        if (warningResult.show && warningResult.severity && warningResult.primary && warningResult.secondary) {
          setWarningData({
            severity: warningResult.severity,
            primary: warningResult.primary,
            secondary: warningResult.secondary
          });
        } else {
          setWarningData(null);
        }
      } else {
        setShowProtocolWarning(false);
        setWarningData(null);
      }
    } else {
      setShowProtocolWarning(false);
      setWarningData(null);
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
          warningData={warningData}
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
