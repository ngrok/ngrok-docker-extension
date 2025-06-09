import * as React from "react";
import { useEffect, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,
  gridStringOrNumberComparator,
} from "@mui/x-data-grid";
import { Box, CircularProgress, Grid, Modal, SelectChangeEvent, Switch, Tooltip, Typography } from "@mui/material";
import { GridRowParams } from "@mui/x-data-grid/models/params/gridRowParams";
import LanguageIcon from "@mui/icons-material/Language";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import AlertDialog from "./AlertDialog";
import { NgrokContainer, Endpoint, useNgrokContext } from "./NgrokContext";
import { Settings } from "@mui/icons-material";
import AuthSelector from "./modules/AuthSelector";

export type DataGridColumnType = (GridActionsColDef<NgrokContainer, any, any> | GridColDef<NgrokContainer, any, any>)[];

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function ContainersGrid() {
  const { containers, setContainers, endpoints, setEndpoints } = useNgrokContext();
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
      sortComparator: (v1, v2, param1, param2) => {
        console.log(v1, v2, param1, param2, rows);
        // gridStringOrNumberComparator()
        return 0;
        // return gridStringOrNumberComparator(
        //   v1,
        //   v2,
        //   param1.value.Port.PublicPort,
        //   param2.value.Port.PublicPort,
        // );
      },
      renderCell: (params) => {
        return (
          <Typography>
            {params.row.Port.PublicPort}
          </Typography>
        );
      },
    },
    // {
    //   field: "protocol",
    //   headerName: "Protocol",
    //   headerAlign: "left",
    //   align: "left",
    //   maxWidth: 100,
    //   flex: 1,
    //   sortable: false,
    //   renderCell: (params) => {
    //     return (
    //       <Typography>
    //         {params.row.http ? "http" : "tcp"}
    //       </Typography>
    //     );
    //   },
    // },
    {
      field: "url",
      headerName: "URL",
      headerAlign: "left",
      align: "left",
      type: "string",
      flex: 1,
      renderCell: (params) => {
        if (!endpoints[params.row.id]) {
          return;
        }

        return (
          <Grid
            flex={1}
            container
            direction={"row"}
            spacing={1}
            justifyContent={"start"}
          >
            <Grid item>
              <Tooltip title="Copy URL">
                <ContentCopyIcon
                  fontSize="small"
                  onClick={() => {
                    navigator.clipboard.writeText(endpoints[params.row.id].url);
                    ddClient.desktopUI.toast.success("URL copied to clipboard");
                  }}
                />
              </Tooltip>
            </Grid>
            <Grid item>
              <Typography noWrap={true}>{endpoints[params.row.id].url}</Typography>
            </Grid>
          </Grid>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "right",
      align: "right",
      maxWidth: 100,
      flex: 1,
      getActions: (params: GridRowParams<NgrokContainer>) => {
        if (creatingEndpoint[params.row.id]) {
          return [
            <GridActionsCellItem
              className="circular-progress"
              key={"loading_" + params.row.id}
              icon={
                <>
                  <CircularProgress size={20} />
                  {/* <Typography ml={2}>Loading...</Typography> */}
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

        if (endpoints[params.row.id]?.url && containers[params.row.id].http) {
          actions.push(
            <GridActionsCellItem
              key={"action_open_browser_" + params.row.id}
              icon={
                <Tooltip title="Open in browser">{<LanguageIcon />}</Tooltip>
              }
              label="Open in browser"
              onClick={handleOpenEndpoint(endpoints[params.row.id].url)}
              disabled={
                endpoints[params.row.id].url === undefined
              }
            />
          );
        }

        if (
          endpoints[params.row.id] === undefined ||
          endpoints[params.row.id].url === undefined
        ) {
          actions.push(
            <GridActionsCellItem
              key={"action_publish_" + params.row.id}
              icon={
                <Tooltip title="Publish on the internet">
                  {<PlayArrowIcon />}
                </Tooltip>
              }
              onClick={handleCreateEndpoint(params.row)}
              label="Publish on the internet"
              disabled={creatingEndpoint[params.row.id]}
            />
          );
          // actions.push(
          //   <GridActionsCellItem
          //     key={"action_config_" + params.row.id}
          //     icon={
          //       <Tooltip title="Configure ngrok endpoint">
          //         {<Settings />}
          //       </Tooltip>
          //     }
          //     onClick={handleOpen(params.row)}
          //     label="Configure ngrok endpoint"
          //     disabled={creatingEndpoint[params.row.id]}
          //   />
          // );
        } else {
          if (endpoints[params.row.id]) {
            actions.push(
              <GridActionsCellItem
                key={"action_stop_publishing_" + params.row.id}
                icon={
                  <Tooltip title="Stop publishing on the internet">
                    {<DoNotDisturbIcon />}
                  </Tooltip>
                }
                label="Stop publishing on the internet"
                onClick={handleRemoveEndpoint(params.row.id)}
                disabled={
                  endpoints[params.row.id]?.url === undefined ||
                  removingEndpoint
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

  const handleOpenEndpoint = (url: string) => () => {
    ddClient.host.openExternal(url);
  };

  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [alertDialogMsg, setAlertDialogMsg] = useState<string>("");

  const [removingEndpoint, setRemovingEndpoint] = useState<boolean>(false);

  const handleRemoveEndpoint = (containerName: string) => () => {
    setRemovingEndpoint(true);

    ddClient.extension.vm?.service
      ?.post('/remove_endpoint', { containerId: containerName })
      .then(async (resp: any) => {
        const endpointsMap: Record<string, Endpoint> = {};
        if (resp.remainingEndpoints) {
          resp.remainingEndpoints.forEach((endpoint: Endpoint) => {
            endpointsMap[endpoint.id] = endpoint;
          });
        }
        updateEndpoints(endpointsMap);
        ddClient.desktopUI.toast.success("Endpoint removed successfully");
      })
      .catch((error) => {
        console.log(error);
        ddClient.desktopUI.toast.error(`Failed removing endpoint: ${error}`);
      })
      .finally(() => {
        setRemovingEndpoint(false);
      });
  };

  const ddClient = useDockerDesktopClient();

  useEffect(() => {
    setRows(Object.values(containers));
  }, [containers]);

  useEffect(() => {
  }, [endpoints]);

  const [creatingEndpoint, setCreatingEndpoint] = useState<Record<string, boolean>>(
    {}
  );

  const handleCreateEndpoint = (row: NgrokContainer) => async () => {
    console.log(
      `Creating endpoint for container ${row.Name} on port ${row.Port.PublicPort}...`
    );

    setCreatingEndpoint({...creatingEndpoint, [row.id]:true});
    
    try {
      const response: any = await ddClient.extension.vm?.service?.post(
        '/create_endpoint',
        { 
          containerId: row.id, 
          port: row.Port.PublicPort.toString() 
        }
      );

      setEndpoints({...endpoints, [row.id]: response.endpoint});

      ddClient.desktopUI.toast.success(
        `Endpoint created for container ${row.Name} on port ${row.Port.PublicPort} at ${response.endpoint.url}`
      );
    } catch (error: any) {
      console.log(error);
      let errMsg = error.error ? error.error : error.message.replaceAll(`"`, "").replaceAll("\\r", "");
      setAlertDialogMsg(errMsg);
      setShowAlertDialog(true);
    } finally {
      setCreatingEndpoint({...creatingEndpoint, [row.id]:false});
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
        ngrok endpoint config {selectedContainer?.Name}
      </Typography>
      <div id="modal-modal-description">
        <div style={{marginTop:"1em"}}><strong>Protocol:</strong> HTTP <Switch aria-label="HTTP TCP Switch" onChange={toggleProtocol} checked={selectedContainer?.tcp} /> TCP</div>
        {selectedContainer?.http?
        <AuthSelector container={selectedContainer}></AuthSelector>:null}
      </div>
    </Box>
  </Modal>
    </Grid>
  );

  function updateEndpoints(loaded: Record<string, Endpoint>) {
  setEndpoints(loaded);
  localStorage.setItem("endpoints", JSON.stringify(loaded));
}
}
