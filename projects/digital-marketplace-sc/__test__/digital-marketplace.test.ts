import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { makeAssetCreateTxnWithSuggestedParamsFromObject } from 'algosdk';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { sendTransaction } from '@algorandfoundation/algokit-utils';
import { DigitalMarketplaceClient } from '../contracts/clients/DigitalMarketplaceClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: DigitalMarketplaceClient;

describe('DigitalMarketplace', () => {
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount } = fixture.context;

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

  // test('sum', async () => {
  // });
});
