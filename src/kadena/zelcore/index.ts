import { BaseChainInfo, KADENA_CHAIN_ID } from '@/kadena/constants/chainInfo';
import {
  checkVerifiedAccount,
  formatCommandForWallets,
} from '@/utils/kadenaHelper';
import { IPactCommand } from '@kadena/client';
import { Actions, Connector, KadenaWalletResponse, Provider } from '../types';
import detectKadenaProvider from './provider';

type ZelcoreProvider = Provider & {
  isKadena?: boolean;
  isConnected?: () => boolean;
  chainInfo: BaseChainInfo;
  providers?: ZelcoreProvider[];
};

export class NoZelcoreError extends Error {
  public constructor() {
    super('Zelcore not installed');
    this.name = NoZelcoreError.name;
    Object.setPrototypeOf(this, NoZelcoreError.prototype);
  }
}

/**
 * @param options - Options to pass to `@zelcore/detect-provider`
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface ZelcoreConstructorArgs {
  actions: Actions;
  options?: Parameters<typeof detectKadenaProvider>[0];
  onError?: (error: Error) => void;
}

export class Zelcore extends Connector {
  /** {@inheritdoc Connector.provider} */
  public provider?: ZelcoreProvider;

  private readonly options?: Parameters<typeof detectKadenaProvider>[0];
  private eagerConnection?: Promise<void>;

  constructor({ actions, options, onError }: ZelcoreConstructorArgs) {
    super(actions, onError);
    this.options = options;
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return;

    return (this.eagerConnection = import('./provider').then(async (m) => {
      const provider = await m.default(this.options);
      if (provider) {
        this.provider = provider as ZelcoreProvider;

        if (this.provider.providers?.length) {
          this.provider =
            this.provider.providers.find((p) => p.isKadena) ??
            this.provider.providers[0];
        }
      }
    }));
  }

  private async getAccounts(): Promise<{
    accounts: string[];
    errors: any;
  }> {
    const response = await fetch('http://127.0.0.1:9467/v1/accounts', {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ asset: 'kadena' }),
    });

    const { data, errors } = await response.json();

    if (response.ok) {
      return {
        accounts: data,
        errors: null,
      };
    } else {
      return {
        accounts: [],
        errors,
      };
    }
  }

  public async signTx(command: IPactCommand): Promise<KadenaWalletResponse> {
    const cmd = formatCommandForWallets(command);
    const cmdToSign = { ...cmd, data: command.envData };
    const response = await fetch('http://127.0.0.1:9467/v1/sign', {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(cmdToSign),
    });

    const { body, errors } = await response.json();

    if (response.ok) {
      return {
        status: 'success',
        errors: null,
        signedCmd: body,
      };
    } else {
      return {
        status: 'failure',
        signedCmd: null,
        errors,
      };
    }
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation();
    try {
      await this.isomorphicInitialize();
      if (!this.provider) return cancelActivation();

      const { accounts } = await this.getAccounts();

      if (accounts.length > 0) {
        this.actions.update({
          networkId: this.provider.chainInfo.id,
          sharedAccounts: accounts,
        });
      } else throw Error('Not Connected');
    } catch (error) {
      console.debug('zelcore: Could not connect eagerly', error);
      this.actions.resetState();
      cancelActivation();
    }
  }

  /**
   * Initiates a connection.
   *
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   */
  public async activate(): Promise<void> {
    let cancelActivation: () => void = () => {};
    if (!this.provider?.isConnected?.())
      cancelActivation = this.actions.startActivation();
    try {
      await this.isomorphicInitialize();

      const { accounts } = await this.getAccounts();

      if (accounts.length > 0) {
        this.actions.update({
          networkId: this.provider?.chainInfo.id!,
          sharedAccounts: accounts,
        });
      } else throw Error('Not Connected');
    } catch (err) {
      cancelActivation?.();
      throw err;
    }
  }

  public async onSelectAccount(account: string): Promise<void> {
    try {
      const { status, message, data } = await checkVerifiedAccount(account);

      if (status === 'success' && data) {
        this.actions.update({
          account: {
            account: data.account,
            balance: data.balance,
            chainId: KADENA_CHAIN_ID,
            publicKey: data.guard.keys[0],
          },
          sharedAccounts: undefined,
        });
      } else throw Error(message);
    } catch (error) {
      console.log('zelcore: Could not connect', error);
      this.actions.resetState();
    }
  }

  public async deactivate(): Promise<void> {
    try {
      this.actions.resetState();
    } catch (err) {
      throw err;
    }
  }
}
