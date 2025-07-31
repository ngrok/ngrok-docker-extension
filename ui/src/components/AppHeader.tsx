import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { SettingsOutlined, MenuBookOutlined } from '@mui/icons-material';
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

    const getComputedStatus = () => {
        if (status.state === 'connecting') {
            return status.lastError && status.lastError.trim() !== '' ? 'connectingError' : 'connecting';
        }
        return status.state;
    };

    const isConnected = status.state === 'online';

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

            </Box>

            {/* Right section: Status chip and action buttons */}
            <Box display="flex" alignItems="center" gap={2}>
                {/* Connection status chip with integrated latency and switch */}
                <StatusChip
                    status={getComputedStatus()}
                    latency={isConnected ? status.latency : undefined}
                    expectedState={expectedState}
                    onToggleAgentState={onToggleAgentState}
                />
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
