import {
  CHAIN_INFO,
  KADENA_CHAIN_ID,
  KADENA_NETWORK_ID,
} from '@/kadena/constants/chainInfo';
import { Pact, createClient } from '@kadena/client';

export function shortenKAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars + 2)}...${address.substring(66 - chars)}`;
}
export function shortenHash(address: string, chars = 2): string {
  return `${address.substring(0, chars + 3)}...${address.substring(43 - chars)}`;
}
export const getRandomId = () => {
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return randomLetter + Date.now();
};

export type PickOnly<T, K extends keyof T> = Pick<T, K> & {
  [P in Exclude<keyof T, K>]?: never;
};

export function extractDecimal(input: any): number {
  try {
    if (input.int) return Number(input.int);
    if (input.decimal) return Number(input.decimal);
    return Number(input);
  } catch (error) {
    return 0;
  }
}

export const checkVerifiedAccount = async (
  accountName: string,
): Promise<{
  status: string;
  message: string;
  data:
    | {
        account: string;
        balance: number;
        guard: { pred: string; keys: string[] };
      }
    | undefined;
}> => {
  const client = createClient(CHAIN_INFO[KADENA_NETWORK_ID].nodeUrl);
  try {
    const query = Pact.builder
      .execution("(coin.details (read-msg 'account))")
      .setMeta({ chainId: KADENA_CHAIN_ID, senderAccount: accountName })
      .setNetworkId(KADENA_NETWORK_ID)
      .addData('account', accountName)
      .createTransaction();

    const { result } = await client.dirtyRead(query);

    if (result.status === 'success') {
      return {
        status: 'success',
        message: 'Account Connected Successfully',
        data: { ...result.data, balance: extractDecimal(result.data.balance) },
      };
    } else {
      return {
        status: 'failure',
        message: 'Account not found in the preferred chain',
        data: undefined,
      };
    }
  } catch (e: any) {
    return {
      status: 'failure',
      message: e.message,
      data: undefined,
    };
  }
};

export const toUnsignedCommand = function (input: any): any {
  const cmd = formatCommandForWallets(input);
  const builder = Pact.builder
    .execution(cmd.code as PactCode)
    .setMeta({
      gasLimit: cmd.gasLimit,
      gasPrice: cmd.gasPrice,
      senderAccount: cmd.sender,
      chainId: KADENA_CHAIN_ID,
      ttl: cmd.ttl,
    })
    .setNetworkId(KADENA_NETWORK_ID)
    .setNonce(cmd.nonce || new Date().toISOString())
    .addSigner(
      {
        pubKey: input.signers[0].pubKey,
        scheme: input.signers[0].scheme,
      },
      (withCap) => cmd.caps.map((e) => withCap(e.cap.name, ...e.cap.args)),
    );

  // Add any environment data if present
  if (cmd.envData) {
    Object.keys(cmd.envData).forEach((key) => {
      if (cmd.envData) builder.addData(key, cmd.envData[key]);
    });
  }

  const unsignedCommand: IUnsignedCommand = builder.createTransaction();
  return unsignedCommand;
};

// NOTE: For ecko and Zelcore
export const formatCommandForWallets = function (input: any): any {
  return {
    code: input.payload.exec.code,
    caps: input.signers[0].clist.map((capability: any) => ({
      role: '', // Role is not present in input, so it needs to be defined elsewhere
      description: '', // Description is also missing
      cap: {
        name: capability.name,
        args: capability.args,
      },
    })),
    sender: input.meta.sender,
    gasLimit: input.meta.gasLimit,
    gasPrice: input.meta.gasPrice,
    chainId: input.meta.chainId,
    ttl: input.meta.ttl,
    envData: input.payload.exec.data,
    signingPubKey: input.signers[0].pubKey,
    networkId: input.networkId,
    nonce: input.nonce,
  };
};
