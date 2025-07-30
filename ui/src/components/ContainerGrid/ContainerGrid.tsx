import { useCallback, useState } from "react";
import {
    DataGrid,
    GridActionsCellItem,
    GridActionsColDef,
    GridColDef,
} from "@mui/x-data-grid";
import { Box, CircularProgress, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { NgrokContainer, EndpointConfiguration, RunningEndpoint, useNgrokContext } from "../NgrokContext";
import { statusService } from '../../services/statusService';
import AlertDialog from "../AlertDialog";
import EndpointCreationDialog, { StepOneConfig, StepTwoConfig } from "../EndpointCreationDialog";
import EditEndpointDialog from "../EditEndpointDialog";

// Sub-components
import EmptyState from "./components/EmptyState";
import OnlineEndpointsToggle from "./components/OnlineEndpointsToggle";
import StatusIndicator from "./components/StatusIndicator";
import ClickableContainerName from "./components/ClickableContainerName";
import ClickableImageName from "./components/ClickableImageName";
import UrlCell from "./components/UrlCell";
import TrafficPolicyChip from "./components/TrafficPolicyChip";
import LastStartedCell from "./components/LastStartedCell";
import MoreActionsMenu from "./components/MoreActionsMenu";

const ddClient = createDockerDesktopClient();

interface ContainerGridRow {
    id: string;
    containerId: string;
    containerName: string;
    image: string;
    imageId: string;
    port: string; // Changed to string to support "publicport:privateport" format
    url: string;
    trafficPolicy: 'YES' | 'NO';
    lastStarted: string;
    isOnline: boolean;
    actions: any[];
}

export type DataGridColumnType = (GridActionsColDef<ContainerGridRow, any, any> | GridColDef<ContainerGridRow, any, any>)[];

const ContainerGrid: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px
    const isSmall = useMediaQuery(theme.breakpoints.down('sm')); // < 600px

    const {
        containers,
        runningEndpoints,
        endpointConfigurations,
        onlineEndpointsOnly,
        setOnlineEndpointsOnly,
        setRunningEndpoints,
        createEndpointConfiguration,
        updateEndpointConfiguration,
        deleteEndpointConfiguration
    } = useNgrokContext();

    // Dialog state
    const [creationDialogOpen, setCreationDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [currentContainer, setCurrentContainer] = useState<NgrokContainer | null>(null);

    // Alert dialog state
    const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);

    // More actions menu state
    const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [moreMenuContainerId, setMoreMenuContainerId] = useState<string | null>(null);

    const [creatingEndpoint, setCreatingEndpoint] = useState<Record<string, boolean>>({});
    const [removingEndpoint, setRemovingEndpoint] = useState<boolean>(false);

    // Responsive column visibility
    const columnVisibilityModel = {
        id: false,
        // Hide less critical columns on mobile
        image: !isMobile,
        trafficPolicy: !isMobile,
        lastStarted: !isSmall,
    };

    const getFilteredContainers = useCallback(() => {
        // Containers are already appropriately filtered by existing logic
        const availableContainers = Object.values(containers);

        // Only apply online filter if toggled on
        if (onlineEndpointsOnly) {
            return availableContainers.filter(container => {
                const hasRunningEndpoint = runningEndpoints[container.id];
                return hasRunningEndpoint;
            });
        }

        return availableContainers;
    }, [containers, runningEndpoints, onlineEndpointsOnly]);

    const transformContainerToRow = (container: NgrokContainer): ContainerGridRow => {
        const runningEndpoint = runningEndpoints[container.id];
        const config = endpointConfigurations[container.id];


        // Format port as "publicport:privateport" if both are available, otherwise just show public port
        const portDisplay = container.Port.PrivatePort
            ? `${container.Port.PublicPort}:${container.Port.PrivatePort}`
            : container.Port.PublicPort.toString();

        return {
            id: container.id,
            containerId: container.ContainerId,
            containerName: container.Name,
            image: container.Image,
            imageId: container.ImageId,
            port: portDisplay,
            url: runningEndpoint?.url || config?.url || '',
            trafficPolicy: config?.trafficPolicy ? 'YES' : 'NO',
            lastStarted: runningEndpoint?.lastStarted || config?.lastStarted || '',
            isOnline: !!runningEndpoint, // Same logic as showing stop button
            actions: []
        };
    };

    const filteredContainers = getFilteredContainers();
    const allContainers = Object.values(containers);
    const hasContainersWithPorts = filteredContainers.length > 0;

    // Handle remove filter functionality
    const handleRemoveFilter = () => {
        setOnlineEndpointsOnly(false);
    };

    // Show empty state if no containers with ports exist
    if (!hasContainersWithPorts) {
        // Check if we're in filtered mode with containers available but none online
        const isFiltered = onlineEndpointsOnly && allContainers.length > 0;

        return (
            <Box sx={{ width: '100%', minWidth: 0 }}>
                <OnlineEndpointsToggle hasContainersWithPorts={false} />
                <EmptyState
                    isFiltered={isFiltered}
                    onRemoveFilter={handleRemoveFilter}
                />
            </Box>
        );
    }

    const generateActionButtons = (row: ContainerGridRow) => {
        const actions: any[] = [];

        if (creatingEndpoint[row.id]) {
            return [
                <GridActionsCellItem
                    className="circular-progress"
                    key={"loading_" + row.containerId}
                    icon={<CircularProgress size={20} />}
                    label="Loading"
                    showInMenu={false}
                />,
            ];
        }

        if (!row.port || row.port === "0") {
            return [
                <GridActionsCellItem
                    key={"action_info_" + row.containerId}
                    icon={
                        <Tooltip
                            title={`This container doesn't have a published port. Use docker run with the "-p" option to publish a port.`}
                        >
                            <InfoOutlinedIcon />
                        </Tooltip>
                    }
                    label="Info"
                />,
            ];
        }

        const hasConfiguration = endpointConfigurations[row.id];

        if (!hasConfiguration) {
            // Show create configuration button instead of play
            actions.push(
                <GridActionsCellItem
                    key={"action_create_" + row.containerId}
                    icon={
                        <Tooltip title="Create endpoint"><PlayArrowIcon /></Tooltip>
                    }
                    onClick={() => handleCreateConfiguration(row.id)}
                    label="Create endpoint"
                />
            );
        } else {
            // Has configuration - show play/stop based on online status
            if (row.isOnline) {
                // Stop button  
                actions.push(
                    <GridActionsCellItem
                        key={"action_stop_" + row.containerId}
                        icon={
                            <Tooltip title="Stop endpoint"><StopIcon /></Tooltip>
                        }
                        onClick={() => handleStopEndpoint(row.id)}
                        label="Stop endpoint"
                        disabled={removingEndpoint}
                    />
                );
            } else {
                // Start button
                actions.push(
                    <GridActionsCellItem
                        key={"action_start_" + row.containerId}
                        icon={
                            <Tooltip title="Start endpoint"><PlayArrowIcon /></Tooltip>
                        }
                        onClick={() => handleStartEndpoint(row.id)}
                        label="Start endpoint"
                        disabled={creatingEndpoint[row.id]}
                    />
                );
            }

            // More actions menu (triple dot) - only show if has configuration
            actions.push(
                <GridActionsCellItem
                    key={"action_more_" + row.containerId}
                    icon={
                        <Tooltip title="More"><MoreVertIcon /></Tooltip>
                    }
                    onClick={(event: React.MouseEvent<HTMLElement>) => handleMoreActions(row.id, event)}
                    label="More"
                />
            );
        }

        return actions;
    };

    const columns: DataGridColumnType = [
        {
            field: 'status',
            headerName: '',
            width: isSmall ? 40 : 50,
            sortable: false,
            renderCell: (params) => <StatusIndicator isOnline={params.row.isOnline} />
        },
        {
            field: 'containerName',
            headerName: 'Container',
            flex: 1,
            minWidth: isSmall ? 80 : 100,
            renderCell: (params) => (
                <ClickableContainerName
                    name={params.value}
                    containerId={params.row.containerId}
                    isOnline={params.row.isOnline}
                />
            )
        },
        {
            field: 'image',
            headerName: 'Image',
            flex: isMobile ? 0 : 1.5,
            minWidth: isMobile ? 0 : 120,
            renderCell: (params) => (
                <ClickableImageName
                    image={params.value}
                    imageId={params.row.imageId}
                    isOnline={params.row.isOnline}
                />
            )
        },
        {
            field: 'port',
            headerName: 'Port',
            width: isSmall ? 60 : 90,
            renderCell: (params) => (
                <Box sx={{ 
                    fontWeight: params.row.isOnline ? 500 : 400,
                    fontSize: theme.typography.body2.fontSize
                }}>
                    {params.value}
                </Box>
            )
        },
        {
            field: 'url',
            headerName: 'URL',
            flex: 2,
            minWidth: isSmall ? 120 : 160,
            renderCell: (params) => (
                <UrlCell url={params.value} isOnline={params.row.isOnline} />
            )
        },
        {
            field: 'trafficPolicy',
            headerName: 'Traffic Policy',
            width: 120,
            renderCell: (params) => (
                <TrafficPolicyChip
                    enabled={params.value === 'YES'}
                    isOnline={params.row.isOnline}
                />
            )
        },
        {
            field: 'lastStarted',
            headerName: 'Last Started',
            width: 120,
            renderCell: (params) => (
                <LastStartedCell
                    timestamp={params.value}
                    isOnline={params.row.isOnline}
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            type: 'actions',
            width: isSmall ? 80 : 100,
            getActions: (params) => generateActionButtons(params.row)
        }
    ];

    const handleMoreActions = (containerRowId: string, event: React.MouseEvent<HTMLElement>) => {
        setMoreMenuContainerId(containerRowId);
        setMoreMenuAnchorEl(event.currentTarget);
    };

    const handleCloseMoreMenu = () => {
        setMoreMenuAnchorEl(null);
        setMoreMenuContainerId(null);
    };

    const handleCreateConfiguration = (containerRowId: string) => {
        const container = Object.values(containers).find(c => c.id === containerRowId);
        if (!container) return;

        setCurrentContainer(container);
        setCreationDialogOpen(true);
    };

    const handleEditEndpoint = () => {
        if (moreMenuContainerId) {
            const container = Object.values(containers).find(c => c.id === moreMenuContainerId);
            if (container) {
                setCurrentContainer(container);
                setEditDialogOpen(true);
            }
        }
        handleCloseMoreMenu();
    };

    const handleDeleteEndpoint = () => {
        if (!moreMenuContainerId) return;

        if (runningEndpoints[moreMenuContainerId]) {
            // Stop running endpoint first
            handleStopEndpoint(moreMenuContainerId);
        }
        // Remove configuration
        deleteEndpointConfiguration(moreMenuContainerId);
    };

    const handleStartEndpoint = async (containerRowId: string, configOverride?: EndpointConfiguration) => {
        const container = Object.values(containers).find(c => c.id === containerRowId);
        const config = configOverride || endpointConfigurations[containerRowId];
        if (!container || !config) return;

        setCreatingEndpoint({ ...creatingEndpoint, [containerRowId]: true });

        try {
            // Wrap the POST request with a timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 5 seconds')), 5000);
            });

            const postPromise = ddClient.extension.vm?.service?.post('/create_endpoint', {
                containerId: container.ContainerId,
                targetPort: container.Port.PublicPort.toString(),
                url: config.url,
                binding: config.binding,
                poolingEnabled: config.poolingEnabled,
                trafficPolicy: config.trafficPolicy,
                description: config.description,
                metadata: config.metadata,
            });

            const response: any = await Promise.race([postPromise, timeoutPromise]);

            // Handle both old and new response structures (Docker Desktop API change)
            const endpointData = response.data?.endpoint || response.endpoint;
            if (!endpointData || !endpointData.url) {
                throw new Error(`Unexpected response from create_endpoint: ${JSON.stringify(response)}`);
            }

            // Add to running endpoints
            const currentTimestamp = new Date().toISOString();
            const runningEndpoint: RunningEndpoint = {
                id: container.id,
                url: endpointData.url,
                containerId: container.ContainerId,
                targetPort: container.Port.PublicPort.toString(),
                lastStarted: currentTimestamp
            };
            setRunningEndpoints({ ...runningEndpoints, [container.id]: runningEndpoint });

            // Update configuration to persist lastStarted timestamp
            const updatedConfig = { ...config, lastStarted: currentTimestamp };
            updateEndpointConfiguration(container.id, updatedConfig);

            // Trigger immediate status check after successful endpoint creation
            statusService.checkStatusNow();

            ddClient.desktopUI.toast.success(
                `Endpoint started at ${endpointData.url}`
            );
        } catch (error: any) {
            console.log(error);
            let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
            ddClient.desktopUI.toast.error(errMsg);
        } finally {
            setCreatingEndpoint({ ...creatingEndpoint, [containerRowId]: false });
        }
    };

    const handleStopEndpoint = async (containerRowId: string) => {
        const container = Object.values(containers).find(c => c.id === containerRowId);
        if (!container) return;

        setRemovingEndpoint(true);

        try {
            // Wrap the POST request with a timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 5 seconds')), 5000);
            });

            const postPromise = ddClient.extension.vm?.service?.post('/remove_endpoint', {
                containerId: container.ContainerId,
                targetPort: container.Port.PublicPort.toString()
            });

            await Promise.race([postPromise, timeoutPromise]);

            // Remove from running endpoints but keep configuration
            const updatedRunningEndpoints = { ...runningEndpoints };
            delete updatedRunningEndpoints[container.id];
            setRunningEndpoints(updatedRunningEndpoints);

            // Trigger immediate status check after successful endpoint removal
            statusService.checkStatusNow();

            ddClient.desktopUI.toast.success("Endpoint stopped");
        } catch (error: any) {
            console.log(error);
            let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
            ddClient.desktopUI.toast.error(errMsg);
        } finally {
            setRemovingEndpoint(false);
        }
    };

    const handleCreationDialogNext = (_stepOneConfig: StepOneConfig) => {
        // Step one completed, moving to step two - no action needed
    };

    const handleCreationDialogComplete = (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => {
        if (!currentContainer) return;

        // Create endpoint configuration from both steps
        const config: EndpointConfiguration = {
            id: currentContainer.id,
            containerId: currentContainer.ContainerId,
            targetPort: currentContainer.Port.PublicPort.toString(),
            url: stepOne.url || '',
            binding: stepOne.binding,
            poolingEnabled: stepOne.additionalOptions.poolingEnabled,
            trafficPolicy: stepTwo.trafficPolicy,
            description: stepOne.additionalOptions.description,
            metadata: stepOne.additionalOptions.metadata,
        };

        // Create configuration and start endpoint
        createEndpointConfiguration(config);
        handleStartEndpoint(currentContainer.id, config);

        setCreationDialogOpen(false);
        setCurrentContainer(null);
    };

    const handleEditDialogComplete = async (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => {
        if (!currentContainer) return;

        // Create updated endpoint configuration
        const updatedConfig: EndpointConfiguration = {
            id: currentContainer.id,
            containerId: currentContainer.ContainerId,
            targetPort: currentContainer.Port.PublicPort.toString(),
            url: stepOne.url || '',
            binding: stepOne.binding,
            poolingEnabled: stepOne.additionalOptions.poolingEnabled,
            trafficPolicy: stepTwo.trafficPolicy,
            description: stepOne.additionalOptions.description,
            metadata: stepOne.additionalOptions.metadata,
            lastStarted: endpointConfigurations[currentContainer.id]?.lastStarted
        };

        // Save updated configuration
        updateEndpointConfiguration(currentContainer.id, updatedConfig);

        // If endpoint is online, we need to restart it with new config
        const isOnline = !!runningEndpoints[currentContainer.id];
        if (isOnline) {
            // Stop the current endpoint first
            await handleStopEndpoint(currentContainer.id);
            // Start with new configuration
            handleStartEndpoint(currentContainer.id, updatedConfig);
        }

        // Close dialog
        setEditDialogOpen(false);
        setCurrentContainer(null);
    };

    // Normal grid view
    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <OnlineEndpointsToggle hasContainersWithPorts={true} />
            <AlertDialog
                open={showAlertDialog}
                msg=""
                onClose={() => setShowAlertDialog(false)}
            />

            <EndpointCreationDialog
                open={creationDialogOpen}
                onClose={() => setCreationDialogOpen(false)}
                onNext={handleCreationDialogNext}
                onComplete={handleCreationDialogComplete}
                containerInfo={{
                    imageName: currentContainer?.Image || '',
                    containerName: currentContainer?.Name || '',
                    containerID: currentContainer?.ContainerId || '',
                    targetPort: currentContainer?.Port.PublicPort.toString() || ''
                }}
            />

            {currentContainer && endpointConfigurations[currentContainer.id] && (
                <EditEndpointDialog
                    open={editDialogOpen}
                    onClose={() => setEditDialogOpen(false)}
                    onComplete={handleEditDialogComplete}
                    containerInfo={{
                        imageName: currentContainer.Image,
                        containerName: currentContainer.Name,
                        containerID: currentContainer.ContainerId,
                        targetPort: currentContainer.Port.PublicPort.toString()
                    }}
                    existingConfig={endpointConfigurations[currentContainer.id]}
                    isEndpointOnline={!!runningEndpoints[currentContainer.id]}
                />
            )}



            {moreMenuContainerId && (
                <MoreActionsMenu
                    containerId={moreMenuContainerId}
                    isOnline={!!runningEndpoints[moreMenuContainerId]}
                    anchorEl={moreMenuAnchorEl}
                    onClose={handleCloseMoreMenu}
                    onEditEndpoint={handleEditEndpoint}
                    onDeleteEndpoint={handleDeleteEndpoint}
                />
            )}

            <DataGrid
                rows={filteredContainers.map(transformContainerToRow)}
                columns={columns}
                columnVisibilityModel={columnVisibilityModel}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 10 },
                    },
                }}
                pageSizeOptions={[10]}
                checkboxSelection={false}
                disableRowSelectionOnClick={true}
                autoHeight
                sx={{
                    width: '100%',
                    minWidth: 0,
                    // Keep minimal styling that doesn't conflict with Docker's DataGrid theme
                    '& .MuiDataGrid-cell[data-field="status"]': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    },
                    '& .MuiDataGrid-cell[data-field="trafficPolicy"]': {
                        display: 'flex',
                        alignItems: 'center'
                    },
                    '& .MuiDataGrid-cell[data-field="lastStarted"]': {
                        display: 'flex',
                        alignItems: 'center'
                    },
                    '& .MuiDataGrid-columnHeader[data-field="actions"]': {
                        justifyContent: 'flex-end'
                    },
                    '& .MuiDataGrid-cell[data-field="actions"]': {
                        justifyContent: 'flex-start',
                        gap: '4px'
                    },
                    '& .MuiDataGrid-cell[data-field="url"]': {
                        overflow: 'visible'
                    },
                    '& .MuiIconButton-root.circular-progress': {
                        backgroundColor: 'transparent',
                        '&:hover': {
                            backgroundColor: 'transparent'
                        }
                    }
                }}
            />
        </Box>
    );
};

export default ContainerGrid;
