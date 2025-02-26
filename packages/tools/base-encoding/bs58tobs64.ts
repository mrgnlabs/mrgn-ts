import bs58 from "bs58";

const b58EncodedTx =
  "KipD2dG8AmCSt1jaFU1RAVzRkqg2PRbqTtUvFLDQfXjCjQ1LzKkiHJ3HQYfR92QZ314qc4LSpebixfYAn5ocR5Yr93vZVh8DERdeRdKWq144E6LnLj7jwUxCMWFws1H7PPVPEzoTBULkgmRznCmF5YjVnptCq7aU8f6HmdKSndc7dLn9P2mkL77Y2tTeLnPo3qeWM9SApTBFDjA5AnPqZV7scDc6nTR7CQM5PJwFdkFHvjNYFk";
const buffer = bs58.decode(b58EncodedTx);
const base64Tx = buffer.toString("base64");

console.log("Base64 Encoded Transaction:", base64Tx);
