import React from 'react';
import { Box, Typography,} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { FlexRow } from './styled';

interface ProgressStepperProps {
  currentStep: 1 | 2;
}

const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep }) => {
  return (
    <Box sx={{ 
      width: '100%',
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center', 
      mb: 3,
      mt: 3,
      px: 2 
    }}>
      {/* Step 1 */}
      <FlexRow>
        {currentStep > 1 ? (
          <Box
            sx={{
              height: '24px',
              width: '24px',
              borderRadius: '50%',
              backgroundColor: 'status.online',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1 
            }}>
            <CheckIcon 
              sx={{ 
                color: 'background.paper', 
                width: 20, 
                height: 20,
              }} 
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: currentStep === 1 ? 'primary.main' : '#e0e0e0',
              color: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'medium',
              mr: 1
            }}
          >
            1
          </Box>
        )}
        <Typography 
          variant="body2" 
          sx={{ 
            color: currentStep > 1 ? 'text.secondary' : 'text.primary',
            fontWeight: currentStep === 1 ? 'medium' : 'regular'
          }}
        >
          Configure your endpoint
        </Typography>
      </FlexRow>

      {/* Connecting Line */}
      <Box
        sx={{
          width: 130,
          height: 2,
          backgroundColor: currentStep === 2 ? 'divider' : 'divider',
          mx: 2
        }}
      />

      {/* Step 2 */}
      <FlexRow>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: currentStep === 2 ? 'primary.main' : 'text.secondary',
            color: currentStep === 2 ? 'background.paper' : 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'medium',
            mr: 1
          }}
        >
          2
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            color: currentStep === 2 ? 'text.primary' : 'text.secondary',
            fontWeight: currentStep === 2 ? 'medium' : 'regular'
          }}
        >
          Add an optional Traffic Policy
        </Typography>
      </FlexRow>
    </Box>
  );
};

export default ProgressStepper;
