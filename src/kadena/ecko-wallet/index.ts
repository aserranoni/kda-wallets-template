import {
  checkVerifiedAccount,
  formatCommandForWallets,
} from '@/utils/kadenaHelper';
import { IPactCommand } from '@kadena/client';
import { KADENA_NETWORK_ID } from '../constants/chainInfo';
import { Actions, Connector, KadenaWalletResponse, Provider } from '../types';
import detectKadenaProvider from './provider';

type EckoWalletProvider = Provider & {
  isKadena?: boolean;
  isConnected?: () => boolean;
  providers?: EckoWalletProvider[];
};

export class NoEckoWalletError extends Error {
  constructor() {
    super('eckoWALLET not installed');
    this.name = NoEckoWalletError.name;
    Object.setPrototypeOf(this, NoEckoWalletError.prototype);
  }
}

export interface EckoWalletConstructorArgs {
  actions: Actions;
  options?: Parameters<typeof detectKadenaProvider>[0];
  onError?: (error: Error) => void;
}

export class EckoWallet extends Connector {
  public provider?: EckoWalletProvider;
  private readonly options?: Parameters<typeof detectKadenaProvider>[0];
  private eagerConnection?: Promise<void>;

  constructor({ actions, options, onError }: EckoWalletConstructorArgs) {
    super(actions, onError);
    this.options = options;
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return;

    this.eagerConnection = import('./provider').then(async (module) => {
      const provider = await module.default(this.options);
      if (provider) {
        this.provider = provider as EckoWalletProvider;

        if (this.provider.providers?.length) {
          this.provider =
            this.provider.providers.find((p) => p.isKadena) ??
            this.provider.providers[0];
        }

        this.provider.on(
          'res_accountChange',
          ({
            result: { status, message },
          }: {
            result: { status: string; message: string };
          }) => {
            if (status === 'success') {
              this.actions.resetState();
              window.location.reload();
            }
          },
        );
      }
    });
  }

  private async getNetworkInfo(): Promise<{
    explorer: string;
    networkId: string;
    name: string;
    url: string;
  }> {
    return this.provider?.request({
      method: 'kda_getNetwork',
    }) as Promise<{
      explorer: string;
      networkId: string;
      name: string;
      url: string;
    }>;
  }

  private async connectWallet(networkId?: string): Promise<void> {
    return this.provider?.request({
      method: 'kda_connect',
      networkId: networkId ?? KADENA_NETWORK_ID,
    }) as Promise<void>;
  }

  private async disconnect(networkId?: string): Promise<void> {
    return this.provider?.request({
      method: 'kda_disconnect',
      networkId: networkId ?? KADENA_NETWORK_ID,
    }) as Promise<void>;
  }

  private async checkStatus(networkId?: string): Promise<{
    status: string;
    message: string;
    account: { chainId: string; account: string; publicKey: string };
  }> {
    return this.provider?.request({
      method: 'kda_checkStatus',
      networkId: networkId ?? KADENA_NETWORK_ID,
    }) as Promise<{
      status: string;
      message: string;
      account: { chainId: string; account: string; publicKey: string };
    }>;
  }

  private async getAccountDetails(networkId?: string): Promise<{
    status: string;
    message: string;
    wallet: {
      chainId: string;
      account: string;
      publicKey: string;
      balance: number;
    };
  }> {
    return this.provider?.request({
      method: 'kda_requestAccount',
      networkId: networkId ?? KADENA_NETWORK_ID,
    }) as Promise<{
      status: string;
      message: string;
      wallet: {
        chainId: string;
        account: string;
        publicKey: string;
        balance: number;
      };
    }>;
  }

  public async signTx(command: IPactCommand): Promise<KadenaWalletResponse> {
    const cmd = formatCommandForWallets(command);
    const response = (await this.provider?.request({
      method: 'kda_requestSign',
      data: {
        networkId: KADENA_NETWORK_ID,
        signingCmd: { ...cmd, raw: true },
      },
    })) as {
      status: string;
      message: string;
      signedCmd?: {
        cmd: string;
        hash: string;
        sigs: [{ sig: string }];
      };
    };
    console.log(response);

    return {
      status: response.status,
      signedCmd: response.signedCmd || null,
      errors: response.status === 'success' ? null : response.message,
    };
  }

  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation();
    try {
      await this.isomorphicInitialize();
      if (!this.provider) return cancelActivation();

      const networkInfo = await this.getNetworkInfo();
      await this.connectWallet();
      const { status } = await this.checkStatus();
      if (status === 'success') {
        const { wallet } = await this.getAccountDetails();
        const { data } = await checkVerifiedAccount(wallet.account);

        wallet.balance = data ? data.balance : 0;

        this.actions.update({
          networkId: networkInfo.networkId,
          account: wallet,
        });
      } else {
        throw new Error('Not Connected');
      }
    } catch (error) {
      console.debug('eckoWallet: Could not connect eagerly', error);
      this.actions.resetState();
      cancelActivation();
    }
  }

  public async activate(): Promise<void> {
    const cancelActivation = this.actions.startActivation();
    try {
      await this.isomorphicInitialize();

      const networkInfo = await this.getNetworkInfo();
      await this.connectWallet();

      const { status } = await this.checkStatus();
      if (status === 'success') {
        const { wallet } = await this.getAccountDetails();
        const { data } = await checkVerifiedAccount(wallet.account);

        wallet.balance = data ? data.balance : 0;

        this.actions.update({
          networkId: networkInfo.networkId,
          account: wallet,
        });
      } else {
        throw new Error('Not Connected');
      }
    } catch (err) {
      cancelActivation();
      throw err;
    }
  }

  public async deactivate(): Promise<void> {
    try {
      await this.disconnect();
      this.actions.resetState();
    } catch (err) {
      throw err;
    }
  }
}
