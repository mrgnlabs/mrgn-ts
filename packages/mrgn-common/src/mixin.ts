import { parse, stringify } from "uuid";
import md5 from "md5";
import BigNumber from "bignumber.js";
import {
  attachInvoiceEntry,
  base64RawURLEncode,
  buildMixAddress,
  InvoiceEntry,
  newMixinInvoice,
  OperationTypeAddUser,
} from "@mixin.dev/mixin-node-sdk";
import { ComputerInfoResponse } from "./computer.types";
import { add } from "./number";
import { SOL_ASSET_ID, XIN_ASSET_ID } from "./constants";
export const computerEmptyExtra = Buffer.from("pzdhFF2zSCK9PCZBa1faGw");

export const buildAssetId = (address: string) => {
  const res = md5(SOL_ASSET_ID + address);
  const bytes = Buffer.from(res, "hex");

  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return stringify(bytes);
};

export const bigNumberToBytes = (x: BigNumber) => {
  const bytes = [];
  let i = x;
  do {
    bytes.unshift(i.mod(256).toNumber());
    i = i.dividedToIntegerBy(256);
  } while (!i.isZero());
  do {
    bytes.unshift(0);
  } while (bytes.length < 8);
  return Buffer.from(bytes);
};

export const buildComputerExtra = (app_id: string, operation: number, extra: Buffer) => {
  const aid = parse(app_id);
  const data = Buffer.concat([
    aid,
    // @ts-ignore
    Buffer.from([operation]),
    // @ts-ignore
    extra,
  ]);
  return base64RawURLEncode(data);
};

// export const buildSystemCallInvoiceExtra = (uid: string, cid: string, skipPostProcess: boolean, ref: string) => {
//   const flag = skipPostProcess ? 1 : 0;
//   const ib = bigNumberToBytes(BigNumber(uid));
//   const cb = parse(cid);
//   // @ts-ignore
//   return Buffer.concat([ib, cb, Buffer.from([flag]), Buffer.from(ref, "hex")]);
// };

export const buildSystemCallInvoiceExtra = (uid: string, cid: string, skipPostProcess: boolean, fid?: string) => {
  const flag = skipPostProcess ? 1 : 0;
  const ib = bigNumberToBytes(BigNumber(uid));
  const cb = parse(cid);
  const data = [ib, cb, Buffer.from([flag])];
  if (fid) data.push(parse(fid));
  // @ts-ignore
  return Buffer.concat(data);
};

export const handleComputerRegisterSchema = (info: ComputerInfoResponse, mix: string) => {
  const destination = buildMixAddress({
    version: 2,
    xinMembers: [],
    uuidMembers: info.members.members,
    threshold: info.members.threshold,
  });
  const memo = buildComputerExtra(info.members.app_id, OperationTypeAddUser, Buffer.from(mix));
  return `https://mixin.one/pay/${destination}?amount=${info.params.operation.price}&asset=${info.params.operation.asset}&memo=${memo}`;
};

export const handleInvoiceSchema = (invoice: string) => `https://mixin.one/pay/${invoice}`;

export const buildInvoiceWithEntries = (recipient: string, feeEntry: InvoiceEntry, entries: InvoiceEntry[]) => {
  const invoice = newMixinInvoice(recipient);
  if (!invoice) throw new Error("invalid invoice recipient!");

  let xinAmount = "0";
  const assetEntry = entries.reduce(
    (prev, cur) => {
      if (cur.asset_id === XIN_ASSET_ID) {
        xinAmount = add(xinAmount, cur.amount).toString();
        return prev;
      }

      const old = prev[cur.asset_id];
      if (old) prev[cur.asset_id].amount = add(old.amount, cur.amount).toString();
      else prev[cur.asset_id] = cur;
      return prev;
    },
    {} as Record<string, InvoiceEntry>
  );

  entries = Object.values(assetEntry) as InvoiceEntry[];
  if (xinAmount !== "0") feeEntry.amount = add(feeEntry.amount, xinAmount).toFixed(8, BigNumber.ROUND_CEIL);

  feeEntry.index_references = entries.map((_, i) => i).slice(-2);
  entries.forEach((entry, index) => {
    entry.amount = BigNumber(entry.amount).toFixed(8, BigNumber.ROUND_CEIL);
    if (index == entries.length - 1) entry.index_references = entries.map((_, i) => i).slice(0, -2);
    attachInvoiceEntry(invoice, entry);
  });

  attachInvoiceEntry(invoice, feeEntry);
  return invoice;
};
