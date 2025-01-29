import { Chainweaver } from '@/kadena/chainweaver';
import { initializeConnector, KadenaReactHooks } from '@/kadena/core';
import { EckoWallet } from '@/kadena/ecko-wallet';
import { SpireKeyConnector } from '@/kadena/spirekey';
import { Connector } from '@/kadena/types';
import { WalletConnect } from '@/kadena/walletconnect';
import { Zelcore } from '@/kadena/zelcore';
import { useMemo } from 'react';

export enum WalletEnum {
  ECKO_WALLET = 'ECKO_WALLET',
  ZELCORE = 'ZELCORE',
  CHAINWEAVER = 'CHAINWEAVER',
  WALLET_CONNECT = 'WALLET_CONNECT',
  SPIRE_KEY = 'SPIRE_KEY',
}

export const BACKFILLABLE_KADENA_WALLETS = [
  WalletEnum.ECKO_WALLET,
  WalletEnum.ZELCORE,
  WalletEnum.CHAINWEAVER,
  WalletEnum.WALLET_CONNECT,
  WalletEnum.SPIRE_KEY,
];

export const SELECTABLE_KADENA_WALLETS = [...BACKFILLABLE_KADENA_WALLETS];

function onError(error: Error) {
  console.debug(`web3-react error: ${error}`);
}

export const [eckoWallet, eckoWalletHooks] = initializeConnector<EckoWallet>(
  (actions) => new EckoWallet({ actions, onError }),
);
export const [zelcore, zelcoreHooks] = initializeConnector<Zelcore>(
  (actions) => new Zelcore({ actions, onError }),
);
export const [chainweaver, chainweaverHooks] = initializeConnector<Chainweaver>(
  (actions) => new Chainweaver({ actions, onError }),
);
export const [spireKey, spireKeyHooks] = initializeConnector<SpireKeyConnector>(
  (actions) => new SpireKeyConnector({ actions, onError }),
);
export const [walletConnect, walletConnectHooks] =
  initializeConnector<WalletConnect>(
    (actions) =>
      new WalletConnect({
        actions,
        onError,
      }),
  );

export function getKadenaWalletForConnector(connector: Connector) {
  switch (connector) {
    case eckoWallet:
      return WalletEnum.ECKO_WALLET;
    case zelcore:
      return WalletEnum.ZELCORE;
    case chainweaver:
      return WalletEnum.CHAINWEAVER;
    case walletConnect:
      return WalletEnum.WALLET_CONNECT;
    case spireKey:
      return WalletEnum.SPIRE_KEY;
    default:
      throw Error('unsupported connector');
  }
}

export function getConnectorForKadenaWallet(wallet: WalletEnum) {
  switch (wallet) {
    case WalletEnum.ECKO_WALLET:
      return eckoWallet;
    case WalletEnum.ZELCORE:
      return zelcore;
    case WalletEnum.CHAINWEAVER:
      return chainweaver;
    case WalletEnum.WALLET_CONNECT:
      return walletConnect;
    case WalletEnum.SPIRE_KEY:
      return spireKey;
    default:
      throw Error('unsupported connector');
  }
}

function getHooksForKadenaWallet(wallet: WalletEnum) {
  switch (wallet) {
    case WalletEnum.ECKO_WALLET:
      return eckoWalletHooks;
    case WalletEnum.ZELCORE:
      return zelcoreHooks;
    case WalletEnum.CHAINWEAVER:
      return chainweaverHooks;
    case WalletEnum.WALLET_CONNECT:
      return walletConnectHooks;
    case WalletEnum.SPIRE_KEY:
      return spireKeyHooks;
  }
}

interface KdaConnectorListItem {
  connector: Connector;
  hooks: KadenaReactHooks;
}

function getKdaConnectorListItemForKadenaWallet(wallet: WalletEnum) {
  return {
    connector: getConnectorForKadenaWallet(wallet),
    hooks: getHooksForKadenaWallet(wallet),
  };
}

export function useKadenaConnectors(selectedWallet: WalletEnum | undefined) {
  return useMemo(() => {
    const connectors: KdaConnectorListItem[] = [];
    if (selectedWallet) {
      connectors.push(getKdaConnectorListItemForKadenaWallet(selectedWallet));
    }
    connectors.push(
      ...SELECTABLE_KADENA_WALLETS.filter(
        (wallet) => wallet !== selectedWallet,
      ).map(getKdaConnectorListItemForKadenaWallet),
    );
    const kadenaReactConnectors: [Connector, KadenaReactHooks][] =
      connectors.map(({ connector, hooks }) => [connector, hooks]);
    return kadenaReactConnectors;
  }, [selectedWallet]);
}
