import { Box } from "@mui/material";
import { NgrokContainer } from "../NgrokContext";
import OAuthSelect from "./OAuthSelect";

interface AuthSelectProps {
    container: NgrokContainer;
}

export default function AuthSelector({ ...props }: AuthSelectProps) {
  
  return (
    <Box>
        <div style={{marginTop:"1em"}}><strong>OAuth: </strong>
            <OAuthSelect container={props.container}></OAuthSelect>
        </div>
    </Box>
    );
}