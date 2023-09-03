import { Tool } from "langchain/tools";
import { inflate } from "pako";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BorshAccountsCoder, Program, translateAddress, Wallet, Idl } from "@coral-xyz/anchor";
import { decodeIdlAccount, idlAddress } from "@coral-xyz/anchor/dist/cjs/idl";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { MARGINFI_IDL } from "@mrgnlabs/marginfi-client-v2";

const SUPPORTED_PROGRAMS: { [programId: string]: string } = {
  MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA: "marginfi",
  dripTrkvSyQKvkyWg7oi4jmeEGMA5scSYowHArJ9Vwk: "drip",
};

interface DecodedAccountsProps {
  accountAddresses: string[];
}
interface KeyedAccountInfo {
  address: PublicKey;
  info: AccountInfo<Buffer>;
}
interface DecodedAccount {
  programId: string;
  programName: string;
  accountType: string;
  address: string;
  account: any;
}

class DecodedAccountsTool extends Tool {
  name = "decoded-accounts-tool";

  description =
    "A tool to fetch and parse on-chain Solana accounts. The parsing is done by automatically fetching the Interface Definiton Language (IDL) of the programs owning requested accounts. This tool can be used whenever a user requests any information available on-chain that is not available through a more specific tool. The tool input is the list of requested accounts, provided as a comma-separated list of base58-encoded public keys. It returns the parsed accounts as a JSONinfied list of the following structure: { programId: string, programName: string, accountType: string, address: string, account: any }";

  connection: Connection;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getDecodedAccounts({ accountAddresses }: DecodedAccountsProps): Promise<any> {
    const supportedProgramsAddresses = Object.keys(SUPPORTED_PROGRAMS);
    const provider = new AnchorProvider(this.connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: this.connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });

    const idlAccountAddresses = await Promise.all(
      Object.keys(SUPPORTED_PROGRAMS).map(async (programId) => await idlAddress(translateAddress(programId)))
    );

    const accountPks = accountAddresses.map(translateAddress);
    let response = await provider.connection.getMultipleAccountsInfo([...accountPks, ...idlAccountAddresses]);

    const maybeIdlAccountInfos = response.splice(accountPks.length, idlAccountAddresses.length);

    let idls: { [programId: string]: Idl } = {};
    maybeIdlAccountInfos.forEach((ai, index) => {
      const programId = supportedProgramsAddresses[index];
      if (ai === null) {
        if (programId === "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA") {
          idls[programId] = MARGINFI_IDL;
        } else {
          throw new Error(`IDL account not found for supported program ${programId}: ${idlAccountAddresses[index]}`);
        }
      } else {
        let idlAccount = decodeIdlAccount(ai.data.slice(8));
        const inflatedIdl = inflate(idlAccount.data);
        const idl = JSON.parse(utf8.decode(inflatedIdl));
        idls[programId] = idl;
      }
    });

    const maybeAccountInfos = response;

    let accountsNotFound: PublicKey[] = [];
    let accountInfos: KeyedAccountInfo[] = [];
    maybeAccountInfos.forEach((ai, index) => {
      if (ai === null) accountsNotFound.push(accountPks[index]);
      else accountInfos.push({ address: accountPks[index], info: ai });
    });

    if (accountsNotFound.length > 0) {
      return `Error. Accounts not found: ${accountsNotFound.map((pk) => pk.toBase58()).join(", ")}`;
    }

    const { accountsByProgramId, unsupportedAccountsByProgramId } = accountInfos.reduce(
      (acc, ai) => {
        const programId = ai.info.owner.toBase58();
        if (!supportedProgramsAddresses.includes(programId)) {
          if (acc.unsupportedAccountsByProgramId[programId]) {
            acc.unsupportedAccountsByProgramId[programId].push(ai);
          } else {
            acc.unsupportedAccountsByProgramId[programId] = [ai];
          }
          return acc;
        } else {
          if (acc.accountsByProgramId[programId]) {
            acc.accountsByProgramId[programId].push(ai);
          } else {
            acc.accountsByProgramId[programId] = [ai];
          }
          return acc;
        }
      },
      {
        accountsByProgramId: {} as { [programId: string]: KeyedAccountInfo[] },
        unsupportedAccountsByProgramId: {} as { [programId: string]: KeyedAccountInfo[] },
      }
    );

    // check that all accounts belong to supported programs
    if (Object.keys(unsupportedAccountsByProgramId).length > 0) {
      return `Error: Some accounts belong to unsupported programs ${JSON.stringify(
        Object.keys(unsupportedAccountsByProgramId)
      )}`;
    }

    let decodedAccounts: DecodedAccount[] = [];
    Object.keys(accountsByProgramId).forEach((programId) => {
      const accounts = accountsByProgramId[programId];
      const programName = SUPPORTED_PROGRAMS[programId];
      const idl = idls[programId];
      const program = new Program(idl, programId, provider);
      const accountTypes = (idl["accounts"] ?? []).map((a) => a.name);

      accounts.forEach((account) => {
        const accountType = accountTypes.find(
          (at) => BorshAccountsCoder.accountDiscriminator(at).compare(account.info.data.slice(0, 8)) === 0
        );
        if (!accountType) {
          throw new Error(`Account type not found for account ${account.address.toBase58()}`);
        }

        const decodedAccount = program.coder.accounts.decode(accountType, account.info.data);
        decodedAccounts.push({
          programId,
          programName,
          accountType,
          address: account.address.toBase58(),
          account: decodedAccount,
        });
      });
    });

    return decodedAccounts;
  }

  async _call(arg: string): Promise<string> {
    const accountAddresses = arg.split(",");

    const accounts = await this.getDecodedAccounts({
      accountAddresses,
    });

    return JSON.stringify(accounts);
  }
}

export { DecodedAccountsTool };
