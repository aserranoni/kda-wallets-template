import { CHAIN_INFO, KADENA_NETWORK_ID } from '@/kadena/constants/chainInfo';
import { checkVerifiedAccount, createSignCmd } from '@/utils/kadenaHelper';
import type { ICommandResult } from '@kadena/client';
import Pact from 'pact-lang-api';

interface IWriteMessage {
  account: string;
  messageToWrite: string;
}

export default async function writeMessage({
  account,
  messageToWrite,
  connector,
}: IWriteMessage): Promise<ICommandResult> {
  try {
    const { data } = await checkVerifiedAccount(account);

    const pactCode =
      "(free.cka-message-store.write-message (read-msg 'account) (read-msg 'message))";
    const caps = [
      Pact.lang.mkCap('Gas capability', 'Pay gas', 'coin.GAS', []),
      Pact.lang.mkCap(
        'Confirm your identity',
        'Account Guard',
        `free.cka-message-store.ACCOUNT-OWNER`,
        [`${account}`],
      ),
    ];
    const envData = {
      account: account,
      message: messageToWrite,
    };

    const signCmd = createSignCmd(
      pactCode,
      KADENA_NETWORK_ID,
      envData,
      caps,
      { account: data.account, guard: data.guard },
      '',
      { PRICE: 0.00000001, LIMIT: 3000 },
      account,
    );
    const signedTx = await connector.signTx(signCmd);
    console.log('resp:', signedTx);
    const nodeUrl = CHAIN_INFO[KADENA_NETWORK_ID].nodeUrl;
    if (signedTx) {
      const transactionDescriptor = await Pact.wallet.sendSigned(
        signedTx.signedCmd,
        nodeUrl,
      );
      console.log('tx', transactionDescriptor);
      // const response = await Pact.wallet.listen(transactionDescriptor);
      if (response.result.status === 'success') {
        return response;
      } else {
        throw new Error(response.result.error);
      }
    } else {
      throw new Error('Failed to sign transaction');
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error(e.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}
