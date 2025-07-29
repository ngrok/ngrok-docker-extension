import React from 'react';
import { Box, Typography } from '@mui/material';
import { SettingsOutlined, ArticleOutlined, CheckCircle, Schedule } from '@mui/icons-material';
import { AgentStatus } from '../services/statusService';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { SquareIconButton, StatusChip, IconMedium } from './styled';
import ngrokLogo from '../assets/ngrok-logo.svg';

interface AppHeaderProps {
    status: AgentStatus;
    onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    status,
    onSettingsClick
}) => {
    const ddClient = createDockerDesktopClient();
    const latencyText = status.connectionLatency && status.connectionLatency > 0
        ? `${Math.round(status.connectionLatency)}ms latency`
        : 'Checking latency';

    const getLatencyColor = (latency?: number) => {
        if (!latency || latency <= 0) return '#8993a5'; // Default gray
        if (latency < 250) return '#2e7f74'; // Green for <250ms
        if (latency < 750) return '#ff9800'; // Yellow for <750ms
        return '#f44336'; // Red for >=750ms
    };

    const getStatusLabel = () => {
        switch (status.status) {
            case 'online': return 'CONNECTED';
            case 'offline': return 'DISCONNECTED';
            case 'reconnecting': return 'RECONNECTING';
            case 'unknown': return 'UNKNOWN';
            default: return 'UNKNOWN';
        }
    };

    const statusLabel = getStatusLabel();
    const isConnected = status.status === 'online';
    const latencyColor = getLatencyColor(status.connectionLatency);

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
            <Box display="flex" alignItems="center" gap={4}>
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
                    {/* Connection status chip */}
                    <StatusChip
                        status={status.status}
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
                <SquareIconButton onClick={handleDocsClick}>
                    <IconMedium>
                        <ArticleOutlined />
                    </IconMedium>
                </SquareIconButton>

                {/* Settings button */}
                <SquareIconButton onClick={onSettingsClick}>
                    <IconMedium>
                        <SettingsOutlined />
                    </IconMedium>
                </SquareIconButton>
            </Box>
        </Box>
    );
};
