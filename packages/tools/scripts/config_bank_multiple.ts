import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { Config, BankConfigOptRaw, updateBankConfig, defaultBankConfigOptRaw } from "./config_bank";
import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import fs from "fs";
import dotenv from "dotenv";
import BigNumber from "bignumber.js";

dotenv.config();

interface BankConfigurationInput {
    config: {
        PROGRAM_ID: string;
        GROUP_KEY: string;
        BANK: string;
        ADMIN: string;
        MULTISIG_PAYER?: string;
        wallet_path: string;
    };
}

interface ConfigurationFile {
    PROGRAM_ID: string;
    config: Array<{
        wallet_path: string;
        BANK: string;
        ADMIN: string;
        GROUP_KEY: string;
    }>;
}

function parseConfig(config: BankConfigurationInput["config"]): Config {
    return {
        PROGRAM_ID: config.PROGRAM_ID,
        GROUP_KEY: new PublicKey(config.GROUP_KEY),
        BANK: new PublicKey(config.BANK),
        ADMIN: new PublicKey(config.ADMIN),
        ...(config.MULTISIG_PAYER && { MULTISIG_PAYER: new PublicKey(config.MULTISIG_PAYER) }),
    };
}

async function processConfiguration(
    bankInput: BankConfigurationInput,
    index: number
) {
    console.log(`\nProcessing configuration ${index + 1}:`);
    console.log("Bank:", bankInput.config.BANK);

    const parsedConfig = parseConfig(bankInput.config);
    const defaultBankConfig = defaultBankConfigOptRaw();

    await updateBankConfig(defaultBankConfig, bankInput.config.wallet_path, parsedConfig, {
        simulate: true,
        sendTx: false
    });
}

async function main() {
    const configPath = process.argv[2];
    if (!configPath) {
        console.error("Please provide a path to the configuration JSON file");
        process.exit(1);
    }

    const configFile = JSON.parse(fs.readFileSync(configPath, "utf-8")) as ConfigurationFile;

    for (const [index, bankConfig] of configFile.config.entries()) {
        const bankInput: BankConfigurationInput = {
            config: {
                PROGRAM_ID: configFile.PROGRAM_ID,
                ...bankConfig
            },
        };
        await processConfiguration(bankInput, index);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});