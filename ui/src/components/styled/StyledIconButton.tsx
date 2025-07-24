import { styled } from '@mui/material/styles';
import { IconButton } from '@mui/material';

export const SquareIconButton = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));
