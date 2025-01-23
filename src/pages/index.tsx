import Web3Status from '@/kadena/components/Web3Status';
import { useKadenaReact } from '@/kadena/core';
import styles from '@/styles/main.module.css';
import readMessage from '@/utils/readMessage';
import writeMessage from '@/utils/writeMessage';
import Head from 'next/head';
import Image from 'next/image';
import React, { useState } from 'react';
import { SpinnerRoundFilled } from 'spinners-react';
import KadenaImage from '../../public/assets/k-community-icon.png';

const Home: React.FC = (): JSX.Element => {
  const { account, connector } = useKadenaReact();
  const [messageToWrite, setMessageToWrite] = useState<string>('');
  const [messageFromChain, setMessageFromChain] = useState<string>('');
  const [writeInProgress, setWriteInProgress] = useState<boolean>(false);

  const handleWriteMessageInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    setMessageToWrite(event.target.value);
  };

  const handleWriteMessageClick = async () => {
    if (!account?.account) {
      alert('Connect Wallet to write a message');
      return;
    }

    setWriteInProgress(true);
    try {
      console.log(account);
      if (account) {
        await writeMessage({
          account: account?.account,
          messageToWrite,
          connector,
        });
        setMessageToWrite(''); // Clear input after successful write
      }
    } catch (error) {
      console.error('Error writing message:', error);
    } finally {
      setWriteInProgress(false);
    }
  };

  const handleReadMessageClick = async () => {
    if (!account?.account) {
      alert('Connect Wallet to read a message');
      return;
    }

    try {
      const message = await readMessage({ account });
      setMessageFromChain(message);
    } catch (error) {
      console.error('Error reading message:', error);
    }
  };

  return (
    <div>
      <Head>
        <title>Create Kadena App: Next Template</title>
        <link rel="icon" href="/favicon.png" />
      </Head>
      <main className={styles.grid}>
        <section className={styles.headerWrapper}>
          <div className={styles.header}>
            <Image
              src={KadenaImage}
              alt="Kadena Community Logo"
              className={styles.logo}
            />
            <h1 className={styles.title}>
              Start Interacting with the Kadena Blockchain
            </h1>
            <p className={styles.note}>
              This is the Kadena starter template using <strong>NextJS</strong>
              &nbsp; to help you get started on your blockchain development.
            </p>
            <p className={styles.note}>
              Use the form below to interact with the Kadena blockchain
              using&nbsp;
              <code>@kadena/client</code> and edit&nbsp;
              <code>src/pages/index.tsx</code> to get started.
            </p>
          </div>
        </section>
        <section className={styles.contentWrapper}>
          <Web3Status />
          <div className={styles.blockChain}>
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Write to the Blockchain</h4>
              <fieldset className={styles.fieldset}>
                <label htmlFor="account" className={styles.fieldLabel}>
                  My Account
                </label>
                <input
                  id="account"
                  value={account?.account || ''}
                  readOnly
                  placeholder="Please connect your wallet"
                  className={`${styles.input} ${styles.codeFont}`}
                />
              </fieldset>
              <fieldset className={styles.fieldset}>
                <label htmlFor="write-message" className={styles.fieldLabel}>
                  Write Message
                </label>
                <textarea
                  id="write-message"
                  onChange={handleWriteMessageInputChange}
                  value={messageToWrite}
                  disabled={writeInProgress}
                  placeholder="Enter your message here"
                  className={styles.input}
                />
              </fieldset>
              <div className={styles.buttonWrapper}>
                {writeInProgress && (
                  <SpinnerRoundFilled size={36} color="#ed098f" />
                )}
                <button
                  onClick={handleWriteMessageClick}
                  disabled={
                    !account?.account || !messageToWrite || writeInProgress
                  }
                  className={styles.button}
                >
                  Write
                </button>
              </div>
            </div>
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>Read from the Blockchain</h4>
              <fieldset className={styles.fieldset}>
                <label htmlFor="read-message" className={styles.fieldLabel}>
                  Read Message
                </label>
                <textarea
                  id="read-message"
                  disabled
                  value={messageFromChain}
                  placeholder="Message will appear here"
                  className={styles.input}
                />
              </fieldset>
              <div className={styles.buttonWrapper}>
                <button
                  onClick={handleReadMessageClick}
                  disabled={!account?.account}
                  className={styles.button}
                >
                  Read
                </button>
              </div>
            </div>
          </div>
          <div className={styles.helperSection}>
            <div className={`${styles.card} ${styles.noBackground}`}>
              <h4 className={styles.cardTitle}>Resources</h4>
              <ul className={styles.list}>
                <li>
                  <a
                    className={styles.link}
                    href="https://docs.kadena.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find in-depth information about Kadena. &rarr;
                  </a>
                </li>
                <li>
                  <a
                    className={styles.link}
                    href="https://github.com/kadena-community/kadena.js/tree/main/packages/tools/create-kadena-app/pact"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    The smart contract powering this page. &rarr;
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
