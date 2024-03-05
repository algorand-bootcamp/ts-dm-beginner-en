import { Contract } from '@algorandfoundation/tealscript';

// eslint-disable-next-line no-unused-vars
class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  createApplication(assetId: number) {
    this.assetId.value = AssetID.fromUint64(assetId);
  }

  // eslint-disable-next-line no-unused-vars
  prepareDeposit(mbrTxn: PayTxn, assetId: AssetID) {
    assert(this.txn.sender === globals.creatorAddress);
    assert(!this.app.address.isOptedInToAsset(this.assetId.value));

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
