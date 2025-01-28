import { KADENA_SUPPORTED_WALLETS } from '@/kadena/constants/wallets';
import { useKadenaReact } from '@/kadena/core';
import styles from '@/styles/main.module.css';
import { useState } from 'react';

interface AccountInsertProps {
  onConnectSelectedAccount: (account: string) => void;
}

export default function AccountInsert({
  onConnectSelectedAccount,
}: AccountInsertProps) {
  const { connector } = useKadenaReact();
  const [account, setAccount] = useState<string>('');

  function formatConnectorName() {
    const name = Object.keys(KADENA_SUPPORTED_WALLETS)
      .filter((k) => KADENA_SUPPORTED_WALLETS[k].connector === connector)
      .map((k) => KADENA_SUPPORTED_WALLETS[k].name)[0];
    return <div className={styles.walletName}>Connecting with {name}</div>;
  }

  function handleAccountChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAccount(event.target.value);
  }

  return (
    <div className={styles.upperSection}>
      <div className={styles.accountSection}>
        <div className={styles.yourAccount}>
          <div className={styles.infoCard}>
            <div className={styles.accountGroupingRow}>
              {formatConnectorName()}
            </div>
            <div className={styles.accountGroupingRow}>
              <input
                id="account-input"
                placeholder="Insert Account"
                value={account}
                onChange={handleAccountChange}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.button}
                disabled={!account.trim()}
                onClick={() => onConnectSelectedAccount(account.trim())}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
