import { Contract } from '@algorandfoundation/tealscript';

// eslint-disable-next-line no-unused-vars
class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  deposited = GlobalStateKey<number>();

  createApplication(assetId: number) {
    this.assetId.value = AssetID.fromUint64(assetId);
    this.deposited.value = 0;
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

  deposit(xfer: AssetTransferTxn) {
    verifyAssetTransferTxn(xfer, {
      xferAsset: this.assetId.value,
      assetReceiver: this.app.address,
      assetCloseTo: globals.zeroAddress,
      rekeyTo: globals.zeroAddress,
    });

    this.deposited.value += xfer.assetAmount;
  }
}
