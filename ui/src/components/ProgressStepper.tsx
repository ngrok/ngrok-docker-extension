import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ProgressStepperProps {
  currentStep: 1 | 2;
}

const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      mb: 3,
      px: 2 
    }}>
      {/* Step 1 */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {currentStep > 1 ? (
          <CheckCircleIcon 
            sx={{ 
              color: '#4caf50', 
              width: 24, 
              height: 24,
              mr: 1 
            }} 
          />
        ) : (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: currentStep === 1 ? '#116ed0' : '#e0e0e0',
              color: 'white',
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
            color: currentStep > 1 ? '#677285' : '#000000',
            fontWeight: currentStep === 1 ? 'medium' : 'regular'
          }}
        >
          Configure your endpoint
        </Typography>
      </Box>

      {/* Connecting Line */}
      <Box
        sx={{
          width: 40,
          height: 2,
          backgroundColor: currentStep > 1 ? '#4caf50' : '#e0e0e0',
          mx: 2
        }}
      />

      {/* Step 2 */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: currentStep === 2 ? '#116ed0' : '#e0e0e0',
            color: currentStep === 2 ? 'white' : '#677285',
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
            color: currentStep === 2 ? '#000000' : '#677285',
            fontWeight: currentStep === 2 ? 'medium' : 'regular'
          }}
        >
          Add an optional Traffic Policy
        </Typography>
      </Box>
    </Box>
  );
};

export default ProgressStepper;
