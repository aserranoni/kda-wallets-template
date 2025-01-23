import { Actions, Connector, Provider, KadenaAccount } from "../types";
import { PactCommandToSign, PactSignedTx } from "../../utils/kadenaHelper";
import { KADENA_NETWORK_ID , KADENA_CHAIN_ID } from "@/constants/chainInfo";
import { IUnsignedCommand } from "@kadena/types";
import { Pact } from "@kadena/client"


export interface SpireWalletConstructorArgs {
  actions: Actions;
  onError?: (error: Error) => void;
}

export class SpireWalletConnector extends Connector {
  public provider?: Provider;
  public readonly actions: Actions;
  public KdaAccount?: KadenaAccount;
  public account: any;

  constructor({ actions, onError }: SpireWalletConstructorArgs) {
    super(actions, onError);
    this.actions = actions;

    // Only add the listener in the browser
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleExtensionResponse.bind(this));
    }
  }

  // Handle messages from the extension
  private handleExtensionResponse(event: MessageEvent) {
    if (event.data.type === "FROM_EXTENSION") {
      console.log("Received response from extension:", event.data.response);
      this.account = event.data.response.account; // Update account with received data
      this.KdaAccount = event.data.response.account;
      this.actions.update({
        networkId: KADENA_NETWORK_ID,
        account: event.data.response.account,
      });
    }
  }

  private toUnsignedCommand(cmd: PactCommandToSign): {
    command: IUnsignedCommand | undefined;
} {
    if (this.KdaAccount) {
        const builder = Pact.builder
            .execution(cmd.code as PactCode)
            .setMeta({
                gasLimit: cmd.gasLimit,
                gasPrice: cmd.gasPrice,
                senderAccount: cmd.sender,
                chainId: KADENA_CHAIN_ID,
                ttl: cmd.ttl,
            })
            .setNetworkId(KADENA_NETWORK_ID)
            .setNonce(cmd.nonce || new Date().toISOString())
            .addSigner(
                {
                    pubKey: this.KdaAccount.publicKey ?? "",
                    scheme: "WebAuthn",
                },
                (withCap) =>
                    cmd.caps.map((e) =>
                        withCap(e.cap.name, ...e.cap.args)
                    )
            );

        console.log(JSON.stringify(builder));

        // Add any environment data if present
        if (cmd.envData) {
            Object.keys(cmd.envData).forEach((key) => {
                if (cmd.envData) builder.addData(key, cmd.envData[key]);
            });
        }
        const unsignedCommand: IUnsignedCommand = builder.createTransaction();

        return { command: unsignedCommand };
    }

    return { command: undefined };
}

public async signTx(command: PactCommandToSign): Promise<PactSignedTx> {
  const cmd = this.toUnsignedCommand(command);

  if (typeof window !== "undefined") {
    console.log("Sending SIGN_REQUEST to extension");

    // Wrap the response handling in a Promise
    return new Promise((resolve, reject) => {
      // Define a unique request ID to match responses
      const requestId = `sign_request_${Date.now()}`;
      const listener = (event: MessageEvent) => {
        // Ensure the message comes from your wallet and matches the request
        if (
          event.source === window &&
          event.data.type === "SIGN_RESPONSE"
        ) {
          console.log("Got Sign response");
          window.removeEventListener("message", listener); // Clean up the listener

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              status: "success",
              signedCmd: event.data.signedCmd,
              errors: null,
            });
          }
        }
      };

      // Add a message listener to capture the response
      window.addEventListener("message", listener);

      // Send the SIGN_REQUEST message with the unique request ID
      window.postMessage(
        { type: "SIGN_REQUEST", requestId, data: cmd.command },
        "*"
      );

      // Optional timeout to reject if no response is received within a time frame
      setTimeout(() => {
        window.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for wallet response"));
      }, 30000); // Adjust timeout duration as needed
    });
  } else {
    return Promise.reject(new Error("Window is not defined"));
  }
}


  public async connect(): Promise<void> {
    if (typeof window !== "undefined") {
      console.log("Sending CONNECT_REQUEST to extension");
      window.postMessage({ type: "CONNECT_REQUEST" }, "*");
    } else {
      console.warn("Attempted to call connect() outside of browser environment");
    }
  }

  public async activate(): Promise<void> {
    try {
      await this.connect();
      this.actions.update({
        networkId: KADENA_NETWORK_ID,
        account: this.KdaAccount!,
      });
    } catch (err) {
      console.error("Activation failed:", err);
      throw err;
    }
  }
}
