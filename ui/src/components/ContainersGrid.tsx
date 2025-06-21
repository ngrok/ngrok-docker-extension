import { useEffect, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,

} from "@mui/x-data-grid";
import { CircularProgress, Tooltip, Typography, Popover, Paper, Button, Stack } from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import LanguageIcon from "@mui/icons-material/Language";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import StopIcon from "@mui/icons-material/Stop";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import AlertDialog from "./AlertDialog";
import EndpointConfigurationDialog from "./EndpointConfigurationDialog";
import { NgrokContainer, EndpointConfiguration, RunningEndpoint, useNgrokContext } from "./NgrokContext";

export type DataGridColumnType = (GridActionsColDef<NgrokContainer, any, any> | GridColDef<NgrokContainer, any, any>)[];

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function ContainersGrid() {
  const { 
    containers, 
    endpointConfigurations,
    runningEndpoints,
    setRunningEndpoints,
    createEndpointConfiguration,
    updateEndpointConfiguration,
    deleteEndpointConfiguration
  } = useNgrokContext();
  const [rows, setRows] = useState<NgrokContainer[]>(Object.values(containers));

  // Dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [currentContainer, setCurrentContainer] = useState<NgrokContainer | null>(null);
  const [editingConfig, setEditingConfig] = useState<EndpointConfiguration | undefined>();
  
  // Delete confirmation popover state
  const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
  const [containerToDelete, setContainerToDelete] = useState<NgrokContainer | null>(null);
  const deletePopoverOpen = Boolean(deleteAnchorEl);

  const columns: DataGridColumnType = [
    {
      field: "id",
      headerName: "ID",
      width: 90,

    },
    {
      field: "Name",
      headerName: "Container",
      headerAlign: "left",
      align: "left",
      maxWidth: 200,
      flex: 1,
    },
    {
      field: "Port.PublicPort",
      headerName: "Port",
      headerAlign: "left",
      align: "left",
      maxWidth: 100,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        return (
          <Typography sx={{ margin: 0, padding: 0 }}>
            {params.row.Port.PublicPort}
          </Typography>
        );
      },
    },
    {
      field: "url",
      headerName: "URL", 
      headerAlign: "left",
      align: "left",
      type: "string",
      flex: 1,
      renderCell: (params) => {
        const runningEndpoint = runningEndpoints[params.row.id];
        if (!runningEndpoint) {
          return;
        }

        return (
          <Grid2
            flex={1}
            container
            direction={"row"}
            spacing={1}
            justifyContent={"start"}
            sx={{ margin: 0, padding: 0, height: '100%', alignItems: 'center' }}
          >
            <Grid2 sx={{ margin: 0, padding: 0 }}>
              <Tooltip title="Copy URL">
                <ContentCopyIcon
                  fontSize="small"
                  onClick={() => {
                    navigator.clipboard.writeText(runningEndpoint.url);
                    ddClient.desktopUI.toast.success("URL copied to clipboard");
                  }}
                />
              </Tooltip>
            </Grid2>
            <Grid2 sx={{ margin: 0, padding: 0 }}>
              <Typography noWrap sx={{ margin: 0, padding: 0 }}>
                {runningEndpoint.url}
              </Typography>
            </Grid2>
          </Grid2>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "right",
      align: "right",
      minWidth: 200,
      flex: 1,
      getActions: (params: any) => {
        if (creatingEndpoint[params.row.id]) {
          return [
            <GridActionsCellItem
              className="circular-progress"
              key={"loading_" + params.row.id}
              icon={<CircularProgress size={20} />}
              label="Loading"
              showInMenu={false}
            />,
          ];
        }

        if (!params.row.Port.PublicPort) {
          return [
            <GridActionsCellItem
              key={"action_info_" + params.row.id}
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

        let actions: any[] = [];
        const hasConfiguration = endpointConfigurations[params.row.id];
        const isRunning = runningEndpoints[params.row.id];

        // Browser action (when running)
        if (isRunning) {
          actions.push(
            <GridActionsCellItem
              key={"action_open_browser_" + params.row.id}
              icon={
                <Tooltip title="Open in browser"><LanguageIcon /></Tooltip>
              }
              label="Open in browser"
              onClick={handleOpenEndpoint(isRunning.url)}
            />
          );
        }

        if (!hasConfiguration) {
          // Show + button for new configuration
          actions.push(
            <GridActionsCellItem
              key={"action_create_" + params.row.id}
              icon={
                <Tooltip title="Create endpoint"><AddIcon /></Tooltip>
              }
              onClick={handleCreateConfiguration(params.row)}
              label="Create endpoint"
            />
          );
        } else {
          // Show edit, delete, and play/stop buttons
          actions.push(
            <GridActionsCellItem
              key={"action_edit_" + params.row.id}
              icon={
                <Tooltip title="Edit endpoint"><EditIcon /></Tooltip>
              }
              onClick={handleEditConfiguration(params.row)}
              label="Edit endpoint"
            />
          );
          actions.push(
            <GridActionsCellItem
              key={"action_delete_" + params.row.id}
              icon={
                <Tooltip title="Delete endpoint"><DeleteIcon /></Tooltip>
              }
              onClick={handleDeleteConfiguration(params.row)}
              label="Delete endpoint"
            />
          );

          if (isRunning) {
            actions.push(
              <GridActionsCellItem
                key={"action_stop_" + params.row.id}
                icon={
                  <Tooltip title="Stop endpoint"><StopIcon /></Tooltip>
                }
                onClick={handleStopEndpoint(params.row)}
                label="Stop endpoint"
                disabled={removingEndpoint}
              />
            );
          } else {
            actions.push(
              <GridActionsCellItem
                key={"action_start_" + params.row.id}
                icon={
                  <Tooltip title="Start endpoint"><PlayArrowIcon /></Tooltip>
                }
                onClick={handleStartEndpoint(params.row)}
                label="Start endpoint"
                disabled={creatingEndpoint[params.row.id]}
              />
            );
          }
        }

        return actions;
      },
    },
  ];



  const handleOpenEndpoint = (url: string) => () => {
    ddClient.host.openExternal(url);
  };

  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [alertDialogMsg, setAlertDialogMsg] = useState<string>("");

  const [removingEndpoint, setRemovingEndpoint] = useState<boolean>(false);

  const ddClient = useDockerDesktopClient();

  useEffect(() => {
    setRows(Object.values(containers));
  }, [containers]);

  const [creatingEndpoint, setCreatingEndpoint] = useState<Record<string, boolean>>(
    {}
  );

  // New handler functions for configuration workflow

  const handleCreateConfiguration = (container: NgrokContainer) => () => {
    setCurrentContainer(container);
    setEditingConfig(undefined);
    setConfigDialogOpen(true);
  };

  const handleEditConfiguration = (container: NgrokContainer) => () => {
    setCurrentContainer(container);
    setEditingConfig(endpointConfigurations[container.id]);
    setConfigDialogOpen(true);
    
    // Show notification if endpoint is running
    if (runningEndpoints[container.id]) {
      ddClient.desktopUI.toast.warning("Updating configuration will restart the running endpoint");
    }
  };

  const handleDeleteConfiguration = (container: NgrokContainer) => (event: React.MouseEvent<HTMLElement>) => {
    setContainerToDelete(container);
    setDeleteAnchorEl(event.currentTarget);
  };

  const handleConfirmDelete = () => {
    if (!containerToDelete) return;
    
    if (runningEndpoints[containerToDelete.id]) {
      // Stop running endpoint first
      handleStopEndpoint(containerToDelete)();
    }
    // Remove configuration
    deleteEndpointConfiguration(containerToDelete.id);
    
    // Close popover and reset state
    setDeleteAnchorEl(null);
    setContainerToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteAnchorEl(null);
    setContainerToDelete(null);
  };

  const handleStartEndpoint = (container: NgrokContainer) => async () => {
    const config = endpointConfigurations[container.id];
    if (!config) return;

    setCreatingEndpoint({...creatingEndpoint, [container.id]: true});
    
    try {
      const response: any = await ddClient.extension.vm?.service?.post('/create_endpoint', {
        containerId: container.ContainerId,
        targetPort: container.Port.PublicPort.toString(),
        url: config.url,
        binding: config.binding,
        poolingEnabled: config.poolingEnabled,
        trafficPolicy: config.trafficPolicy,
        description: config.description,
        metadata: config.metadata,
      });

      // Add to running endpoints
      const runningEndpoint: RunningEndpoint = {
        id: container.id,
        url: response.endpoint.url,
        containerId: container.ContainerId,
        targetPort: container.Port.PublicPort.toString()
      };
      setRunningEndpoints({...runningEndpoints, [container.id]: runningEndpoint});

      ddClient.desktopUI.toast.success(
        `Endpoint started at ${response.endpoint.url}`
      );
    } catch (error: any) {
      console.log(error);
      let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
      setAlertDialogMsg(errMsg);
      setShowAlertDialog(true);
    } finally {
      setCreatingEndpoint({...creatingEndpoint, [container.id]: false});
    }
  };

  const handleStopEndpoint = (container: NgrokContainer) => async () => {
    setRemovingEndpoint(true);
    
    try {
      await ddClient.extension.vm?.service?.post('/remove_endpoint', {
        containerId: container.ContainerId,
        targetPort: container.Port.PublicPort.toString()
      });

      // Remove from running endpoints but keep configuration
      const updatedRunningEndpoints = { ...runningEndpoints };
      delete updatedRunningEndpoints[container.id];
      setRunningEndpoints(updatedRunningEndpoints);

      ddClient.desktopUI.toast.success("Endpoint stopped");
    } catch (error: any) {
      console.log(error);
      let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
      setAlertDialogMsg(errMsg);
      setShowAlertDialog(true);
    } finally {
      setRemovingEndpoint(false);
    }
  };

  const handleConfigurationSave = (config: EndpointConfiguration, shouldStart: boolean) => {
    if (!currentContainer) return;

    // Ensure the config has the correct container info
    const configWithContainerInfo: EndpointConfiguration = {
      ...config,
      id: currentContainer.id,
      containerId: currentContainer.ContainerId,
      targetPort: currentContainer.Port.PublicPort.toString(),
    };

    // Create new configuration and start if requested
    createEndpointConfiguration(configWithContainerInfo);
    
    if (shouldStart) {
      handleStartEndpoint(currentContainer)();
    }

    setConfigDialogOpen(false);
    setCurrentContainer(null);
    setEditingConfig(undefined);
  };

  const handleConfigurationUpdate = (config: EndpointConfiguration) => {
    if (!currentContainer) return;

    const wasRunning = !!runningEndpoints[currentContainer.id];
    
    // Update configuration
    updateEndpointConfiguration(currentContainer.id, config);
    
    if (wasRunning) {
      // Stop and restart with new config
      handleStopEndpoint(currentContainer)().then(() => {
        handleStartEndpoint(currentContainer)();
      });
    }

    setConfigDialogOpen(false);
    setCurrentContainer(null);
    setEditingConfig(undefined);
  };

  return (
    <Grid2 container flex={1} height="calc(100vh - 200px)">
      <AlertDialog
        open={showAlertDialog}
        msg={alertDialogMsg}
        onClose={() => setShowAlertDialog(false)}
      />
      
      <EndpointConfigurationDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSave={handleConfigurationSave}
        onUpdate={handleConfigurationUpdate}
        initialConfig={editingConfig}
        containerName={currentContainer?.Name || ''}
        targetPort={currentContainer?.Port.PublicPort.toString() || ''}
        isEditing={!!editingConfig}
      />
      
      <Popover
        open={deletePopoverOpen}
        anchorEl={deleteAnchorEl}
        onClose={handleCancelDelete}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete this endpoint configuration?
            {containerToDelete && runningEndpoints[containerToDelete.id] && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                This will also stop the running endpoint.
              </Typography>
            )}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleCancelDelete} size="small">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              variant="contained" 
              color="error" 
              size="small"
            >
              Delete
            </Button>
          </Stack>
        </Paper>
      </Popover>
      
      <DataGrid
        rows={rows || []}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
          columns: {
            columnVisibilityModel: {
              id: false,
            },
          },
        }}
        pageSizeOptions={[10]}
        checkboxSelection={false}
        disableRowSelectionOnClick={true}

        sx={{
          "& .MuiDataGrid-row": {
            minHeight: '52px !important',
            maxHeight: '52px !important'
          },
          "& .MuiDataGrid-columnHeader": {
            '&[data-field="actions"]': {
              justifyContent: 'flex-end !important'
            }
          },
          "& .MuiDataGrid-cell": {
            minHeight: '52px !important',
            maxHeight: '52px !important',
            display: 'flex !important',
            alignItems: 'center !important',
            '&[data-field="actions"]': {
              justifyContent: 'flex-end !important'
            },
            "& .MuiIconButton-root.circular-progress": {
              "&:hover": {
                backgroundColor: "transparent",
              },
              backgroundColor: "transparent",
            },
          },
        }}
      />
    </Grid2>
  );
}
