import { createTheme, Theme } from '@mui/material/styles';

// Extend MUI theme interface for custom tokens
declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      linkBlue: string;
      panelBackground: string;
      emptyStateBackground: string;
    };
    status: {
      online: string;
      offline: string;
      connecting: string;
      connectingError: string;
      unknown: string;
    };
  }
  interface PaletteOptions {
    brand?: {
      linkBlue?: string;
      panelBackground?: string;
      emptyStateBackground?: string;
    };
    status?: {
      online?: string;
      offline?: string;
      connecting?: string;
      connectingError?: string;
      unknown?: string;
    };
  }
}

export const buildNgrokTheme = (dockerTheme: Theme) =>
  createTheme({
    ...dockerTheme,  // Start from Docker's theme
    palette: {
      ...dockerTheme.palette,
      // Add custom brand colors for ngrok-specific elements
      brand: {
        linkBlue: '#086DD7',        // Custom link blue
        panelBackground: dockerTheme.palette.background.paper, // Use Docker's elevated surface color
        emptyStateBackground: dockerTheme.palette.mode === 'dark' ? '#1c262d' : dockerTheme.palette.background.paper
      },
      status: {
        online: '#2E7F74',     // Success green
        offline: '#757575',    // Grey
        connecting: '#1976d2', // Cool blue for connecting without error
        connectingError: '#d32f2f', // Error red for connecting with error
        unknown: '#9E9E9E'     // Light grey
      }
    },
    typography: {
      ...dockerTheme.typography,
      // Override specific variants while keeping Docker's base typography
      body1: {
        ...dockerTheme.typography.body1,
        fontSize: 14,  // Standardize all body text to 14px
        lineHeight: '21px'
      },
      body2: {
        ...dockerTheme.typography.body2,
        fontSize: 13,
        lineHeight: '21px'
      },
      h6: {
        ...dockerTheme.typography.h6,
        fontWeight: 500,  // Medium weight only (no semi-bold)
        fontSize: 16,
        lineHeight: '24px'
      },
      caption: {
        ...dockerTheme.typography.caption,
        fontSize: 12,
        lineHeight: '16px',
        letterSpacing: '0.24px'
      }
    },
    components: {
      ...dockerTheme.components,  // Keep Docker's component overrides (including DataGrid)
      // Layer our custom overrides on top
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500  // Medium weight only
          }
        }
      },
      MuiLink: {
        styleOverrides: {
          root: {
            textDecoration: 'underline',
            cursor: 'pointer'
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& fieldset': {
              borderWidth: 1.5
            }
          }
        }
      }
    }
  });
