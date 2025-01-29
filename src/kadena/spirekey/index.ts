import {
  KADENA_CHAIN_ID,
  KADENA_NETWORK_ID,
} from '@/kadena/constants/chainInfo';
import { Actions, Connector, KadenaAccount, Provider } from '@/kadena/types';
import { PactCommandToSign, PactSignedTx } from '@/utils/kadenaHelper';
import { Pact } from '@kadena/client';
import { connect, initSpireKey, sign } from '@kadena/spirekey-sdk';
import { IUnsignedCommand, PactCode } from '@kadena/types';

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
    };
    console.log(account);
    if (!account) {
      throw new NoSpireKeyError();
    }
  }

  public async deactivate(): Promise<void> {
    this.actions.resetState();
  }

  private toUnsignedCommand(cmd: PactCommandToSign): {
    command: IUnsignedCommand | undefined;
  } {
    if (this.KdaAccount) {
      const builder = Pact.builder
        .execution(cmd.code as PactCode)
        .setMeta({
          gasLimit: cmd.gasLimit,
          gasPrice: cmd.gasPrice,
          senderAccount: this.KdaAccount.account,
          chainId: KADENA_CHAIN_ID,
          ttl: cmd.ttl,
        })
        .setNetworkId(KADENA_NETWORK_ID)
        .setNonce(cmd.nonce || new Date().toISOString())
        .addSigner(
          {
            pubKey: this.KdaAccount.publicKey ?? '',
            scheme: 'WebAuthn',
          },
          (withCap) => cmd.caps.map((e) => withCap(e.cap.name, ...e.cap.args)),
        );

      console.log(JSON.stringify(builder));

      // Add any environment data if present
      if (cmd.envData) {
        Object.keys(cmd.envData).forEach((key) => {
          if (cmd.envData) builder.addData(key, cmd.envData[key]);
        });
      }

      const unsignedCommand: IUnsignedCommand = builder.createTransaction();

      return { command: unsignedCommand };
    }

    return { command: undefined };
  }

  public async signTx(command: PactCommandToSign): Promise<PactSignedTx> {
    const cmd = this.toUnsignedCommand(command);
    try {
      const { transactions, isReady } = await sign(
        [cmd.command as IUnsignedCommand],
        [
          {
            accountName: this.account.accountName,
            networkId: this.account.networkId,
            chainIds: this.account.chainIds,
          },
        ],
      );
      console.log(transactions[0]);
      if (await isReady())
        return {
          status: 'success',
          errors: null,
          signedCmd: transactions[0],
        } as PactSignedTx;
      else
        return {
          status: 'failure',
          errors: 'some error occurred',
          signedCmd: null,
        } as PactSignedTx;
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
