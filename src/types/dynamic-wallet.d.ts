// Type declarations for @dynamic-labs-wallet packages
// The published packages reference ./src/index which doesn't ship in the dist.
// These declarations cover the APIs we use.

declare module '@dynamic-labs-wallet/node-evm' {
  export class DynamicEvmWalletClient {
    constructor(options: { environmentId: string; enableMPCAccelerator?: boolean });
    authenticateApiToken(token: string): Promise<void>;
    createWalletAccount(options: {
      thresholdSignatureScheme: string;
      password?: string;
      backUpToClientShareService?: boolean;
      onError?: (error: Error) => void;
    }): Promise<{
      address: string;
      id: string;
      accountAddress: string;
      rawPublicKey: string;
      publicKeyHex: string;
      externalServerKeyShares?: string;
      walletId: string;
    }>;
    signMessage(options: { walletId: string; message: string }): Promise<string>;
    signTransaction(options: {
      walletId: string;
      transaction: Record<string, unknown>;
    }): Promise<string>;
  }

  export function createDelegatedEvmWalletClient(options: {
    environmentId: string;
    apiKey: string;
    baseMPCRelayApiUrl?: string;
    debug?: boolean;
  }): unknown;

  export function delegatedSignMessage(
    client: unknown,
    options: {
      walletId: string;
      walletApiKey: string;
      keyShare: string;
      message: string;
    }
  ): Promise<string>;

  export function delegatedSignTransaction(
    client: unknown,
    options: {
      walletId: string;
      walletApiKey: string;
      keyShare: string;
      transaction: Record<string, unknown>;
    }
  ): Promise<string>;

  export function delegatedSignTypedData(
    client: unknown,
    options: {
      walletId: string;
      walletApiKey: string;
      keyShare: string;
      typedData: Record<string, unknown>;
    }
  ): Promise<string>;

  export function revokeDelegation(
    client: unknown,
    options: { walletId: string; walletApiKey: string }
  ): Promise<void>;
}

declare module '@dynamic-labs-wallet/core' {
  export enum ThresholdSignatureScheme {
    TWO_OF_TWO = 'TWO_OF_TWO',
    TWO_OF_THREE = 'TWO_OF_THREE',
    THREE_OF_FIVE = 'THREE_OF_FIVE',
  }

  export enum WalletOperation {
    CREATE = 'CREATE',
    SIGN = 'SIGN',
  }

  export class DynamicWalletClient {
    constructor(options: { environmentId: string });
    authenticateApiToken(token: string): Promise<void>;
  }

  export function getMPCChainConfig(chain: string): unknown;
  export function getExternalServerKeyShareBackupInfo(
    walletId: string
  ): unknown;
}
