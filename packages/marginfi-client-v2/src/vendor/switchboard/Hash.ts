import * as borsh from "@coral-xyz/borsh";
export class Hash {
  /** The bytes used to derive the hash. */
  data;
  constructor(fields: { data: any }) {
    this.data = fields.data;
  }
  static layout(property: any) {
    return borsh.struct([borsh.array(borsh.u8(), 32, "data")], property);
  }
  static fromDecoded(obj: { data: any }) {
    return new Hash({
      data: obj.data,
    });
  }
  static toEncodable(fields: any) {
    return {
      data: fields.data,
    };
  }
  toJSON() {
    return {
      data: this.data,
    };
  }
  static fromJSON(obj: { data: any }) {
    return new Hash({
      data: obj.data,
    });
  }
  toEncodable() {
    return Hash.toEncodable(this);
  }
}
