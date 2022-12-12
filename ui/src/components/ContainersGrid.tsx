import * as React from "react";
import { useEffect, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,
} from "@mui/x-data-grid";
import { Grid, Tooltip } from "@mui/material";
import { GridRowParams } from "@mui/x-data-grid/models/params/gridRowParams";
import LanguageIcon from "@mui/icons-material/Language";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { createDockerDesktopClient } from "@docker/extension-api-client";

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
  url: string;
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
      width: 150,
      editable: true,
      flex: 1,
    },
    {
      field: "publishedPort",
      headerName: "Published Ports",
      headerAlign: "center",
      align: "center",
      width: 150,
      editable: true,
      flex: 1,
    },
    {
      field: "url",
      headerName: "URL",
      headerAlign: "center",
      align: "center",
      type: "number",
      width: 210,
      flex: 1,
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "center",
      align: "left",
      flex: 1,
      getActions: (params: GridRowParams) => {
        const actions = [
          //@ts-ignore
          <GridActionsCellItem
            key={"action_open_tunnel_" + params.row.id}
            icon={<Tooltip title="Open tunnel">{<LanguageIcon />}</Tooltip>}
            label="Open tunnel"
            onClick={handleOpenTunnel(params.row.url)}
            disabled={
              params.row.publishedPort === undefined || params.row.url === "-"
            }
          />,
          //@ts-ignore
          <GridActionsCellItem
            key={"action_start_tunnel_" + params.row.id}
            icon={<Tooltip title="Start tunnel">{<PlayArrowIcon />}</Tooltip>}
            onClick={handleStart(params.row)}
            label="Start tunnel"
            disabled={
              params.row.publishedPort === undefined || params.row.url !== "-"
            }
          />,
          //@ts-ignore
          <GridActionsCellItem
            key={"action_stop_tunnel_" + params.row.id}
            icon={<Tooltip title="Stop tunnel">{<DoNotDisturbIcon />}</Tooltip>}
            label="Stop tunnel"
            onClick={handleStopTunnel(params.row.containerName)}
            disabled={
              params.row.publishedPort === undefined || params.row.url === "-"
            }
          />,
        ];

        if (params.row.url !== "-") {
          return [
            ...actions, //@ts-ignore
            <GridActionsCellItem
              key={"action_copy_tunnel_address_" + params.row.id}
              icon={
                <Tooltip title="Copy tunnel address">
                  {<ContentCopyIcon />}
                </Tooltip>
              }
              label="Copy tunnel address"
              onClick={() => {
                navigator.clipboard.writeText(params.row.url)
                ddClient.desktopUI.toast.success("Tunnel address copied to clipboard")
              }}
            />,
          ];
        } else {
          return actions;
        }
      },
    },
  ];

  const handleOpenTunnel = (url: string) => () => {
    ddClient.host.openExternal(url);
  };

  const handleStopTunnel = (containerName: string) => () => {
    ddClient.extension.vm?.service
      ?.delete(`/remove/${containerName}`)
      .then(() => {
        if (rows === undefined) {
          console.log("rows is undefined, nothing to do");
          return;
        }

        let updatedRows = rows.map((row) => {
          if (row.containerName == containerName) {
            return { ...row, url: "-" };
          }
          return row;
        });

        console.log("updated rows:", updatedRows);

        setRows(updatedRows);

        ddClient.desktopUI.toast.success("Tunnel stopped successfully");
      })
      .catch((error) => {
        ddClient.desktopUI.toast.error(`Failed stopping tunnel: ${error}`);
      });
  };

  const ddClient = useDockerDesktopClient();
  const [rows, setRows] = useState<ContainerRow[]>();

  useEffect(() => {
    listContainers();
  }, []);

  const listContainers = async () => {
    console.log("listContainers");
    const containers = (await ddClient.docker.listContainers()) as Container[];
    console.log("containers:", containers);

    let arr: ContainerRow[] = [];
    for (let i = 0; i < containers.length; i++) {
      let x: ContainerRow = {
        id: i,
        containerName: containers[i].Names[0].substring(1),
        url: "-",
      };

      // use the first public port available
      for (let j = 0; j < containers[i].Ports.length; j++) {
        if(containers[i].Ports[j].PublicPort !== undefined){
          x.publishedPort = containers[i].Ports[j].PublicPort;
          break
        }
      }

      arr.push(x);
    }

    console.log("GET /progress");
    const tunnels = (await ddClient.extension.vm?.service?.get(
      "/progress"
    )) as Record<string, Tunnel>;

    console.log("tunnels:", tunnels);

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

    console.log("updating rows:", arr);
    setRows(arr);
  };

  useEffect(() => {
    const containersEvents = async () => {
      console.log("listening to container events...");
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
              console.log("**** EVENT received");
              console.log(data);
              await listContainers();
              console.log("*** DONE");
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

  const handleStart = (row: any) => async () => {
    console.log("1/ handleStart:", row);

    console.log("2/ startTunnel");
    await startTunnel(row.containerName, row.publishedPort);

    console.log("3/ listContainers");
    await listContainers();
  };

  const startTunnel = async (containerID: string, port: number) => {
    console.log(
      `Starting tunnel for container ${containerID} on port ${port}...`
    );

    try {
      const tunnelURL = await ddClient.extension.vm?.service?.post(
        `/start/${containerID}?port=${port}`,
        undefined
      );

      ddClient.desktopUI.toast.success(
        `Tunnel started for container ${containerID} on port ${port} at ${tunnelURL}`
      );
    } catch (error: any) {
      ddClient.desktopUI.toast.error(error.message);
    }
  };

  return (
    <Grid container flex={1} height="calc(100vh - 134px)">
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
