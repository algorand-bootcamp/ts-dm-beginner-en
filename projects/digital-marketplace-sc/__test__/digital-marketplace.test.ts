import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { makePaymentTxnWithSuggestedParamsFromObject, makeAssetCreateTxnWithSuggestedParamsFromObject } from 'algosdk';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { algos, getOrCreateKmdWalletAccount, sendTransaction } from '@algorandfoundation/algokit-utils';
import { DigitalMarketplaceClient } from '../contracts/clients/DigitalMarketplaceClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: DigitalMarketplaceClient;

describe('DigitalMarketplace', () => {
  beforeEach(fixture.beforeEach);

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

    await appClient.create.createApplication({ assetId: assetCreate.confirmation!.assetIndex! });
  });

  test('prepareDeposit', async () => {
    const { algod, kmd } = fixture.context;
    const testAccount = await getOrCreateKmdWalletAccount({ name: 'stableSellerAccount' }, algod, kmd);
    const { appAddress } = await appClient.appClient.getAppReference();

    const result = await appClient.prepareDeposit(
      {
        mbrTxn: makePaymentTxnWithSuggestedParamsFromObject({
          from: testAccount.addr,
          to: appAddress,
          amount: algos(0.1 + 0.1).microAlgos,
          suggestedParams: await algod.getTransactionParams().do(),
        }),
      },
      { sendParams: { fee: algos(0.002) } }
    );

    expect(result.confirmation).toBeDefined();
  });
});
