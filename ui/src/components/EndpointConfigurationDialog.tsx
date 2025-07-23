import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Button,
  Typography,
  Link,
  FormHelperText,
  Box,
  Alert,
  CircularProgress
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { EndpointConfiguration, DetectProtocolRequest, DetectProtocolResponse } from "./NgrokContext";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface EndpointConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: EndpointConfiguration, shouldStart: boolean) => void;
  onUpdate?: (config: EndpointConfiguration) => void;
  initialConfig?: EndpointConfiguration;
  containerName: string;
  containerImage: string;
  containerID: string;
  targetPort: string;
  isEditing: boolean; // determines button text and behavior
  isRunning: boolean; // indicates if the endpoint is currently running
}

export default function EndpointConfigurationDialog({
  open,
  onClose,
  onSave,
  onUpdate,
  initialConfig,
  containerName,
  containerImage,
  containerID,
  targetPort,
  isEditing,
  isRunning
}: EndpointConfigurationDialogProps) {
  const ddClient = useDockerDesktopClient();
  const [config, setConfig] = useState<EndpointConfiguration>({
    id: initialConfig?.id || `${containerName}:${targetPort}`,
    containerId: initialConfig?.containerId || '',
    targetPort: targetPort,
    url: initialConfig?.url || '',
    binding: initialConfig?.binding || 'public',
    poolingEnabled: initialConfig?.poolingEnabled || false,
    trafficPolicy: initialConfig?.trafficPolicy || '',
    description: initialConfig?.description || '',
    metadata: initialConfig?.metadata || '',
  });

  // Protocol detection state
  const [protocolDetection, setProtocolDetection] = useState<DetectProtocolResponse | null>(null);
  const [detectionLoading, setDetectionLoading] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      setConfig({
        id: `${containerName}:${targetPort}`,
        containerId: '',
        targetPort: targetPort,
        url: '',
        binding: 'public',
        poolingEnabled: false,
        trafficPolicy: '',
        description: '',
        metadata: '',
      });
    }
  }, [initialConfig, containerName, targetPort]);

  // Protocol detection effect
  useEffect(() => {
    if (open && containerID && targetPort) {
      setDetectionLoading(true);
      setProtocolDetection(null);

      const request: DetectProtocolRequest = { 
        container_id: containerID, 
        port: targetPort 
      };
      
      ddClient.extension.vm?.service?.post('/detect_protocol', request)
        .then((result: any) => {
          // Handle both old and new response structures (Docker Desktop API change)
          const responseData = result?.data || result;
          setProtocolDetection(responseData as DetectProtocolResponse);
        })
        .catch(() => setProtocolDetection({
          tcp: false,
          http: false,
          https: false,
          tls: false
        }))
        .finally(() => setDetectionLoading(false));
    }
  }, [open, containerID, targetPort, ddClient]);

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, url: event.target.value });
  };

  const handleBindingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, binding: event.target.value as 'public' | 'internal' | 'kubernetes' });
  };

  const handlePoolingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, poolingEnabled: event.target.checked });
  };

  const handleTrafficPolicyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, trafficPolicy: event.target.value });
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, description: event.target.value });
  };

  const handleMetadataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, metadata: event.target.value });
  };

  const openExternalLink = (url: string) => {
    ddClient.host.openExternal(url);
  };

  const getUrlPlaceholder = (binding: string) => {
    switch (binding) {
      case 'internal':
        return 'ex. https://example.internal';
      case 'kubernetes':
        return 'ex. http://myapp.prod';
      case 'public':
      default:
        return 'ex. https://example.ngrok.app';
    }
  };

  const getUrlHelpText = (binding: string) => {
    switch (binding) {
      case 'internal':
        return {
          text: 'Must use the .internal TLD and specify a port.',
          docUrl: 'https://ngrok.com/docs/universal-gateway/internal-endpoints/'
        };
      case 'kubernetes':
        return {
          text: 'Accessible only in clusters where you run the ngrok Kubernetes Operator',
          docUrl: 'https://ngrok.com/docs/universal-gateway/kubernetes-endpoints/'
        };
      case 'public':
      default:
        return {
          text: 'Accessible to clients on the internet.',
          docUrl: 'https://ngrok.com/docs/universal-gateway/public-endpoints/'
        };
    }
  };

  const getDefaultDescription = () => {
    const imageShort = containerImage.split(':')[0].split('/').pop() || containerImage;
    return `ex. ${imageShort} docker desktop endpoint`;
  };

  const getDefaultMetadata = () => {
    const imageShort = containerImage.split(':')[0].split('/').pop() || containerImage;
    return `ex. {"container": "${containerName}", "image": "${imageShort}", "port": "${targetPort}", "env": "docker-desktop"}`;
  };

  const getTrafficPolicyPlaceholder = (url: string) => {
    const scheme = url ? url.split('://')[0].toLowerCase() : '';
    
    if (scheme === 'tcp' || scheme === 'tls') {
      return `on_tcp_connect:\n  - actions:\n    - type: restrict-ips\n       config:\n         allow: ['1.2.3.4/32']`;
    } else {
      // Default for http/https or empty
      return `on_http_request:\n  - actions:\n    - type: oauth\n       config:\n         provider: google`;
    }
  };

  const handleSave = () => {
    if (isEditing && onUpdate) {
      onUpdate(config);
    } else {
      onSave(config, true);
    }
  };

  // Detection results display component
  const DetectionResults = () => {
    if (detectionLoading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Detecting protocols...
          </Typography>
        </Box>
      );
    }
    
    if (!protocolDetection) {
      return (
        <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Protocol Detection: Waiting for container information...
          </Typography>
        </Box>
      );
    }
    
    const protocols = [];
    if (protocolDetection.tcp) protocols.push('TCP');
    if (protocolDetection.http) protocols.push('HTTP');
    if (protocolDetection.https) protocols.push('HTTPS');
    if (protocolDetection.tls) protocols.push('TLS');
    
    return (
      <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Detected Protocols: {protocols.length > 0 ? protocols.join(', ') : 'None'}
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" component="div">
            Configure Endpoint for {containerName}:{targetPort}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
            {containerImage}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isEditing && isRunning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Updating this endpoint's configuration will restart the running endpoint.
          </Alert>
        )}
        
        {/* Protocol Detection Results */}
        <DetectionResults />
        
        {/* Binding Field with Help Link */}
        <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
          <FormLabel>Binding</FormLabel>
          <RadioGroup
            value={config.binding || 'public'}
            onChange={handleBindingChange}
            row
          >
            <FormControlLabel value="public" control={<Radio />} label="Public" />
            <FormControlLabel value="internal" control={<Radio />} label="Internal" />
            <FormControlLabel value="kubernetes" control={<Radio />} label="Kubernetes" />
          </RadioGroup>
          <FormHelperText>
            Choose where your endpoint is accessible from.{' '}
            <Link 
              component="button"
              variant="inherit"
              onClick={() => openExternalLink("https://ngrok.com/docs/universal-gateway/bindings/")}
              sx={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              Learn more
            </Link>
          </FormHelperText>
        </FormControl>
        
        {/* URL Field with Dynamic Help Text */}
        <TextField
          label="URL"
          placeholder={getUrlPlaceholder(config.binding || 'public')}
          value={config.url || ''}
          onChange={handleUrlChange}
          helperText={
            <>
              {getUrlHelpText(config.binding || 'public').text}{' '}
              <Link 
                component="button"
                variant="inherit"
                onClick={() => openExternalLink(getUrlHelpText(config.binding || 'public').docUrl)}
                sx={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                Learn more
              </Link>
            </>
          }
          fullWidth
          margin="normal"
          sx={{ mb: 3 }}
        />
        
        {/* Traffic Policy Field with Help Link */}
        <TextField
          label="Traffic Policy"
          placeholder={getTrafficPolicyPlaceholder(config.url || '')}
          value={config.trafficPolicy || ''}
          onChange={handleTrafficPolicyChange}
          helperText={
            <>
              Define rules for traffic handling like authentication, rate limiting, etc.{' '}
              <Link 
                component="button"
                variant="inherit"
                onClick={() => openExternalLink("https://ngrok.com/docs/traffic-policy/")}
                sx={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                Learn more
              </Link>
            </>
          }
          multiline
          rows={5}
          fullWidth
          margin="normal"
          sx={{ mb: 3 }}
        />
        
        {/* Pooling Enabled Toggle with Help Link */}
        <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel>Pooling Enabled</FormLabel>
            <Switch
              checked={config.poolingEnabled || false}
              onChange={handlePoolingChange}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#116ED0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#8BC7F5',
                },
              }}
            />
          </Box>
          <FormHelperText>
            Distribute traffic across multiple endpoints for high availability.{' '}
            <Link 
              component="button"
              variant="inherit"
              onClick={() => openExternalLink("https://ngrok.com/docs/universal-gateway/endpoint-pooling/")}
              sx={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              Learn more
            </Link>
          </FormHelperText>
        </FormControl>
        
        {/* Progressive Disclosure for Description */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography color="text.secondary">Advanced Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Description"
              placeholder={getDefaultDescription()}
              value={config.description || ''}
              onChange={handleDescriptionChange}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Metadata"
              placeholder={getDefaultMetadata()}
              value={config.metadata || ''}
              onChange={handleMetadataChange}
              fullWidth
              margin="normal"
            />
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="text">Cancel</Button>
        {isEditing ? (
          <Button onClick={handleSave} variant="contained">
            Update Configuration
          </Button>
        ) : (
          <Button onClick={handleSave} variant="contained">
            Create and Start
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
