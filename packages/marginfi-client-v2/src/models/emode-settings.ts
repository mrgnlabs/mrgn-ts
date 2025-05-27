import {
  EmodeEntry,
  EmodeFlags,
  EmodeSettingsRaw,
  EmodeSettingsType,
  EmodeTag,
  getActiveEmodeEntryFlags,
  getActiveEmodeFlags,
  parseEmodeTag,
} from "../services";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

export class EmodeSettings implements EmodeSettingsType {
  constructor(
    public emodeTag: EmodeTag,
    public timestamp: number,
    public flags: EmodeFlags[],
    public emodeEntries: EmodeEntry[]
  ) {
    this.emodeTag = emodeTag;
    this.timestamp = timestamp;
    this.flags = flags;
    this.emodeEntries = emodeEntries;
  }

  static from(emodeSettingsRaw: EmodeSettingsRaw): EmodeSettings {
    const emodeTag = parseEmodeTag(emodeSettingsRaw.emodeTag);
    const timestamp = emodeSettingsRaw.timestamp.toNumber();
    const flags = getActiveEmodeFlags(emodeSettingsRaw.flags);
    const emodeEntries = emodeSettingsRaw.emodeConfig.entries
      .filter((entry) => entry.collateralBankEmodeTag !== 0)
      .map((entry) => {
        return {
          collateralBankEmodeTag: parseEmodeTag(entry.collateralBankEmodeTag),
          flags: getActiveEmodeEntryFlags(entry.flags),
          assetWeightInit: wrappedI80F48toBigNumber(entry.assetWeightInit),
          assetWeightMaint: wrappedI80F48toBigNumber(entry.assetWeightMaint),
        };
      });
    return new EmodeSettings(emodeTag, timestamp, flags, emodeEntries);
  }
}
