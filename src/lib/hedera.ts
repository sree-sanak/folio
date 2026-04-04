import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociateTransaction,
  TokenMintTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenId,
  Hbar,
} from '@hashgraph/sdk';

// Module-level singleton (persists across warm serverless invocations)
let clientInstance: Client | null = null;

export function getClient(): Client {
  if (clientInstance) return clientInstance;

  const operatorId = process.env.HEDERA_OPERATOR_ID!;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY!;

  clientInstance = Client.forTestnet();
  clientInstance.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringDer(operatorKey)
  );
  clientInstance.setDefaultMaxTransactionFee(new Hbar(10));

  return clientInstance;
}

export function getOperatorId(): AccountId {
  return AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
}

export function getOperatorKey(): PrivateKey {
  return PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);
}

// Create a fungible token (MOCK-TSLA or USDC-TEST)
export async function createFungibleToken(
  name: string,
  symbol: string,
  initialSupply: number,
  decimals: number = 6
): Promise<string> {
  const client = getClient();
  const operatorKey = getOperatorKey();

  const tx = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(getOperatorId())
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return receipt.tokenId!.toString();
}

// Create an NFT collection (SPEND-NOTE)
export async function createNftCollection(
  name: string,
  symbol: string,
  maxSupply: number = 1000
): Promise<string> {
  const client = getClient();
  const operatorKey = getOperatorKey();

  const tx = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(getOperatorId())
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(maxSupply)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return receipt.tokenId!.toString();
}

export interface SpendNoteMetadata {
  name: string;
  asset: string;
  shares_collared: number;        // integer decimal 6
  stock_price_at_spend: number;   // integer decimal 6
  collar_floor: number;           // integer decimal 6
  collar_cap: number;             // integer decimal 6
  advance_usdc: number;           // integer decimal 6
  platform_spread: number;        // integer decimal 6
  created_at: string;             // ISO string
  expires_at: string;             // ISO string
  status: string;                 // 'active'
}

export async function mintSpendNoteWithIpfs(
  metadata: SpendNoteMetadata
): Promise<{ serial: number; cid: string }> {
  let cid: string;

  if (!process.env.PINATA_API_KEY) {
    cid = 'demo-cid';
  } else {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PINATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: metadata.name },
      }),
    });
    const data = await response.json();
    cid = data.IpfsHash;
  }

  const serial = await mintSpendNote(new TextEncoder().encode(`ipfs://${cid}`));
  return { serial, cid };
}

// Mint a Spend Note NFT with metadata
export async function mintSpendNote(metadata: Uint8Array): Promise<number> {
  const client = getClient();
  const operatorKey = getOperatorKey();
  const tokenId = TokenId.fromString(process.env.SPEND_NOTE_TOKEN_ID!);

  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .addMetadata(metadata)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return receipt.serials[0].toNumber();
}

// Associate tokens with a user account (requires the account owner's key)
export async function associateTokens(
  accountId: string,
  tokenIds: string[],
  accountKey?: string
): Promise<void> {
  const client = getClient();
  const signingKey = accountKey
    ? PrivateKey.fromStringDer(accountKey)
    : getOperatorKey();

  const tx = new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds(tokenIds.map((id) => TokenId.fromString(id)))
    .freezeWith(client);

  const signed = await tx.sign(signingKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

// Transfer fungible tokens (used for escrow lock + USDC advance)
export async function transferToken(
  tokenId: string,
  fromAccount: string,
  toAccount: string,
  amount: number
): Promise<string> {
  const client = getClient();
  const operatorKey = getOperatorKey();

  const tx = new TransferTransaction()
    .addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(fromAccount),
      -amount
    )
    .addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(toAccount),
      amount
    )
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return response.transactionId.toString();
}

// Transfer NFT (Spend Note to user)
export async function transferNft(
  tokenId: string,
  serial: number,
  fromAccount: string,
  toAccount: string
): Promise<string> {
  const client = getClient();
  const operatorKey = getOperatorKey();

  const tx = new TransferTransaction()
    .addNftTransfer(
      TokenId.fromString(tokenId),
      serial,
      AccountId.fromString(fromAccount),
      AccountId.fromString(toAccount)
    )
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);

  return response.transactionId.toString();
}

// Create a new Hedera account (for new app users)
export async function createAccount(): Promise<{ accountId: string; privateKey: string }> {
  const client = getClient();
  const newKey = PrivateKey.generateED25519();

  const tx = new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(5)) // Fund with 5 HBAR for testnet tx fees
    .freezeWith(client);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  const accountId = receipt.accountId!.toString();

  return { accountId, privateKey: newKey.toStringDer() };
}

// Get token balances for an account
export async function getTokenBalances(
  accountId: string
): Promise<Map<string, number>> {
  const client = getClient();
  const balance = await new AccountBalanceQuery()
    .setAccountId(AccountId.fromString(accountId))
    .execute(client);

  const result = new Map<string, number>();
  if (balance.tokens) {
    // Convert the token map — values are Long objects, use toString() to avoid precision loss
    const tokenMap = balance.tokens._map ?? balance.tokens;
    if (tokenMap instanceof Map) {
      tokenMap.forEach((value: unknown, key: unknown) => {
        result.set(String(key), Number(String(value)));
      });
    }
  }

  return result;
}
