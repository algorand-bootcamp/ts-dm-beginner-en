import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { algos, getOrCreateKmdWalletAccount } from '@algorandfoundation/algokit-utils';
import { DigitalMarketplaceClient } from '../contracts/clients/DigitalMarketplaceClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: DigitalMarketplaceClient;

describe('DigitalMarketplace', () => {
  beforeEach(fixture.beforeEach);

  let testAssetId: bigint;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algorand } = fixture;
    const { algod, kmd } = algorand.client;

    await getOrCreateKmdWalletAccount({ name: 'stableSellerAccount', fundWith: algos(10) }, algod, kmd);

    const testAccount = await algorand.account.fromKmd('stableSellerAccount');

    appClient = new DigitalMarketplaceClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    const assetCreate = await algorand.send.assetCreate({
      sender: testAccount.addr,
      total: 10n,
      decimals: 0,
    });

    testAssetId = BigInt(assetCreate.confirmation.assetIndex!);

    await appClient.create.createApplication({ assetId: testAssetId, unitaryPrice: 0 });
  });

  test('optInToAsset', async () => {
    const { algorand } = fixture;
    const { algod } = algorand.client;
    const testAccount = await algorand.account.fromKmd('stableSellerAccount');
    const { appAddress } = await appClient.appClient.getAppReference();

    await expect(algod.accountAssetInformation(appAddress, Number(testAssetId)).do()).rejects.toBeDefined();

    const mbrTxn = await algorand.transactions.payment({
      sender: testAccount.addr,
      receiver: appAddress,
      amount: algos(0.1 + 0.1),
      extraFee: algos(0.001),
    });

    const result = await appClient.optInToAsset({ mbrTxn });

    expect(result.confirmation).toBeDefined();

    await expect(algod.accountAssetInformation(appAddress, Number(testAssetId)).do()).resolves.toEqual(
      expect.objectContaining({
        'asset-holding': {
          amount: 0,
          'asset-id': Number(testAssetId),
          'is-frozen': false,
        },
      })
    );
  });

  test('deposit', async () => {
    const { algorand } = fixture;
    const testAccount = await algorand.account.fromKmd('stableSellerAccount');
    const { algod } = fixture.context;
    const { appAddress } = await appClient.appClient.getAppReference();

    const result = await algorand.send.assetTransfer({
      assetId: testAssetId,
      sender: testAccount.addr,
      receiver: appAddress,
      amount: 3n,
    });

    expect(result.confirmation).toBeDefined();

    await expect(algod.accountAssetInformation(appAddress, Number(testAssetId)).do()).resolves.toEqual(
      expect.objectContaining({
        'asset-holding': {
          amount: 3,
          'asset-id': Number(testAssetId),
          'is-frozen': false,
        },
      })
    );
  });

  test('setPrice', async () => {
    const result = await appClient.setPrice({
      unitaryPrice: algos(3.3).microAlgos,
    });

    expect(result.confirmation).toBeDefined();
  });

  test('buy', async () => {
    const { testAccount, algod } = fixture.context;
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    await algorand.send.assetOptIn({
      assetId: testAssetId,
      sender: testAccount.addr,
    });

    const buyerTxn = await algorand.transactions.payment({
      sender: testAccount.addr,
      receiver: appAddress,
      amount: algos(6.6),
      extraFee: algos(0.001),
    });

    const result = await appClient.buy(
      {
        buyerTxn,
        quantity: 2,
      },
      {
        sender: testAccount,
      }
    );

    expect(result.confirmation).toBeDefined();

    await expect(algod.accountAssetInformation(testAccount.addr, Number(testAssetId)).do()).resolves.toEqual(
      expect.objectContaining({
        'asset-holding': {
          amount: 2,
          'asset-id': Number(testAssetId),
          'is-frozen': false,
        },
      })
    );
  });

  test('withdraw', async () => {
    const { algorand } = fixture;
    const testAccount = await algorand.account.fromKmd('stableSellerAccount');
    const { algod } = fixture.context;
    const { appId } = await appClient.appClient.getAppReference();

    const { amount: beforeCallAmount } = await algorand.account.getInformation(testAccount.addr);

    const result = await appClient.delete.deleteApplication({}, { sendParams: { fee: algos(0.003) } });

    expect(result.confirmation).toBeDefined();

    const { amount: afterCallAmount } = await algorand.account.getInformation(testAccount.addr);

    // After deleting the sell contract, the account gets ALGO for what they sold, contract mbr minus txn fees.
    expect(afterCallAmount - beforeCallAmount).toEqual(algos(6.6 + 0.2 - 0.003).microAlgos);
    await expect(algod.accountAssetInformation(testAccount.addr, Number(testAssetId)).do()).resolves.toEqual(
      expect.objectContaining({
        'asset-holding': {
          amount: 8,
          'asset-id': Number(testAssetId),
          'is-frozen': false,
        },
      })
    );

    await expect(algod.getApplicationByID(Number(appId)).do()).rejects.toBeDefined();
  });
});
