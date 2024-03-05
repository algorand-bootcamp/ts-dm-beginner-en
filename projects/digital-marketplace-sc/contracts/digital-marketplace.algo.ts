import { Contract } from '@algorandfoundation/tealscript';

// eslint-disable-next-line no-unused-vars
class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  createApplication(assetId: number) {
    this.assetId.value = AssetID.fromUint64(assetId);
  }

  prepareDeposit(mbrTxn: PayTxn) {
    assert(this.txn.sender === globals.creatorAddress);

    verifyPayTxn(mbrTxn, {
      receiver: this.app.address,
      amount: globals.minBalance + globals.assetOptInMinBalance,
      closeRemainderTo: globals.zeroAddress,
      rekeyTo: globals.zeroAddress,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: this.app.address,
      assetAmount: 0,
    });
  }
}
