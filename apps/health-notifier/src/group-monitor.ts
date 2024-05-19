import { Bank, MarginfiClient, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { sleep } from "@mrgnlabs/mrgn-common";

// Improve this later to avoid GPAs
export class GroupMonitor {
  banks: Map<string, Bank> = new Map();
  oraclePrices: Map<string, OraclePrice> = new Map();

  constructor(readonly mfiClient: MarginfiClient) {}

  async update(): Promise<void> {
    await this.mfiClient.reload();
    this.banks = this.mfiClient.banks;
    this.oraclePrices = this.mfiClient.oraclePrices;
  }

  async run(): Promise<void> {
    while (true) {
      await this.update();
      await sleep(30_000);
    }
  }
}
