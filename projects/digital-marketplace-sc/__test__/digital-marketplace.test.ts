import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import {
  makePaymentTxnWithSuggestedParamsFromObject,
  makeAssetCreateTxnWithSuggestedParamsFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
} from 'algosdk';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { algos, getOrCreateKmdWalletAccount, sendTransaction } from '@algorandfoundation/algokit-utils';
import { DigitalMarketplaceClient } from '../contracts/clients/DigitalMarketplaceClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: DigitalMarketplaceClient;

describe('DigitalMarketplace', () => {
  beforeEach(fixture.beforeEach);

  let testAssetId: number | bigint;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, kmd } = fixture.context;
    const testAccount = await getOrCreateKmdWalletAccount(
      { name: 'stableSellerAccount', fundWith: algos(10) },
      algod,
      kmd
    );

    appClient = new DigitalMarketplaceClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    const assetCreate = await sendTransaction(
      {
        transaction: makeAssetCreateTxnWithSuggestedParamsFromObject({
          from: testAccount.addr,
          total: 10,
          decimals: 0,
          defaultFrozen: false,
          suggestedParams: await algod.getTransactionParams().do(),
        }),
        from: testAccount,
      },
      algod
    );
    testAssetId = assetCreate.confirmation!.assetIndex!;

    await appClient.create.createApplication({ assetId: testAssetId });
  });

  test('prepareDeposit', async () => {
    const { algod, kmd } = fixture.context;
    const testAccount = await getOrCreateKmdWalletAccount({ name: 'stableSellerAccount' }, algod, kmd);
    const { appAddress } = await appClient.appClient.getAppReference();

    await expect(algod.accountAssetInformation(appAddress, Number(testAssetId)).do()).rejects.toBeDefined();

    const result = await appClient.prepareDeposit(
      {
        mbrTxn: makePaymentTxnWithSuggestedParamsFromObject({
          from: testAccount.addr,
          to: appAddress,
          amount: algos(0.1 + 0.1).microAlgos,
          suggestedParams: await algod.getTransactionParams().do(),
        }),
        assetId: testAssetId,
      },
      { sendParams: { fee: algos(0.002) } }
    );

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
    const { algod, kmd } = fixture.context;
    const testAccount = await getOrCreateKmdWalletAccount({ name: 'stableSellerAccount' }, algod, kmd);
    const { appAddress } = await appClient.appClient.getAppReference();

    const result = await appClient.deposit({
      xfer: makeAssetTransferTxnWithSuggestedParamsFromObject({
        assetIndex: Number(testAssetId),
        from: testAccount.addr,
        to: appAddress,
        amount: 3,
        suggestedParams: await algod.getTransactionParams().do(),
      }),
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
    const { appAddress } = await appClient.appClient.getAppReference();

    await sendTransaction(
      {
        transaction: makeAssetTransferTxnWithSuggestedParamsFromObject({
          assetIndex: Number(testAssetId),
          from: testAccount.addr,
          to: testAccount.addr,
          amount: 0,
          suggestedParams: await algod.getTransactionParams().do(),
        }),
        from: testAccount,
      },
      algod
    );

    const result = await appClient.buy(
      {
        buyerTxn: makePaymentTxnWithSuggestedParamsFromObject({
          from: testAccount.addr,
          to: appAddress,
          amount: algos(6.6).microAlgos,
          suggestedParams: await algod.getTransactionParams().do(),
        }),
        quantity: 2,
      },
      {
        sender: testAccount,
        sendParams: {
          fee: algos(0.002),
        },
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
});
