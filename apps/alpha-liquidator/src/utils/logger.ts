import { getLocalLogger } from "@mrgnlabs/mrgn-common";
import { Logger } from "winston";

export let logger: Logger;

export function initLogging() {
  logger = getLocalLogger({
    maxLevel: "info",
    labels: {
      service: "alpha-liquidator",
      project: "mrgnlend",
    },
  });
}