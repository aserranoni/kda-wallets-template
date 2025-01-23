import { useAppDispatch } from '@/app/hooks';
import { getKadenaWalletForConnector, WalletEnum } from '@/kadena/connectors';
import { KADENA_SUPPORTED_WALLETS } from '@/kadena/constants/wallets';
import { useKadenaReact } from '@/kadena/core';
import { Connector } from '@/kadena/types';
import { updateWalletError } from '@/kadena/wallet/walletSlice';
import { HeadModal, setConnectedAccount } from '@/main/mainSlice';
import { updateSelectedWallet } from '@/user/userSlice';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XCircle } from 'react-feather';
import { useModalOpen, useWalletModalToggle } from '../../wallet/hooks';
import AccountDetails from '../AccountDetails';
import AccountInsert from '../AccountInsert';
import AccountSelect from '../AccountSelect';

const WALLET_VIEWS = {
  OPTIONS: 'options',
  ACCOUNT: 'account',
  PENDING: 'pending',
  SELECT_ACCOUNT: 'select_account',
  INSERT_ACCOUNT: 'insert_account',
};

interface OptionProps {
  option: {
    iconURL: string;
    name: string;
  };
  onClick: () => void;
}

const Option: React.FC<OptionProps> = ({ option, onClick }) => (
  <div
    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100"
    onClick={onClick}
  >
    <img src={option.iconURL} alt={option.name} className="h-8 w-8 mr-4" />
    <span className="font-medium">{option.name}</span>
  </div>
);

export default function WalletModal() {
  const dispatch = useAppDispatch();
  const { connector, account, sharedAccounts } = useKadenaReact();
  const walletModalOpen = useModalOpen(HeadModal.WALLET);
  const toggleWalletModal = useWalletModalToggle();
  const [walletView, setWalletView] = useState(WALLET_VIEWS.OPTIONS);
  const [pendingConnector, setPendingConnector] = useState<
    Connector | undefined
  >();
  const modalRef = useRef<HTMLDivElement>(null);

  const openOptions = useCallback(
    () => setWalletView(WALLET_VIEWS.OPTIONS),
    [],
  );

  const onConnectSelectedAccount = useCallback(
    (account: string) => {
      const wallet = getKadenaWalletForConnector(connector);
      try {
        setPendingConnector(connector);
        setWalletView(WALLET_VIEWS.PENDING);
        dispatch(updateWalletError({ wallet, error: undefined }));
        connector.onSelectAccount?.(account);
        dispatch(updateSelectedWallet({ wallet }));
      } catch (error: any) {
        dispatch(updateWalletError({ wallet, error: error.message }));
      }
    },
    [connector, dispatch],
  );

  const tryActivationForKadena = useCallback(
    async (kadenaConnector: Connector) => {
      try {
        setPendingConnector(kadenaConnector);
        setWalletView(WALLET_VIEWS.PENDING);
        await kadenaConnector.activate();
        dispatch(
          updateSelectedWallet({
            wallet: getKadenaWalletForConnector(kadenaConnector),
          }),
        );
      } catch (error: any) {
        dispatch(
          updateWalletError({
            wallet: getKadenaWalletForConnector(kadenaConnector),
            error: error.message,
          }),
        );
        setWalletView(WALLET_VIEWS.OPTIONS);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (account?.account) dispatch(setConnectedAccount(account.account));
  }, [account, dispatch]);

  useEffect(() => {
    if (walletModalOpen) {
      const wallet = getKadenaWalletForConnector(connector);
      if (wallet === WalletEnum.ZELCORE && sharedAccounts && !account) {
        setWalletView(WALLET_VIEWS.SELECT_ACCOUNT);
      } else if (wallet === WalletEnum.CHAINWEAVER && !account) {
        setWalletView(WALLET_VIEWS.INSERT_ACCOUNT);
      } else if (account) {
        setWalletView(WALLET_VIEWS.ACCOUNT);
      } else {
        setWalletView(WALLET_VIEWS.OPTIONS);
      }
    }
  }, [walletModalOpen, connector, account, sharedAccounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        toggleWalletModal();
      }
    };

    if (walletModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletModalOpen, toggleWalletModal]);

  const getOptions = () =>
    Object.keys(KADENA_SUPPORTED_WALLETS).map((key) => {
      const option = KADENA_SUPPORTED_WALLETS[key];
      return option.connector ? (
        <Option
          key={key}
          option={option}
          onClick={() => tryActivationForKadena(option.connector)}
        />
      ) : null;
    });

  const getModalContent = () => {
    if (walletView === WALLET_VIEWS.ACCOUNT)
      return <AccountDetails openOptions={openOptions} />;
    if (walletView === WALLET_VIEWS.SELECT_ACCOUNT)
      return (
        <AccountSelect
          openOptions={openOptions}
          onConnectSelectedAccount={onConnectSelectedAccount}
        />
      );
    if (walletView === WALLET_VIEWS.INSERT_ACCOUNT)
      return (
        <AccountInsert
          openOptions={openOptions}
          onConnectSelectedAccount={onConnectSelectedAccount}
        />
      );
    return <div className="flex flex-col space-y-2">{getOptions()}</div>;
  };

  if (!walletModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div
        className="bg-white p-4 rounded-lg shadow-md w-full max-w-md"
        ref={modalRef}
      >
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h2 className="text-lg font-bold">Wallet Modal</h2>
          <XCircle
            className="h-6 w-6 cursor-pointer"
            onClick={toggleWalletModal}
          />
        </div>
        {getModalContent()}
      </div>
    </div>
  );
}
