import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography, Switch, Tooltip } from '@mui/material';
import { CheckCircle, PowerSettingsNew, PowerOff, Pending, ErrorOutline } from '@mui/icons-material';

interface StatusChipProps {
    status: 'online' | 'offline' | 'connecting' | 'connectingError' | 'unknown';
    latency?: number; // Optional latency in nanoseconds for online state
    expectedState: "online" | "offline";
    onToggleAgentState: (expectedState: "online" | "offline") => void;
    icon?: React.ReactNode;
    label?: string;
    variant?: string;
    size?: string;
}

const getStateStyles = (status: string) => {
    switch (status) {
        case 'online':
            return {
                backgroundColor: '#e6f5f3', // Light green from Figma
                iconBackgroundColor: '#2e7d32', // Green from Figma
                secondaryTextColor: '#2e7d32', // Green from Figma
            };
        case 'connectingError':
            return {
                backgroundColor: '#fdeaea', // Light red from Figma
                iconBackgroundColor: '#d52536', // Red from Figma
                secondaryTextColor: '#d52536', // Red from Figma
            };
        case 'offline':
        case 'connecting':
        case 'unknown':
        default:
            return {
                backgroundColor: '#efeff2', // Light gray from Figma
                iconBackgroundColor: '#677285', // Gray from Figma
                secondaryTextColor: '#8993a5', // Gray text from Figma
            };
    }
};

const getSecondaryText = (status: string, latency?: number) => {
    switch (status) {
        case 'online':
            if (latency && latency > 0) {
                const latencyMs = Math.round(latency / 1000000);
                return `Online: ${latencyMs}ms latency`;
            }
            return 'Online';
        case 'offline':
            return 'Offline';
        case 'connecting':
            return 'Connecting...';
        case 'connectingError':
            return 'Connection Error';
        case 'unknown':
        default:
            return 'Unknown';
    }
};

const StyledStatusContainer = styled(Box, {
    shouldForwardProp: (prop) => !['status', 'latency', 'expectedState', 'onToggleAgentState'].includes(prop as string)
})<StatusChipProps>(({ theme, status }) => {
    const styles = getStateStyles(status);

    return {
        backgroundColor: styles.backgroundColor,
        borderRadius: '50px',
        padding: '4px 8px', // px-2 py-1 from Figma
        height: 'auto',
        minHeight: theme.spacing(4),
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        overflow: 'hidden',
        width: '250px', // Fixed width as per Figma
    };
});

const IconContainer = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'status'
})<{ status: string }>(({ theme, status }) => {
    const styles = getStateStyles(status);

    return {
        backgroundColor: styles.iconBackgroundColor,
        borderRadius: '50%',
        width: theme.spacing(3),
        height: theme.spacing(3),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        '& svg': {
            color: '#ffffff',
            width: '18px',
            height: '18px',
        },
    };
});

const ContentContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.375), // 3px as per Figma
    alignItems: 'flex-start',
    flexGrow: 1,
    minWidth: 0, // Allow text to wrap
    paddingRight: theme.spacing(2),
}));

const PrimaryText = styled(Typography)(() => ({
    fontFamily: 'Roboto',
    fontWeight: 500,
    fontSize: '14px',
    color: '#000000',
    lineHeight: 'normal',
    whiteSpace: 'nowrap',
}));

const SecondaryText = styled(Typography, {
    shouldForwardProp: (prop) => prop !== 'status'
})<{ status: string }>(({ status }) => {
    const styles = getStateStyles(status);

    return {
        fontFamily: 'Roboto',
        fontWeight: 400,
        fontSize: '11px',
        color: styles.secondaryTextColor,
        lineHeight: 'normal',
        whiteSpace: 'nowrap',
    };
});

export const StatusChip: React.FC<StatusChipProps> = ({
    status,
    latency,
    expectedState,
    onToggleAgentState,
    ...otherProps
}) => {
    const secondaryText = getSecondaryText(status, latency);

    return (
        <StyledStatusContainer
            status={status}
            latency={latency}
            expectedState={expectedState}
            onToggleAgentState={onToggleAgentState}
            {...otherProps}
        >
            <IconContainer status={status}>
                {status === 'online' ? <PowerSettingsNew /> : 
                 status === 'offline' ? <PowerOff /> :
                 status === 'connectingError' && expectedState === 'online' ? <ErrorOutline /> :
                 (status === 'connecting' || status === 'connectingError') ? 
                 <Pending /> : 
                 <CheckCircle />}
            </IconContainer>
            <ContentContainer>
                <PrimaryText>ngrok agent</PrimaryText>
                <SecondaryText status={status}>{secondaryText}</SecondaryText>
            </ContentContainer>
            <Tooltip title={`Turn agent ${expectedState === 'online' ? 'offline' : 'online'}`} arrow>
                <Switch
                    checked={expectedState === 'online'}
                    onChange={(e) => onToggleAgentState(e.target.checked ? 'online' : 'offline')}
                    size="small"
                    sx={{
                        '& .MuiSwitch-track': {
                            backgroundColor: 
                                expectedState === 'online' && status === 'online' ? '#4caf50 !important' :
                                expectedState === 'online' && (status === 'connecting' || status === 'connectingError') ? 'rgba(0,0,0,0.5) !important' :
                                expectedState === 'online' ? '#8BC7F5 !important' : 'rgba(0,0,0,0.5) !important',
                        },
                        '& .MuiSwitch-thumb': {
                            backgroundColor: 
                                expectedState === 'online' && status === 'online' ? '#2e7d32 !important' :
                                expectedState === 'online' && (status === 'connecting' || status === 'connectingError') ? '#ffffff !important' :
                                expectedState === 'online' ? '#116ED0 !important' : '#ffffff !important',
                        }
                    }}
                />
            </Tooltip>
        </StyledStatusContainer>
    );
};
