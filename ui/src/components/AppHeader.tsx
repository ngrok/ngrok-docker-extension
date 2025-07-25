import React from 'react';
import { Box, Typography, Tooltip, Switch } from '@mui/material';
import { SettingsOutlined, MenuBookOutlined, CheckCircle, Schedule } from '@mui/icons-material';
import { AgentStatus } from '../types/api';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { SquareIconButton, StatusChip, IconMedium } from './styled';
import ngrokLogo from '../assets/ngrok-logo.svg';

interface AppHeaderProps {
    status: AgentStatus;
    expectedState: "online" | "offline";
    onToggleAgentState: (expectedState: "online" | "offline") => void;
    onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    status,
    expectedState,
    onToggleAgentState,
    onSettingsClick
}) => {
    const ddClient = createDockerDesktopClient();
    const latencyText = status.latency && status.latency > 0
        ? `${Math.round(status.latency / 1000000)}ms latency`
        : 'Checking latency';

    const getLatencyColor = (latency?: number) => {
        if (!latency || latency <= 0) return '#8993a5'; // Default gray
        const latencyMs = latency / 1000000; // Convert nanoseconds to milliseconds
        if (latencyMs < 250) return '#2e7f74'; // Green for <250ms
        if (latencyMs < 750) return '#ff9800'; // Yellow for <750ms
        return '#f44336'; // Red for >=750ms
    };

    const getComputedStatus = () => {
        if (status.state === 'connecting') {
            return status.lastError && status.lastError.trim() !== '' ? 'connectingError' : 'connecting';
        }
        return status.state;
    };

    const getStatusLabel = () => {
        switch (status.state) {
            case 'online': return 'ONLINE';
            case 'offline': return 'OFFLINE';
            case 'connecting': return 'CONNECTING';
            case 'unknown': return 'UNKNOWN';
            default: return 'UNKNOWN';
        }
    };

    const statusLabel = getStatusLabel();
    const isConnected = status.state === 'online';
    const latencyColor = getLatencyColor(status.latency);

    const handleDocsClick = () => {
        ddClient.host.openExternal('https://ngrok.com/docs');
    };

    return (
        <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            sx={{ width: '100%' }}
        >
            {/* Left section: Title and status indicators */}
            <Box display="flex" alignItems="center" gap={2}>
                {/* ngrok wordmark */}
                <Box
                    component="img"
                    src={ngrokLogo}
                    alt="ngrok"
                    sx={{
                        height: 23,
                        width: 'auto',
                        flexShrink: 0,
                    }}
                />

                {/* Status indicators */}
                <Box display="flex" alignItems="center" gap={2}>
                    {/* Agent toggle switch */}
                    <Tooltip title={`Turn agent ${expectedState === 'online' ? 'offline' : 'online'}`} arrow>
                        <Switch
                            checked={expectedState === 'online'}
                            onChange={(e) => onToggleAgentState(e.target.checked ? 'online' : 'offline')}
                            size="small"
                            sx={{
                                '& .MuiSwitch-track': {
                                    backgroundColor: expectedState === 'online' ? '#2e7f74' : '#8993a5',
                                },
                                '& .MuiSwitch-thumb': {
                                    backgroundColor: '#ffffff',
                                }
                            }}
                        />
                    </Tooltip>

                    {/* Connection status chip */}
                    <StatusChip
                        status={getComputedStatus()}
                        icon={<CheckCircle />}
                        label={statusLabel}
                        variant="outlined"
                        size="small"
                    />

                    {/* Latency display - only show when connected */}
                    {isConnected && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Schedule
                                sx={{
                                    color: latencyColor,
                                    width: 14,
                                    height: 14,
                                }}
                            />
                            <Typography
                                sx={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 500,
                                    fontSize: 10,
                                    color: latencyColor,
                                    letterSpacing: '0.15px',
                                    textTransform: 'uppercase',
                                    lineHeight: 1.1,
                                }}
                            >
                                {latencyText}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Right section: Action buttons */}
            <Box display="flex" alignItems="center">
                {/* Docs button */}
                <Tooltip title="Documentation" arrow>
                    <SquareIconButton onClick={handleDocsClick}>
                        <IconMedium>
                            <MenuBookOutlined />
                        </IconMedium>
                    </SquareIconButton>
                </Tooltip>

                {/* Settings button */}
                <Tooltip title="Settings" arrow>
                    <SquareIconButton onClick={onSettingsClick}>
                        <IconMedium>
                            <SettingsOutlined />
                        </IconMedium>
                    </SquareIconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};
