import React from "react";

import { IconCheck, IconX } from "@tabler/icons-react";

import { SimulationStatus } from "../../utils";
import { IconLoader } from "~/components/ui/icons";

type ActionSimulationStatusProps = {
  simulationStatus: SimulationStatus;
  hasErrorMessages: boolean;
};

enum SimulationCompleteStatus {
  NULL = "NULL",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

const ActionSimulationStatus = ({ simulationStatus, hasErrorMessages }: ActionSimulationStatusProps) => {
  const [simulationCompleteStatus, setSimulationCompleteStatus] = React.useState<SimulationCompleteStatus>(
    SimulationCompleteStatus.NULL
  );
  const timeoutRef = React.useRef<number>();

  React.useEffect(() => {
    if (hasErrorMessages) {
      setSimulationCompleteStatus(SimulationCompleteStatus.ERROR);
    } else if (simulationStatus === SimulationStatus.SIMULATING || simulationStatus === SimulationStatus.PREPARING) {
      setSimulationCompleteStatus(SimulationCompleteStatus.LOADING);
    } else if (simulationStatus === SimulationStatus.COMPLETE) {
      setSimulationCompleteStatus(SimulationCompleteStatus.SUCCESS);
    }
  }, [simulationStatus, hasErrorMessages]);

  React.useEffect(() => {
    if (
      simulationCompleteStatus === SimulationCompleteStatus.SUCCESS ||
      simulationCompleteStatus === SimulationCompleteStatus.ERROR
    ) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setSimulationCompleteStatus(SimulationCompleteStatus.NULL);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [simulationCompleteStatus]);

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
