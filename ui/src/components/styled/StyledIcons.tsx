import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Wrapper components for consistent icon sizing
// 16x16px icons for tiny elements
export const IconTiny = styled(Box)({
  display: 'inline-flex',
  '& .MuiSvgIcon-root': {
    width: 16,
    height: 16,
  },
});

// 20x20px icons for most UI elements  
export const IconSmall = styled(Box)({
  display: 'inline-flex',
  '& .MuiSvgIcon-root': {
    width: 20,
    height: 20,
  },
});

// 24x24px icons for headers and prominent elements
export const IconMedium = styled(Box)({
  display: 'inline-flex',
  '& .MuiSvgIcon-root': {
    width: 24,
    height: 24,
  },
});

// 16px font icons for inline text elements
export const IconFont16 = styled(Box)({
  display: 'inline-flex',
  '& .MuiSvgIcon-root': {
    fontSize: '16px',
  },
});

// Secondary color icon wrapper - for icons that should use theme.palette.text.secondary
export const IconSecondary = styled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
  display: 'inline-flex',
  alignItems: 'center',
  '& .MuiSvgIcon-root': {
    color: 'inherit',
  },
}));
