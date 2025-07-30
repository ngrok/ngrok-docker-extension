import { styled, darken, alpha, lighten } from '@mui/material/styles';
import { Box, DialogContent, DialogActions, DialogTitle } from '@mui/material';

export const CardPanel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2)
}));

export const EmptyStatePanel = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 400,
  textAlign: 'center',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
}));

// Flex Layout Components
export const FlexRow = styled(Box)({
  display: 'flex',
  alignItems: 'center'
});

export const FlexRowGap05 = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5)
}));

export const FlexRowGap1 = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const FlexRowGap2 = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2)
}));

export const FlexRowMb2 = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2)
}));

export const FlexColumn = styled(Box)({
  display: 'flex',
  flexDirection: 'column'
});

export const FlexColumnGap2 = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

export const FlexRowStart = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start'
});

export const FlexRowBetween = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between'
});

// Dialog styled components
export const DialogContentPanel = styled(DialogContent)(({ theme }) => ({
  backgroundColor: 
    (theme.palette.mode === 'dark' 
      ? `${lighten(alpha(theme.palette.background.paper, 1), 0.05)}` 
      : `${darken(alpha(theme.palette.background.paper, 1), 0.05)}`),
  padding: theme.spacing(2),
  paddingTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderBottom: 'solid 1px',
  borderBottomColor: theme.palette.divider, 
}));

export const DialogActionsPanel = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
  justifyContent: 'space-between'
}));

export const DialogTitlePanel = styled(DialogTitle)(() => ({
  padding: 0
}));

export const SettingsDialogContentPanel = styled(DialogContent)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  paddingTop: 0,
  paddingBottom: 0
}));

export const SettingsDialogActionsPanel = styled(DialogActions)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  gap: theme.spacing(1)
}));
