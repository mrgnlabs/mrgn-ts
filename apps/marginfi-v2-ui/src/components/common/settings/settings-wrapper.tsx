import { Settings } from "@mrgnlabs/mrgn-ui";

type SettingsWrapperProps = {};

export const SettingsWrapper = () => {
  return <Settings onChange={() => {}} broadcastType="BUNDLE" priorityType="NORMAL" maxCap={0} />;
};
