import * as borsh from "@coral-xyz/borsh";
export class ModeRoundResolution {
  static discriminator = 0;
  static kind = "ModeRoundResolution";
  discriminator = 0;
  kind = "ModeRoundResolution";
  toJSON() {
    return {
      kind: "ModeRoundResolution",
    };
  }
  toEncodable() {
    return {
      ModeRoundResolution: {},
    };
  }
}
export class ModeSlidingResolution {
  static discriminator = 1;
  static kind = "ModeSlidingResolution";
  discriminator = 1;
  kind = "ModeSlidingResolution";
  toJSON() {
    return {
      kind: "ModeSlidingResolution",
    };
  }
  toEncodable() {
    return {
      ModeSlidingResolution: {},
    };
  }
}
export function fromDecoded(obj: any) {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object");
  }
  if ("ModeRoundResolution" in obj) {
    return new ModeRoundResolution();
  }
  if ("ModeSlidingResolution" in obj) {
    return new ModeSlidingResolution();
  }
  throw new Error("Invalid enum object");
}
export function fromJSON(obj: any) {
  switch (obj.kind) {
    case "ModeRoundResolution": {
      return new ModeRoundResolution();
    }
    case "ModeSlidingResolution": {
      return new ModeSlidingResolution();
    }
  }
}
export function layout(property: any) {
  const ret = borsh.rustEnum([borsh.struct([], "ModeRoundResolution"), borsh.struct([], "ModeSlidingResolution")]);
  if (property !== undefined) {
    return ret.replicate(property);
  }
  return ret;
}
