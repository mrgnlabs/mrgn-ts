import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import * as borsh from "borsh"
import { PYTH_PRICE_CONF_INTERVALS } from "../../constants";

type PriceUpdateV2 = {
    writeAuthority: Buffer,
    verificationLevel: number,
    priceMessage: {
        feedId: Buffer,
        price: bigint,
        conf: bigint,
        exponent: number,
        publishTime: bigint,
        prevPublishTime: bigint
        emaPrice: bigint,
        emaConf: bigint
    },
};

const priceUpdateV2Schema = {
    struct: {
        writeAuthority: {
            array: { type: 'u8', len: 32 },
        },
        verificationLevel: 'u8',
        priceMessage: {
            struct: {
                feedId: { array: { type: 'u8', len: 32 }, },
                price: 'i64',
                conf: 'u64',
                exponent: 'i32',
                publishTime: 'i64',
                prevPublishTime: 'i64',
                emaPrice: 'i64',
                emaConf: 'u64'
            },
        },
        postedSlot: 'u64'
    },
}

export const parsePriceInfo = (data: Buffer): PriceUpdateV2 => {
    let decoded: PriceUpdateV2 = borsh.deserialize(priceUpdateV2Schema, data) as any;
    return decoded
}

function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
    let maxConfidenceInterval = price.times(maxConfidence);

    return BigNumber.min(confidence, maxConfidenceInterval);
}
