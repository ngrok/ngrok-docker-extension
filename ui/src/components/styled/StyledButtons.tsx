import { styled } from '@mui/material/styles';

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


