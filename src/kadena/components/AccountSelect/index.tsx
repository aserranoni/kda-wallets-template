import { Dropdown } from '@/components/Dropdown';
import { OptionType } from '@/components/Dropdown/types';
import { KADENA_SUPPORTED_WALLETS } from '@/kadena/constants/wallets';
import { useWalletModalToggle } from '@/kadena/wallet/hooks';
import styles from '@/styles/main.module.css';
import { useEffect, useState } from 'react';
import { useKadenaReact } from '../../../kadena/core';

interface AccountSelectprops {
  openOptions: () => void;
  onConnectSelectedAccount: (account: string) => void;
}

export default function AccountSelect({
  openOptions,
  onConnectSelectedAccount,
}: AccountSelectprops) {
  const toggleWalletModal = useWalletModalToggle();
  const { sharedAccounts, connector } = useKadenaReact();
  const [selectedOption, setSelectedOption] = useState<OptionType>({
    name: '',
    value: '',
  });

  useEffect(() => {
    if (sharedAccounts && sharedAccounts.length > 0) {
      setSelectedOption({
        name: sharedAccounts[0],
        value: sharedAccounts[0],
      });
    }
  }, [sharedAccounts]);

  function formatConnectorName() {
    const name = Object.keys(KADENA_SUPPORTED_WALLETS)
      .filter((k) => KADENA_SUPPORTED_WALLETS[k].connector === connector)
      .map((k) => KADENA_SUPPORTED_WALLETS[k].name)[0];
    return (
      <div className="initial text-sm font-medium text-white">
        Connected with {name}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute right-4 top-3 cursor-pointer opacity-100 hover:opacity-60"
        onClick={toggleWalletModal}
      ></div>
      <div>
        <div className="flex flex-row items-center justify-between font-medium">
          {formatConnectorName()}
        </div>
        <div className={`${styles.modalBody}`}>
          <div className="flex flex-col">
            {sharedAccounts && (
              <Dropdown
                options={sharedAccounts.map(
                  (item) =>
                    ({
                      name: item,
                      value: item,
                    }) as OptionType,
                )}
                title=""
                currentOption={selectedOption}
                setCurrentOption={setSelectedOption}
              />
            )}
          </div>
        </div>
        <div className={styles.modalActions}>
          <div>
            <button
              onClick={() => {
                onConnectSelectedAccount(selectedOption.value as string);
              }}
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
