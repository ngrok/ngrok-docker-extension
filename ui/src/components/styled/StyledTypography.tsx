import { styled } from '@mui/material/styles';
import { Typography, Box } from '@mui/material';

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 16,
  lineHeight: '24px',
  color: theme.palette.text.primary
}));

export const SectionTitleMb2 = styled(SectionTitle)(({ theme }) => ({
  marginBottom: theme.spacing(2)
}));

export const SecondaryText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,  // Use Docker's secondary text color
  fontSize: 14,
  lineHeight: '21px'
}));

export const SecondaryTextMt1 = styled(SecondaryText)(({ theme }) => ({
  marginTop: theme.spacing(1)
}));

export const SecondaryTextMb1 = styled(SecondaryText)(({ theme }) => ({
  marginBottom: theme.spacing(1)
}));



// Section container components for consistent spacing
export const SectionBox = styled(Box)({
  // Base section container
});

export const SectionBoxMb1 = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1)
}));

export const SectionBoxMb2 = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2)
}));

export const SectionBoxMb3 = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3)
}));

export const SectionBoxMt1 = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1)
}));

export const SectionBoxMt2 = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2)
}));
