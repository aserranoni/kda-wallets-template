import {
  KADENA_CHAIN_ID,
  KADENA_NETWORK_ID,
} from '@/kadena/constants/chainInfo';
import {
  Actions,
  Connector,
  KadenaAccount,
  KadenaWalletResponse,
  Provider,
} from '@/kadena/types';
import { toUnsignedCommand } from '@/utils/kadenaHelper';
import type { IPactCommand } from '@kadena/client';
import { connect, initSpireKey, sign } from '@kadena/spirekey-sdk';

class NoSpireKeyError extends Error {
  constructor() {
    super('SpireKey not initialized');
    this.name = NoSpireKeyError.name;
    Object.setPrototypeOf(this, NoSpireKeyError.prototype);
  }
}

export interface SpireKeyConstructorArgs {
  actions: Actions;
  onError?: (error: Error) => void;
}

export class SpireKeyConnector extends Connector {
  public provider?: Provider;
  public readonly actions: Actions;
  public KdaAccount?: KadenaAccount;
  public account: any;

  constructor({ actions, onError }: SpireKeyConstructorArgs) {
    super(actions, onError);
    this.actions = actions;
  }

  private async initializeSpireKey(): Promise<void> {
    initSpireKey(); // Pass the required arguments if any
  }

  private async isomorphicInitialize(): Promise<void> {
    return this.initializeSpireKey();
  }

  public async connect(): Promise<void> {
    const account = await connect(KADENA_NETWORK_ID, KADENA_CHAIN_ID);
    await account.isReady();
    this.account = account;
    this.KdaAccount = {
      account: account.accountName,
      balance: Number(account.balance),
      chainId: account.chainIds[0], // Assuming `chainIds` is an array
      publicKey: account.devices[0].guard.keys[0],
      scheme: 'WebAuthn',
    };
    console.log(account);
    if (!account) {
      throw new NoSpireKeyError();
    }
  }

  public async deactivate(): Promise<void> {
    this.actions.resetState();
  }

  public async signTx(command: IPactCommand): Promise<KadenaWalletResponse> {
    const cmd = toUnsignedCommand(command);

    try {
      const { transactions, isReady } = await sign(
        [cmd],
        [
          {
            accountName: this.account.accountName,
            networkId: this.account.networkId,
            chainIds: this.account.chainIds,
          },
        ],
      );
      if (await isReady())
        return {
          status: 'success',
          errors: null,
          // TODO: This can be done in a better way for when there are multiple txs
          signedCmd: transactions[0],
        } as ICommand;
      else
        return {
          status: 'failure',
          errors: 'some error occurred',
          signedCmd: null,
        } as ICommand;
    } catch (err) {
      return {
        status: 'failure',
        errors: err,
        signedCmd: null,
      } as PactSignedTx;
    }
  }

  public async activate(): Promise<void> {
    let cancelActivation: () => void = () => {};
    try {
      await this.isomorphicInitialize();
      await this.connect();
      this.actions.update({
        networkId: KADENA_NETWORK_ID,
        account: this.KdaAccount!,
      });
    } catch (err) {
      cancelActivation?.();
      throw err;
    }
  }
}
