import { MarginfiAccountWrapper } from "../src";
import { getMarginfiClient } from "./utils";

const MFI_ACCOUNT_ADDRESS = "3oS3RJ8UYrYw7TAQEVh6u6ifrHi35o3DnvqyqGti4Gwa";

async function main() {
  const client = await getMarginfiClient();

  const marginfiAccount = await MarginfiAccountWrapper.fetch(MFI_ACCOUNT_ADDRESS, client);

  console.log("Account state:");
  console.log(marginfiAccount.describe());
}

main();
