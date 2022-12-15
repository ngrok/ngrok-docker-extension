import * as React from "react";
import { useEffect, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,
} from "@mui/x-data-grid";
import { CircularProgress, Grid, Tooltip, Typography } from "@mui/material";
import { GridRowParams } from "@mui/x-data-grid/models/params/gridRowParams";
import LanguageIcon from "@mui/icons-material/Language";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import AlertDialog from "./AlertDialog";

export type DataGridColumnType = (GridActionsColDef | GridColDef)[];

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export interface Container {
  Names: string[];
  Ports: Port[];
}

export interface Port {
  PublicPort: number;
  Type: string;
}

export interface Tunnel {
  ContainerID: string;
  URL: string;
}

interface ContainerRow {
  id: number;
  containerName: string;
  publishedPort?: number;
  url?: string;
}

export default function ContainersGrid() {
  const columns: DataGridColumnType = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      hide: true,
    },
    {
      field: "containerName",
      headerName: "Container",
      headerAlign: "center",
      align: "center",
      maxWidth: 200,
      flex: 1,
    },
    {
      field: "publishedPort",
      headerName: "Published Ports",
      headerAlign: "center",
      align: "center",
      maxWidth: 150,
      flex: 1,
    },
    {
      field: "url",
      headerName: "URL",
      headerAlign: "center",
      align: "center",
      type: "number",
      maxWidth: 310,
      flex: 1,
      renderCell: (params) => {
        if (!params.row.url) {
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
              <Typography noWrap={true}>{params.row.url}</Typography>
            </Grid>
            <Grid item>
              <Tooltip title="Copy URL">
                <ContentCopyIcon
                  onClick={() => {
                    navigator.clipboard.writeText(params.row.url);
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
      getActions: (params: GridRowParams) => {
        if (startingTunnel[params.row.containerName]) {
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

        if (!params.row.publishedPort) {
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

        if (params.row.url) {
          actions.push(
            <GridActionsCellItem
              key={"action_open_browser_" + params.row.id}
              icon={
                <Tooltip title="Open in browser">{<LanguageIcon />}</Tooltip>
              }
              label="Open in browser"
              onClick={handleOpenTunnel(params.row.url)}
              disabled={
                params.row.publishedPort === undefined ||
                params.row.url === undefined
              }
            />
          );
        }

        if (
          params.row.publishedPort !== undefined &&
          params.row.url === undefined
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
              disabled={startingTunnel[params.row.containerName]}
            />
          );
        } else {
          if (params.row.url) {
            actions.push(
              <GridActionsCellItem
                key={"action_stop_publishing_" + params.row.id}
                icon={
                  <Tooltip title="Stop publishing on the internet">
                    {<DoNotDisturbIcon />}
                  </Tooltip>
                }
                label="Stop publishing on the internet"
                onClick={handleStopTunnel(params.row.containerName)}
                disabled={
                  params.row.publishedPort === undefined ||
                  params.row.url === undefined ||
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
      .then(() => {
        if (rows === undefined) {
          return;
        }

        let updatedRows = rows.map((row) => {
          if (row.containerName == containerName) {
            return { ...row, url: "" };
          }
          return row;
        });

        setRows(updatedRows);

        ddClient.desktopUI.toast.success("Tunnel stopped successfully");
      })
      .catch((error) => {
        ddClient.desktopUI.toast.error(`Failed stopping tunnel: ${error}`);
      })
      .finally(() => {
        setStoppingTunnel(false);
      });
  };

  const ddClient = useDockerDesktopClient();
  const [rows, setRows] = useState<ContainerRow[]>();

  useEffect(() => {
    listContainers();
  }, []);

  const listContainers = async () => {
    const containers = (await ddClient.docker.listContainers()) as Container[];

    let arr: ContainerRow[] = [];
    for (let i = 0; i < containers.length; i++) {
      let x: ContainerRow = {
        id: i,
        containerName: containers[i].Names[0].substring(1),
      };

      // use the first public port available
      for (let j = 0; j < containers[i].Ports.length; j++) {
        if (containers[i].Ports[j].PublicPort !== undefined) {
          x.publishedPort = containers[i].Ports[j].PublicPort;
          break;
        }
      }

      arr.push(x);
    }

    const tunnels = (await ddClient.extension.vm?.service?.get(
      "/progress"
    )) as Record<string, Tunnel>;

    // update rows with url
    for (let i = 0; i < arr.length; i++) {
      // check if tunnels contains the key "containerName"
      for (const key in tunnels) {
        if (arr[i].containerName === key) {
          // if so, update the row url
          arr[i].url = tunnels[key].URL;
        }
      }
    }

    // sort containers that have exposed ports
    arr.sort((a, b) => {
      // two undefined values should be treated as equal ( 0 )
      if (
        typeof a.publishedPort === "undefined" &&
        typeof b.publishedPort === "undefined"
      )
        return 0;
      // if a is "undefined" and b isn't a should have a lower index in the array
      else if (typeof a.publishedPort === "undefined") return 1;
      // if b is "undefined" and a isn't a should have a higher index in the array
      else if (typeof b.publishedPort === "undefined") return -1;
      // if both numbers are defined compare as normal
      else return a.publishedPort - b.publishedPort;
    });

    // sort containers that have a ngrok url
    arr.sort((a, b) => {
      // two undefined values should be treated as equal ( 0 )
      if (typeof a.url === "undefined" && typeof b.url === "undefined")
        return 0;
      // if a is "undefined" and b isn't a should have a lower index in the array
      else if (typeof a.url === "undefined") return 1;
      // if b is "undefined" and a isn't a should have a higher index in the array
      else if (typeof b.url === "undefined") return -1;
      // if both numbers are defined compare as normal
      else return a.url.localeCompare(b.url);
    });

    setRows(arr);
  };

  useEffect(() => {
    const containersEvents = async () => {
      await ddClient.docker.cli.exec(
        "events",
        [
          "--format",
          `"{{ json . }}"`,
          "--filter",
          "type=container",
          "--filter",
          "event=start",
          "--filter",
          "event=destroy",
        ],
        {
          stream: {
            async onOutput(data: any) {
              await listContainers();
            },
            onClose(exitCode) {
              console.log("onClose with exit code " + exitCode);
            },
            splitOutputLines: true,
          },
        }
      );
    };

    containersEvents();
  }, []);

  const [startingTunnel, setStartingTunnel] = useState<Record<string, boolean>>(
    {}
  );

  const handleStart = (row: any) => async () => {
    await startTunnel(row.containerName, row.publishedPort);
    await listContainers();
  };

  const startTunnel = async (containerID: string, port: number) => {
    console.log(
      `Starting tunnel for container ${containerID} on port ${port}...`
    );

    const copy = startingTunnel;
    copy[containerID] = true;
    setStartingTunnel(copy);

    try {
      const tunnelURL = await ddClient.extension.vm?.service?.post(
        `/start/${containerID}?port=${port}`,
        undefined
      );

      ddClient.desktopUI.toast.success(
        `Tunnel started for container ${containerID} on port ${port} at ${tunnelURL}`
      );
    } catch (error: any) {
      let errMsg = error.message.replaceAll(`"`, "").replaceAll("\\r", "");
      setAlertDialogMsg(errMsg);
      setShowAlertDialog(true);
    } finally {
      copy[containerID] = false;
      setStartingTunnel(copy);
    }
  };

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
    </Grid>
  );
}
