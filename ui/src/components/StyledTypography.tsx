import { styled } from '@mui/material/styles';
import { Typography } from '@mui/material';

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 16,
  lineHeight: '24px',
  color: theme.palette.text.primary
}));

export const SecondaryText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,  // Use Docker's secondary text color
  fontSize: 14,
  lineHeight: '21px'
}));

export const MonoText = styled(Typography)({
  fontFamily: 'Roboto Mono, monospace',
  fontSize: 14  // Standardized to 14px body text
});
