import * as React from "react";
import { useEffect, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,
  GridColumns,
} from "@mui/x-data-grid";
import { Box, Button, CircularProgress, Grid, MenuItem, Modal, Select, SelectChangeEvent, Switch, Tooltip, Typography } from "@mui/material";
import { GridRowParams } from "@mui/x-data-grid/models/params/gridRowParams";
import LanguageIcon from "@mui/icons-material/Language";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import AlertDialog from "./AlertDialog";
import { NgrokContainer, Tunnel, useNgrokContext } from "./NgrokContext";
import { Settings } from "@mui/icons-material";

export type DataGridColumnType = (GridActionsColDef<NgrokContainer, any, any> | GridColDef<NgrokContainer, any, any>)[];

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function ContainersGrid() {
  const { containers, setContainers, tunnels, setTunnels } = useNgrokContext();
  const [rows, setRows] = useState<NgrokContainer[]>(Object.values(containers));

  const columns: DataGridColumnType = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      hide: true,
    },
    {
      field: "Name",
      headerName: "Container",
      headerAlign: "center",
      align: "center",
      maxWidth: 200,
      flex: 1,
    },
    {
      field: "publishedPort",
      headerName: "Published Port",
      headerAlign: "center",
      align: "center",
      maxWidth: 150,
      flex: 1,
      renderCell: (params) => {
        return (
          <Typography>
            {params.row.Port.PublicPort}
          </Typography>
        );
      },
    },
    {
      field: "url",
      headerName: "URL",
      headerAlign: "center",
      align: "center",
      type: "number",
      flex: 1,
      renderCell: (params) => {
        if (!tunnels[params.row.id]) {
          return;
        }

        return (
          <Grid
            flex={1}
            container
            direction={"row"}
            spacing={1}
            justifyContent={"end"}
          >
            <Grid item>
              <Typography noWrap={true}>{tunnels[params.row.id].URL}</Typography>
            </Grid>
            <Grid item>
              <Tooltip title="Copy URL">
                <ContentCopyIcon
                  onClick={() => {
                    navigator.clipboard.writeText(tunnels[params.row.id].URL);
                    ddClient.desktopUI.toast.success("URL copied to clipboard");
                  }}
                />
              </Tooltip>
            </Grid>
          </Grid>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "center",
      align: "center",
      maxWidth: 200,
      flex: 1,
      getActions: (params: GridRowParams<NgrokContainer>) => {
        if (startingTunnel[params.row.id]) {
          return [
            <GridActionsCellItem
              className="circular-progress"
              key={"loading_" + params.row.id}
              icon={
                <>
                  <CircularProgress size={20} />
                  <Typography ml={2}>Loading...</Typography>
                </>
              }
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
                  {<InfoOutlinedIcon />}
                </Tooltip>
              }
              label="Info"
            />,
          ];
        }

        // @ts-ignore
        let actions: GridActionsCellItem[] = [];

        if (tunnels[params.row.id]?.URL) {
          actions.push(
            <GridActionsCellItem
              key={"action_open_browser_" + params.row.id}
              icon={
                <Tooltip title="Open in browser">{<LanguageIcon />}</Tooltip>
              }
              label="Open in browser"
              onClick={handleOpenTunnel(tunnels[params.row.id].URL)}
              disabled={
                tunnels[params.row.id].URL === undefined
              }
            />
          );
        }

        if (
          tunnels[params.row.id] === undefined ||
          tunnels[params.row.id].URL === undefined
        ) {
          actions.push(
            <GridActionsCellItem
              key={"action_publish_" + params.row.id}
              icon={
                <Tooltip title="Publish on the internet">
                  {<PlayArrowIcon />}
                </Tooltip>
              }
              onClick={handleStart(params.row)}
              label="Publish on the internet"
              disabled={startingTunnel[params.row.id]}
            />
          );
          actions.push(
            <GridActionsCellItem
              key={"action_config_" + params.row.id}
              icon={
                <Tooltip title="Configure ngrok tunnel">
                  {<Settings />}
                </Tooltip>
              }
              onClick={handleOpen(params.row)}
              label="Configure ngrok tunnel"
              disabled={startingTunnel[params.row.id]}
            />
          );
        } else {
          if (tunnels[params.row.id]) {
            actions.push(
              <GridActionsCellItem
                key={"action_stop_publishing_" + params.row.id}
                icon={
                  <Tooltip title="Stop publishing on the internet">
                    {<DoNotDisturbIcon />}
                  </Tooltip>
                }
                label="Stop publishing on the internet"
                onClick={handleStopTunnel(params.row.id)}
                disabled={
                  tunnels[params.row.id]?.URL === undefined ||
                  stoppingTunnel
                }
              />
            );
          }
        }

        return actions;
      },
    },
  ];

  const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };
  
  const [selectedContainer, setSelectedContainer] = useState<NgrokContainer>();
  const [open, setOpen] = React.useState(false);
  const handleOpen = (container: NgrokContainer) => async () => {
    setSelectedContainer(container);
    setOpen(true)
  };
  const handleClose = () => setOpen(false);

  const handleOpenTunnel = (url: string) => () => {
    ddClient.host.openExternal(url);
  };

  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [alertDialogMsg, setAlertDialogMsg] = useState<string>("");

  const [stoppingTunnel, setStoppingTunnel] = useState<boolean>(false);

  const handleStopTunnel = (containerName: string) => () => {
    setStoppingTunnel(true);

    ddClient.extension.vm?.service
      ?.delete(`/remove/${containerName}`)
      .then(async (resp) => {
        const response = resp as Record<string, Tunnel>;
        updateTunnels(response)
        ddClient.desktopUI.toast.success("Tunnel stopped successfully");
      })
      .catch((error) => {
        console.log(error);
        ddClient.desktopUI.toast.error(`Failed stopping tunnel: ${error}`);
      })
      .finally(() => {
        setStoppingTunnel(false);
      });
  };

  const ddClient = useDockerDesktopClient();

  useEffect(() => {
    console.log("containers changed", containers);
    setRows(Object.values(containers));
  }, [containers]);

  useEffect(() => {
    console.log("tunnels changed", tunnels);
  }, [tunnels]);

  const [startingTunnel, setStartingTunnel] = useState<Record<string, boolean>>(
    {}
  );

  const handleStart = (row: NgrokContainer) => async () => {
    console.log(
      `Starting tunnel for container ${row.Name} on port ${row.Port.PublicPort}...`
    );

    setStartingTunnel({...startingTunnel, [row.id]:true});
    
    try {
      const tunnel:any = await ddClient.extension.vm?.service?.post(
        `/start/${row.id}?port=${row.Port.PublicPort}&oauth=${row.oauth}&protocol=${row.tcp?'tcp':'http'}`,
        {...row}
      );

      setTunnels({...tunnels, [row.id]:tunnel});

      ddClient.desktopUI.toast.success(
        `Tunnel started for container ${row.Name} on port ${row.Port.PublicPort} at ${tunnel.URL}`
      );
    } catch (error: any) {
      console.log(error);
      let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
      setAlertDialogMsg(errMsg);
      setShowAlertDialog(true);
    } finally {
      setStartingTunnel({...startingTunnel, [row.id]:false});
    }
  };

  const toggleProtocol = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("toggle protocol", event.target.checked);
    if(!selectedContainer) return;
    selectedContainer.tcp = event.target.checked;
    selectedContainer.http = !event.target.checked;
    setSelectedContainer({...selectedContainer});
    setContainers({...containers, [selectedContainer.id]:selectedContainer});
  }

  const toggleOAuth = (event: SelectChangeEvent<HTMLInputElement>) => {
    console.log("toggle oAuth", event.target.value);
    if(!selectedContainer) return;
    selectedContainer.oauth = event.target.value as string;
    setSelectedContainer({...selectedContainer});
    setContainers({...containers, [selectedContainer.id]:selectedContainer});
  }


  return (
    <Grid container flex={1} height="calc(100vh - 200px)">
      <AlertDialog
        open={showAlertDialog}
        msg={alertDialogMsg}
        onClose={() => setShowAlertDialog(false)}
      />
      <DataGrid
        rows={rows || []}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10]}
        checkboxSelection={false}
        disableSelectionOnClick={true}
        experimentalFeatures={{ newEditingApi: true }}
        sx={{
          "&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell": {
            py: 1,
          },
          "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell": {
            py: 1,
          },
          "&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell": {
            py: 2,
          },
          "& .MuiDataGrid-cell": {
            "& .MuiIconButton-root.circular-progress": {
              "&:hover": {
                backgroundColor: "transparent",
              },
              backgroundColor: "transparent",
            },
          },
        }}
      />
  <Modal
    open={open}
    onClose={handleClose}
    aria-labelledby="modal-modal-title"
    aria-describedby="modal-modal-description"
  >
    <Box sx={style}>
      <Typography id="modal-modal-title" variant="h6" component="h2">
        Configure ngrok tunnel for {selectedContainer?.Name}
      </Typography>
      <div id="modal-modal-description">
        <div><strong>Protocol:</strong> HTTP <Switch aria-label="HTTP TCP Switch" onChange={toggleProtocol} checked={selectedContainer?.tcp} /> TCP</div>
        <div><strong>OAuth: </strong>
          <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={selectedContainer?.oauth as ""}
          displayEmpty
          label="oAuth Provider"
          onChange={toggleOAuth}
        >
          <MenuItem value=''>Off</MenuItem>
          <MenuItem value='google'>Google</MenuItem>
          <MenuItem value='facebook'>Facebook</MenuItem>
        </Select></div>
      </div>
    </Box>
  </Modal>
    </Grid>
  );

  function updateTunnels(loaded: Record<string, Tunnel>) {
    setTunnels(loaded);
    localStorage.setItem("tunnels", JSON.stringify(loaded));
  }
}
