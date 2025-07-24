import { styled } from '@mui/material/styles';
import { Button } from '@mui/material';

export const LinkButton = styled('button')(({ theme }) => ({
  background: 'none',
  border: 'none',
  padding: 0,
  ...theme.typography.caption,
  color: theme.palette.brand.linkBlue,
  textDecoration: 'underline',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8
  }
}));

export const PrimaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark
  }
}));
