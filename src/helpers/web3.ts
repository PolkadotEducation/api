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

const stringToHex = (str: string): string => {
  return Array.from(str)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
};

export const signMintPayload = async (certificateName: string, certificateId: string, mintSpecs: MintSpecs) => {
  // collection:  00000000
  // item:        00000000
  // attributes:  04
  //              7c 506f6c6b61646f74456475636174696f6e202d204365727469666963617465 (PolkadotEducation - Certificate)
  //              60 363737393631656465393032376136646538306366323535 (677961ede9027a6de80cf255)
  // metadata:    00
  // onlyAccount: 00
  // deadline:    00000000 -> (blockNumber)
  // mintPrice:   00
  let payload = toLittleEndianHex32(mintSpecs.collectionId);
  payload += toLittleEndianHex32(mintSpecs.itemId);
  // Attributes [(key, value)]
  const key = stringToHex(certificateName);
  const value = stringToHex(certificateId);
  payload += "04";
  payload += `${(key.length * 2).toString(16)}${key}`;
  payload += `${(value.length * 2).toString(16)}${value}`;
  payload += `0000${toLittleEndianHex32(mintSpecs.deadline)}00`;
  const signature = await SIGNER.signBytes(fromHex(`0x${payload}`));
  return uint8ArrayToHexString(signature);
};
