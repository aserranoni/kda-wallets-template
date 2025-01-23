import { KADENA_SUPPORTED_WALLETS } from '@/kadena/constants/wallets';
import { useKadenaReact } from '@/kadena/core/provider';
import { Connector } from '@/kadena/types';
import { useWalletModalToggle } from '@/kadena/wallet/hooks';
import Image from 'next/image';
import React from 'react';
import WalletModal from '../WalletModal';

interface WrappedStatusIconProps {
  connector: Connector;
}

const WrappedStatusIcon: React.FC<WrappedStatusIconProps> = ({ connector }) => {
  const wallet = Object.keys(KADENA_SUPPORTED_WALLETS)
    .filter((key) => KADENA_SUPPORTED_WALLETS[key].connector === connector)
    .map((key) => KADENA_SUPPORTED_WALLETS[key])[0];

  return (
    <Image
      width={24}
      height={24}
      src={wallet.iconURL}
      alt={wallet.name}
      className="text-white"
    />
  );
};

const Web3StatusInner: React.FC = () => {
  const { account, connector } = useKadenaReact();
  const toggleWalletModal = useWalletModalToggle();

  return (
    <div onClick={toggleWalletModal} className="text-white">
      {account ? (
        <div className="flex items-center">
          {connector && <WrappedStatusIcon connector={connector} />}
          <span className="ml-2">{account.account}</span>
        </div>
      ) : (
        'Connect Wallet'
      )}
    </div>
  );
};

const Web3Status: React.FC = () => {
  const toggleWalletModal = useWalletModalToggle();
  return (
    <>
      <Web3StatusInner />
      <WalletModal onClose={toggleWalletModal} />
    </>
  );
};

export default Web3Status;
