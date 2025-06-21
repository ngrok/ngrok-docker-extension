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
  Box,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Button,
  Typography
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { EndpointConfiguration } from "./NgrokContext";

interface EndpointConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: EndpointConfiguration, shouldStart: boolean) => void;
  onUpdate?: (config: EndpointConfiguration) => void;
  initialConfig?: EndpointConfiguration;
  containerName: string;
  targetPort: string;
  isEditing: boolean; // determines button text and behavior
}

export default function EndpointConfigurationDialog({
  open,
  onClose,
  onSave,
  onUpdate,
  initialConfig,
  containerName,
  targetPort,
  isEditing
}: EndpointConfigurationDialogProps) {
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

  const handleSave = () => {
    if (isEditing && onUpdate) {
      onUpdate(config);
    } else {
      onSave(config, true);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configure Endpoint for {containerName}:{targetPort}</DialogTitle>
      <DialogContent>
        {/* URL Field */}
        <TextField
          label="URL"
          placeholder="https://myapp.ngrok.io:8080"
          value={config.url || ''}
          onChange={handleUrlChange}
          fullWidth
          margin="normal"
        />
        
        {/* Binding Field with Help Link */}
        <Box display="flex" alignItems="center" gap={1}>
          <FormControl fullWidth margin="normal">
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
          </FormControl>
          <IconButton href="https://ngrok.com/docs/universal-gateway/bindings/" target="_blank">
            <HelpOutlineIcon />
          </IconButton>
        </Box>
        
        {/* Pooling Enabled Toggle with Help Link */}
        <Box display="flex" alignItems="center" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={config.poolingEnabled || false}
                onChange={handlePoolingChange}
              />
            }
            label="Pooling Enabled"
          />
          <IconButton href="https://ngrok.com/docs/universal-gateway/endpoint-pooling/" target="_blank">
            <HelpOutlineIcon />
          </IconButton>
        </Box>
        
        {/* Traffic Policy Field with Help Link */}
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            label="Traffic Policy"
            placeholder="inbound:&#10;  - type: oauth&#10;    config:&#10;      provider: google"
            value={config.trafficPolicy || ''}
            onChange={handleTrafficPolicyChange}
            multiline
            rows={4}
            fullWidth
            margin="normal"
          />
          <IconButton href="https://ngrok.com/docs/traffic-policy/" target="_blank">
            <HelpOutlineIcon />
          </IconButton>
        </Box>
        
        {/* Progressive Disclosure for Description */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Advanced Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Description"
              placeholder="Development API endpoint"
              value={config.description || ''}
              onChange={handleDescriptionChange}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Metadata"
              placeholder='{"environment": "dev", "team": "backend"}'
              value={config.metadata || ''}
              onChange={handleMetadataChange}
              fullWidth
              margin="normal"
            />
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
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
