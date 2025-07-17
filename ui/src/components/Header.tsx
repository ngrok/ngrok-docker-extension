import { Box } from "@mui/material";
import SettingsDialog from "./SettingsDialog";
import { useNgrokContext } from "./NgrokContext";
import { AppHeader } from "./AppHeader";
import { useState } from "react";

export function Header() {
  const { authIsSetup, agentStatus } = useNgrokContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <AppHeader 
          status={agentStatus}
          onSettingsClick={handleSettingsClick}
        />
      </Box>
      
      {/* Settings dialog */}
      {authIsSetup && (
        <SettingsDialog 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      )}
    </>
  );
}
