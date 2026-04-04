// Setup script: creates tokens on Hedera testnet and outputs env vars
// Run: npx tsx scripts/setup.ts

import 'dotenv/config';
import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
} from '@hashgraph/sdk';

async function main() {
  const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
  const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  client.setDefaultMaxTransactionFee(new Hbar(30));

  console.log(`Operator: ${operatorId}\n`);

  // 1. Create MOCK-TSLA (fungible, decimal 6)
  console.log('Creating MOCK-TSLA...');
  const tslaCreate = new TokenCreateTransaction()
    .setTokenName('Mock Tesla')
    .setTokenSymbol('MOCK-TSLA')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(6)
    .setInitialSupply(44_000_000) // 44 shares = 44 * 10^6
    .setTreasuryAccountId(operatorId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const tslaSigned = await tslaCreate.sign(operatorKey);
  const tslaResp = await tslaSigned.execute(client);
  const tslaId = (await tslaResp.getReceipt(client)).tokenId!;
  console.log(`  MOCK_TSLA_TOKEN_ID=${tslaId}`);

  // 2. Create MOCK-AAPL (fungible, decimal 6)
  console.log('Creating MOCK-AAPL...');
  const aaplCreate = new TokenCreateTransaction()
    .setTokenName('Mock Apple')
    .setTokenSymbol('MOCK-AAPL')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(6)
    .setInitialSupply(10_000_000) // 10 shares = 10 * 10^6
    .setTreasuryAccountId(operatorId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const aaplSigned = await aaplCreate.sign(operatorKey);
  const aaplResp = await aaplSigned.execute(client);
  const aaplId = (await aaplResp.getReceipt(client)).tokenId!;
  console.log(`  MOCK_AAPL_TOKEN_ID=${aaplId}`);

  // 4. Create USDC-TEST (fungible, decimal 6)
  console.log('Creating USDC-TEST...');
  const usdcCreate = new TokenCreateTransaction()
    .setTokenName('Test USDC')
    .setTokenSymbol('USDC-TEST')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(6)
    .setInitialSupply(10_000_000_000) // 10,000 USDC = 10000 * 10^6
    .setTreasuryAccountId(operatorId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const usdcSigned = await usdcCreate.sign(operatorKey);
  const usdcResp = await usdcSigned.execute(client);
  const usdcId = (await usdcResp.getReceipt(client)).tokenId!;
  console.log(`  USDC_TEST_TOKEN_ID=${usdcId}`);

  // 5. Create SPEND-NOTE NFT collection
  console.log('Creating SPEND-NOTE NFT...');
  const noteCreate = new TokenCreateTransaction()
    .setTokenName('Folio Spend Note')
    .setTokenSymbol('SPEND-NOTE')
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(operatorId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(1000)
    .setSupplyKey(operatorKey.publicKey)
    .setAdminKey(operatorKey.publicKey)
    .freezeWith(client);

  const noteSigned = await noteCreate.sign(operatorKey);
  const noteResp = await noteSigned.execute(client);
  const noteId = (await noteResp.getReceipt(client)).tokenId!;
  console.log(`  SPEND_NOTE_TOKEN_ID=${noteId}`);

  console.log('\n--- Add these to your .env.local ---');
  console.log(`MOCK_TSLA_TOKEN_ID=${tslaId}`);
  console.log(`MOCK_AAPL_TOKEN_ID=${aaplId}`);
  console.log(`USDC_TEST_TOKEN_ID=${usdcId}`);
  console.log(`SPEND_NOTE_TOKEN_ID=${noteId}`);

  client.close();
}

main().catch(console.error);
