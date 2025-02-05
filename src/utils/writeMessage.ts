import {
  CHAIN_INFO,
  KADENA_CHAIN_ID,
  KADENA_NETWORK_ID,
} from '@/kadena/constants/chainInfo';
import { checkVerifiedAccount } from '@/utils/kadenaHelper';
import type { ICommandResult } from '@kadena/client';
import { Pact, createClient } from '@kadena/client';

export default async function writeMessage({
  account,
  messageToWrite,
  connector,
}): Promise<ICommandResult> {
  if (account) {
    try {
      const { data } = await checkVerifiedAccount(account);

      const client = createClient(CHAIN_INFO[KADENA_NETWORK_ID].nodeUrl);

      const command = Pact.builder
        .execution(
          // @ts-ignore
          Pact.modules['free.cka-message-store']['write-message'](
            account.account,
            messageToWrite,
          ),
        )
        .addSigner(
          {
            pubKey: account.publicKey,
            scheme: account?.scheme ? account.scheme : 'ED25519',
          },
          (withCapability) => [
            withCapability('coin.GAS'),
            withCapability(
              'free.cka-message-store.ACCOUNT-OWNER',
              account.account,
            ),
          ],
        )
        .setMeta({ chainId: KADENA_CHAIN_ID, senderAccount: account.account })
        .setNetworkId(KADENA_NETWORK_ID as string)
        .getCommand();

      const signedTx = await connector.signTx(command);

      console.log(signedTx);

      if (signedTx) {
        console.log('sending tx');
        const transactionDescriptor = await client.send(signedTx.signedCmd);
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
}
