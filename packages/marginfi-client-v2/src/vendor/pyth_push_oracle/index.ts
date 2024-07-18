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

(async () => {
    let connection = new Connection("https://api.mainnet-beta.solana.com");
    let oracleAddress = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

    let accountInfo = await connection.getAccountInfo(oracleAddress);

    let dataWithoutHeader = accountInfo!.data.slice(8);

    let data = parsePriceInfo(dataWithoutHeader);

    console.log(data);

    const exponent = new BigNumber(10 ** data.priceMessage.exponent);

    const priceRealTime = new BigNumber(Number(data.priceMessage.price)).times(exponent);
    const confidenceRealTime = new BigNumber(Number(data.priceMessage.conf)).times(exponent);
    const cappedConfidenceRealTime = capConfidenceInterval(priceRealTime, confidenceRealTime, PYTH_PRICE_CONF_INTERVALS);
    const lowestPriceRealTime = priceRealTime.minus(cappedConfidenceRealTime);
    const highestPriceRealTime = priceRealTime.plus(cappedConfidenceRealTime);

    const priceTimeWeighted = new BigNumber(Number(data.priceMessage.emaPrice)).times(exponent);
    const confidenceTimeWeighted = new BigNumber(Number(data.priceMessage.emaConf)).times(exponent);
    const cappedConfidenceWeighted = capConfidenceInterval(priceTimeWeighted, confidenceTimeWeighted, PYTH_PRICE_CONF_INTERVALS);
    const lowestPriceWeighted = priceTimeWeighted.minus(cappedConfidenceWeighted);
    const highestPriceWeighted = priceTimeWeighted.plus(cappedConfidenceWeighted);

    console.log("%d +- %d (%d) [%d - %d], ema: %d +- %d (%d) [%d - %d]", priceRealTime.toNumber(), confidenceRealTime.toNumber(), cappedConfidenceRealTime.toNumber(), lowestPriceRealTime.toNumber(), highestPriceRealTime.toNumber(), priceTimeWeighted.toNumber(), confidenceTimeWeighted.toNumber(), cappedConfidenceWeighted.toNumber(), lowestPriceWeighted.toNumber(), highestPriceWeighted.toNumber());
})()