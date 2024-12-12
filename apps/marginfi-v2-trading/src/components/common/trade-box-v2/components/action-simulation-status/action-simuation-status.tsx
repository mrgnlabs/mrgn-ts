import React from "react";

import { IconCheck, IconX } from "@tabler/icons-react";

import { SimulationStatus } from "~/components/action-box-v2/utils"; // TODO
import { IconInfiniteLoader, IconLoader } from "~/components/ui/icons";

type ActionSimulationStatusProps = {
  simulationStatus: SimulationStatus;
  hasErrorMessages: boolean;
  isActive: boolean;
};

enum SimulationCompleteStatus {
  NULL = "NULL",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

const ActionSimulationStatus = ({
  simulationStatus,
  hasErrorMessages = false,
  isActive = false,
}: ActionSimulationStatusProps) => {
  const [simulationCompleteStatus, setSimulationCompleteStatus] = React.useState<SimulationCompleteStatus>(
    SimulationCompleteStatus.NULL
  );
  const [isNewSimulation, setIsNewSimulation] = React.useState(false);

  React.useEffect(() => {
    if (simulationStatus === SimulationStatus.SIMULATING || simulationStatus === SimulationStatus.PREPARING) {
      setSimulationCompleteStatus(SimulationCompleteStatus.LOADING);
      setIsNewSimulation(false);
    } else if (hasErrorMessages && !isNewSimulation) {
      setSimulationCompleteStatus(SimulationCompleteStatus.ERROR);
    } else if (simulationStatus === SimulationStatus.COMPLETE && !isNewSimulation) {
      setSimulationCompleteStatus(SimulationCompleteStatus.SUCCESS);
    }
  }, [simulationStatus, hasErrorMessages, isNewSimulation]);

  React.useEffect(() => {
    if (!isActive) {
      setIsNewSimulation(true);
      setSimulationCompleteStatus(SimulationCompleteStatus.NULL);
    }
  }, [isActive]);

  if (!isActive) {
    return <div />; // Return empty div to align the settings button
  }

  return (
    <div>
      {simulationCompleteStatus === SimulationCompleteStatus.LOADING && (
        <p className="text-xs text-muted-foreground/75 flex items-center gap-1 mr-auto">
          <IconLoader size={14} /> Simulating transaction...
        </p>
      )}

      {simulationCompleteStatus === SimulationCompleteStatus.SUCCESS && (
        <p className="text-xs flex items-center gap-1 mr-auto text-success">
          <IconCheck size={14} /> Simulation complete!
        </p>
      )}

      {simulationCompleteStatus === SimulationCompleteStatus.ERROR && (
        <p className="text-xs flex items-center gap-1 mr-auto text-error">
          <IconX size={14} /> Simulation failed
        </p>
      )}
    </div>
  );
};

export { ActionSimulationStatus };
