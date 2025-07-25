import SettingsDialog from "./SettingsDialog";
import { useNgrokContext } from "./NgrokContext";
import { AppHeader } from "./AppHeader";
import { useState } from "react";
import { SectionBoxMb3 } from "./styled";

export function Header() {
  const { authIsSetup, agentStatus } = useNgrokContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <SectionBoxMb3>
        <AppHeader 
          status={agentStatus}
          onSettingsClick={handleSettingsClick}
        />
      </SectionBoxMb3>
      
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
