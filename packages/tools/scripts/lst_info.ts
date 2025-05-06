import dotenv from "dotenv";
import { Connection, PublicKey } from "@solana/web3.js";

dotenv.config();

const STAKE_POOL_PROGRAM_ID = new PublicKey("SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy");
const LST_STAKE_POOL = new PublicKey("DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK");

async function main() {
  const connection = new Connection(
    process.env.PRIVATE_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const [expectedValidatorList] = PublicKey.findProgramAddressSync(
    [LST_STAKE_POOL.toBuffer(), Buffer.from("validator_list")],
    STAKE_POOL_PROGRAM_ID
  );

  const info = await connection.getAccountInfo(expectedValidatorList);

  console.log("Expected validatorList:", expectedValidatorList.toBase58());
  console.log(info?.owner?.toBase58(), info?.lamports);
}

main();
