import { useCallback, useState } from "react";
import {
    DataGrid,
    GridActionsCellItem,
    GridActionsColDef,
    GridColDef,
} from "@mui/x-data-grid";
import { Box, Tooltip, useMediaQuery, useTheme, Switch, FormControlLabel, IconButton } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { NgrokContainer, useNgrokContext } from "../NgrokContext";
import { EndpointConfig } from "../../types/api";
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
    hasError: boolean;
    errorMessage?: string;
    state?: string;
    isDeleted: boolean;
    expectedState?: "online" | "offline";
    hasEndpointConfig: boolean;
    isContainerRunning: boolean;
    actions: any[];
}

export type DataGridColumnType = (GridActionsColDef<ContainerGridRow, any, any> | GridColDef<ContainerGridRow, any, any>)[];

const ContainerGrid: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px
    const isSmall = useMediaQuery(theme.breakpoints.down('sm')); // < 600px

    const {
        containers,
        allDockerContainers,
        onlineEndpointsOnly,
        setOnlineEndpointsOnly,
        // New API-based methods
        apiEndpoints,
        createEndpoint,
        updateEndpoint,
        deleteEndpoint,
        toggleEndpointState
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
    const [togglingEndpoint, setTogglingEndpoint] = useState<Record<string, boolean>>({});

    // Helper functions to find endpoint data from new API structure
    const getEndpointForContainer = useCallback((containerId: string) => {
        return apiEndpoints.find(endpoint => endpoint.id === containerId);
    }, [apiEndpoints]);

    const getRunningEndpointForContainer = useCallback((containerId: string) => {
        const endpoint = getEndpointForContainer(containerId);
        return endpoint?.status.state === "online" ? endpoint : null;
    }, [getEndpointForContainer]);

    // Responsive column visibility
    const columnVisibilityModel = {
        id: false,
        // Hide less critical columns on mobile
        image: !isMobile,
        trafficPolicy: !isMobile,
        lastStarted: true, // Always show lastStarted for debugging
    };

    const getFilteredContainers = useCallback(() => {
        // Start with existing running containers
        const availableContainers = Object.values(containers);

        // Create a set to track containers we've already included
        const includedContainerIds = new Set<string>();
        const result: NgrokContainer[] = [];

        // First, add all running containers
        availableContainers.forEach(container => {
            includedContainerIds.add(container.id);
            result.push(container);
        });

        // Then, add any endpoints that don't have matching containers
        apiEndpoints.forEach(endpoint => {
                // Try to find a matching container in our containers list (running or stopped)
                const matchingContainer = availableContainers.find(c => 
                    endpoint.id === `${c.ContainerId}:${c.Port.PublicPort}`
                );

                if (!matchingContainer) {
                    // This endpoint doesn't have a matching container - check if container truly doesn't exist
                    const [containerId, portStr] = endpoint.id.split(':');
                    const port = parseInt(portStr);

                    // Check if the container exists in Docker (regardless of port)
                    const dockerContainer = allDockerContainers.find(c => c.Id === containerId);
                    
                    let containerName: string;
                    let image: string;
                    let imageId: string;
                    
                    if (dockerContainer) {
                        // Container exists in Docker but doesn't have this port published (probably stopped)
                        containerName = dockerContainer.Names[0].substring(1); // Remove leading '/'
                        image = dockerContainer.Image;
                        imageId = (dockerContainer as any).ImageID || '';
                        
                        // For offline containers, just show the published port (no private port)
                        const privatePort = undefined;
                        
                        // Create a synthetic container entry for this endpoint
                        const syntheticContainer: NgrokContainer = {
                            id: endpoint.id,
                            ContainerId: containerId,
                            Name: containerName,
                            Image: image,
                            ImageId: imageId,
                            Port: {
                                PublicPort: port,
                                PrivatePort: privatePort,
                                Type: 'tcp'
                            }
                        };
                        
                        if (!includedContainerIds.has(endpoint.id)) {
                            includedContainerIds.add(endpoint.id);
                            result.push(syntheticContainer);
                        }
                    } else {
                        // Container truly doesn't exist - it was deleted
                        containerName = '<deleted>';
                        image = '<deleted>';
                        imageId = '';
                        
                        // Create a synthetic container entry for this endpoint
                        const syntheticContainer: NgrokContainer = {
                            id: endpoint.id,
                            ContainerId: containerId,
                            Name: containerName,
                            Image: image,
                            ImageId: imageId,
                            Port: {
                                PublicPort: port,
                                PrivatePort: endpoint.targetPort ? parseInt(endpoint.targetPort) : undefined,
                                Type: 'tcp'
                            }
                        };
                        
                        if (!includedContainerIds.has(endpoint.id)) {
                            includedContainerIds.add(endpoint.id);
                            result.push(syntheticContainer);
                        }
                    }
                }
        });

        // Apply online filter if toggled on
        if (onlineEndpointsOnly) {
            return result.filter(container => {
                const runningEndpoint = getRunningEndpointForContainer(container.id);
                return runningEndpoint;
            });
        }

        return result;
    }, [containers, apiEndpoints, onlineEndpointsOnly, getRunningEndpointForContainer]);

    const transformContainerToRow = (container: NgrokContainer): ContainerGridRow => {
        const endpoint = getEndpointForContainer(container.id);
        const isEndpointOnline = endpoint?.status.state === "online";
        const hasError = Boolean(endpoint?.status.lastError && endpoint?.status.lastError.trim() !== '');
        const errorMessage = hasError ? endpoint?.status.lastError : undefined;
        const isDeleted = container.Name === '<deleted>' && container.Image === '<deleted>';
        const expectedState = endpoint?.expectedState ?? "offline";
        
        // Check if container is actually running in Docker (vs just having endpoint online)
        const isContainerRunning = Object.values(containers).some(c => c.id === container.id);
        


        // Format port as "publicport:privateport" if both are available, otherwise just show public port
        const portDisplay = container.Port.PrivatePort
            ? `${container.Port.PublicPort}:${container.Port.PrivatePort}`
            : container.Port.PublicPort.toString();

        // Determine URL display value
        let urlDisplay = '';
        if (isEndpointOnline) {
            urlDisplay = endpoint?.status.url || '';
        } else if (endpoint) {
            // Endpoint is configured but not online
            const configuredUrl = endpoint.url || '';
            if (configuredUrl.trim() === '') {
                urlDisplay = '<assigned-when-started>';
            } else {
                urlDisplay = configuredUrl;
            }
        }

        return {
            id: container.id,
            containerId: container.ContainerId,
            containerName: container.Name,
            image: container.Image,
            imageId: container.ImageId,
            port: portDisplay,
            url: urlDisplay,
            trafficPolicy: endpoint?.trafficPolicy ? 'YES' : 'NO',
            lastStarted: endpoint?.lastStarted || '',
            isOnline: isEndpointOnline,
            hasError: hasError,
            errorMessage: errorMessage,
            state: endpoint?.status.state,
            isDeleted: isDeleted,
            expectedState: expectedState,
            hasEndpointConfig: !!endpoint,
            isContainerRunning: isContainerRunning,
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

    // Handle toggle switch
    const handleToggleSwitch = async (rowId: string, desiredState: "online" | "offline") => {
        setTogglingEndpoint(prev => ({ ...prev, [rowId]: true }));
        try {
            await toggleEndpointState(rowId, desiredState);
        } finally {
            setTogglingEndpoint(prev => ({ ...prev, [rowId]: false }));
        }
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

        const hasConfiguration = getEndpointForContainer(row.id);

        if (hasConfiguration) {
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
            sortable: false,
            disableColumnMenu: true,
            align: 'center',
            width: 30,
            minWidth: 30,
            renderCell: (params) => <StatusIndicator isOnline={params.row.isOnline} hasError={params.row.hasError} errorMessage={params.row.errorMessage} state={params.row.state} hasEndpointConfig={params.row.hasEndpointConfig}/>
        },
        {
            field: 'endpointToggle',
            headerName: '',
            width: 60,
            sortable: false,
            disableColumnMenu: true,
            align: 'center',
            renderCell: (params) => {
                const hasConfig = !!getEndpointForContainer(params.row.id);
                
                if (!hasConfig) {
                    // Show create endpoint button when no configuration exists
                    return (
                        <Tooltip title="Create endpoint">
                            <IconButton 
                                size="small"
                                onClick={() => handleCreateConfiguration(params.row.id)}
                            >
                                <AddCircleIcon />
                            </IconButton>
                        </Tooltip>
                    );
                }

                const loading = togglingEndpoint[params.row.id];
                const isOnline = params.row.expectedState === 'online';
                const isDeleted = params.row.isDeleted;
                
                // Allow switch to work for deleted containers if endpoint is online
                const isDisabled = loading || (isDeleted && !isOnline);
                
                // Determine tooltip message
                let tooltipMessage;
                if (isDeleted && !isOnline) {
                    tooltipMessage = 'Cannot start an endpoint to a deleted container';
                } else {
                    tooltipMessage = isOnline ? 'Set Offline' : 'Set Online';
                }

                return (
                    <Tooltip title={tooltipMessage}>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    color="primary"
                                    checked={isOnline}
                                    disabled={isDisabled}
                                    onChange={(_, checked) =>
                                        handleToggleSwitch(params.row.id, checked ? 'online' : 'offline')
                                    }
                                />
                            }
                            label=""
                        />
                    </Tooltip>
                );
            }
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
                    isDeleted={params.row.isDeleted}
                    hasEndpointConfig={params.row.hasEndpointConfig}
                    isContainerRunning={params.row.isContainerRunning}
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
                    isDeleted={params.row.isDeleted}
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
            headerName: '',
            type: 'actions',
            width: 50,
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
            } else {
                // For deleted containers, we need to find the endpoint info
                const endpoint = getEndpointForContainer(moreMenuContainerId);
                if (endpoint) {
                    // Create a synthetic container object for the edit dialog
                    const [containerId, portStr] = moreMenuContainerId.split(':');
                    const port = parseInt(portStr);
                    const syntheticContainer: NgrokContainer = {
                        id: moreMenuContainerId,
                        ContainerId: containerId,
                        Name: '<deleted>',
                        Image: '<deleted>',
                        ImageId: '',
                        Port: {
                            PublicPort: port,
                            PrivatePort: endpoint.targetPort ? parseInt(endpoint.targetPort) : undefined,
                            Type: 'tcp'
                        }
                    };
                    setCurrentContainer(syntheticContainer);
                    setEditDialogOpen(true);
                }
            }
        }
        handleCloseMoreMenu();
    };

    const handleDeleteEndpoint = async () => {
        if (!moreMenuContainerId) return;

        // Remove configuration using new API (DELETE handles stopping the endpoint if running)
        try {
            // moreMenuContainerId is already the endpoint ID (containerId:port format)
            await deleteEndpoint(moreMenuContainerId);
        } catch (error) {
            console.error('Failed to delete endpoint:', error);
        }
    };

    const handleStartEndpoint = async (containerRowId: string, configOverride?: EndpointConfig) => {
        const container = Object.values(containers).find(c => c.id === containerRowId);
        const config = configOverride || getEndpointForContainer(containerRowId);
        if (!container || !config) return;

        setCreatingEndpoint({ ...creatingEndpoint, [containerRowId]: true });

        try {
            // containerRowId is already the endpoint ID (containerId:port format)
            const endpointId = containerRowId;
            
            // Check if endpoint config already exists
            const existingEndpoint = getEndpointForContainer(endpointId);
            
            if (existingEndpoint) {
                // Just toggle to online
                await toggleEndpointState(endpointId, "online");
            } else {
                // Create new endpoint configuration
                const newEndpointConfig: EndpointConfig = {
                    id: endpointId,
                    containerId: container.ContainerId,
                    targetPort: container.Port.PublicPort.toString(),
                    url: config.url,
                    binding: config.binding,
                    poolingEnabled: config.poolingEnabled || false,
                    trafficPolicy: config.trafficPolicy,
                    description: config.description,
                    metadata: config.metadata,
                    expectedState: "online"
                };
                
                await createEndpoint(newEndpointConfig);
            }

            ddClient.desktopUI.toast.success("Endpoint starting");
        } catch (error: any) {
            let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
            ddClient.desktopUI.toast.error(errMsg);
        } finally {
            setCreatingEndpoint({ ...creatingEndpoint, [containerRowId]: false });
        }
    };



    const handleCreationDialogNext = (_stepOneConfig: StepOneConfig) => {
        // Step one completed, moving to step two - no action needed
    };

    const handleCreationDialogComplete = async (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => {
        if (!currentContainer) return;

        // Create endpoint configuration from both steps
        const config: EndpointConfig = {
            id: currentContainer.id,
            containerId: currentContainer.ContainerId,
            targetPort: currentContainer.Port.PublicPort.toString(),
            url: stepOne.url || '',
            binding: stepOne.binding,
            poolingEnabled: stepOne.additionalOptions.poolingEnabled,
            trafficPolicy: stepTwo.trafficPolicy,
            description: stepOne.additionalOptions.description,
            metadata: stepOne.additionalOptions.metadata,
            expectedState: "online"
        };

        // Create configuration and start endpoint using new API
        await handleStartEndpoint(currentContainer.id, config);

        setCreationDialogOpen(false);
        setCurrentContainer(null);
    };

    const handleEditDialogComplete = async (stepOne: StepOneConfig, stepTwo: StepTwoConfig) => {
        if (!currentContainer) return;

        // Create updated endpoint configuration
        const currentEndpoint = getEndpointForContainer(currentContainer.id);
        const updatedConfig: EndpointConfig = {
            id: currentContainer.id,
            containerId: currentContainer.ContainerId,
            targetPort: currentContainer.Port.PublicPort.toString(),
            url: stepOne.url || '',
            binding: stepOne.binding,
            poolingEnabled: stepOne.additionalOptions.poolingEnabled,
            trafficPolicy: stepTwo.trafficPolicy,
            description: stepOne.additionalOptions.description,
            metadata: stepOne.additionalOptions.metadata,
            expectedState: currentEndpoint?.expectedState || "offline"
        };

        // Save updated configuration using new API (PUT handles restarting if configuration changed)
        await updateEndpoint(currentContainer.id, updatedConfig);

        // Close dialog
        setEditDialogOpen(false);
        setCurrentContainer(null);
    };

    // Normal grid view
    return (
        <Box sx={{ width: '100%', minWidth: 0,}}>
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

            {currentContainer && getEndpointForContainer(currentContainer.id) && (
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
                    existingConfig={getEndpointForContainer(currentContainer.id)!}
                    isEndpointOnline={!!getRunningEndpointForContainer(currentContainer.id)}
                />
            )}



            {moreMenuContainerId && (
                <MoreActionsMenu
                    containerId={moreMenuContainerId}
                    isOnline={!!getRunningEndpointForContainer(moreMenuContainerId)}
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
                rowHeight={40}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 10 },
                    },
                    sorting: {
                        sortModel: [{ field: 'lastStarted', sort: 'desc' }],
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
                    
                    //Hide border between Status and Toggle header cells.
                    '& .MuiDataGrid-columnHeader[data-field="status"]': {
                        '.MuiDataGrid-iconSeparator' : {display: 'none !important'},
                    },
                    '& .MuiDataGrid-cell[data-field="containerName"]': {
                        display: 'flex',
                        alignItems: 'center'
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
