import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { entropyToMiniSecret, mnemonicToEntropy } from "@polkadot-labs/hdkd-helpers";
import { getPolkadotSigner } from "@polkadot-api/signer";
import { fromHex } from "@polkadot-api/utils";

import { env } from "@/environment";
import { MintSpecs } from "@/types/Mint";

const entropy = mnemonicToEntropy(env.SIGNER_MNEMONIC);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);
const hdkdKeyPair = derive("//PolkadotEducation");

export const SIGNER = getPolkadotSigner(hdkdKeyPair.publicKey, "Sr25519", hdkdKeyPair.sign);

const toLittleEndianHex32 = (num: number): string => {
  const num32 = num & 0xffffffff;

  const byte3 = (num32 >> 24) & 0xff;
  const byte2 = (num32 >> 16) & 0xff;
  const byte1 = (num32 >> 8) & 0xff;
  const byte0 = num32 & 0xff;

  return [
    byte0.toString(16).padStart(2, "0"),
    byte1.toString(16).padStart(2, "0"),
    byte2.toString(16).padStart(2, "0"),
    byte3.toString(16).padStart(2, "0"),
  ].join("");
};

const uint8ArrayToHexString = (array: Uint8Array): string => {
  const hexParts = Array.from(array, (byte) => byte.toString(16).padStart(2, "0"));
  return "0x" + hexParts.join("");
};

export const signMintPayload = async (mintSpecs: MintSpecs) => {
  // collection:  00000000
  // item:        00000000
  // attributes:  00
  // metadata:    00
  // onlyAccount: 00
  // deadline:    00000000 -> (blockNumber)
  // mintPrice:   00
  let payload = toLittleEndianHex32(mintSpecs.collectionId);
  payload += toLittleEndianHex32(mintSpecs.itemId);
  payload += `000000${toLittleEndianHex32(mintSpecs.deadline)}00`;
  const signature = await SIGNER.signBytes(fromHex(`0x${payload}`));
  return uint8ArrayToHexString(signature);
};
