import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Typography } from "@mui/material";

interface Props {
  open: boolean;
  msg: string;

  onClose(): void;
}

export default function AlertDialog({ ...props }: Props) {
  const handleClose = () => {
    props.onClose();
  };

  const formattedMsg = props.msg.split("\\n").map((line: string) => {
    if (line === "") {
      return;
    }
    return (
      <Typography key={line} mb={1}>
        {line}
      </Typography>
    );
  });

  return (
    <div>
      <Dialog
        open={props.open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Something went wrong"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" component={"div"}>
            {formattedMsg}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
