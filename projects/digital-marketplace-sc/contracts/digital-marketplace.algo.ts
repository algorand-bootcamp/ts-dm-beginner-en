import { Contract } from '@algorandfoundation/tealscript';

export class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  unitaryPrice = GlobalStateKey<number>();

  createApplication(assetId: AssetID, unitaryPrice: uint64) {
    this.assetId.value = assetId;
    this.unitaryPrice.value = unitaryPrice;
  }

  setPrice(unitaryPrice: number) {
    assert(this.txn.sender === globals.creatorAddress);

    this.unitaryPrice.value = unitaryPrice;
  }

  optInToAsset(mbrTxn: PayTxn) {
    assert(this.txn.sender === globals.creatorAddress);
    assert(!this.app.address.isOptedInToAsset(this.assetId.value));

    verifyPayTxn(mbrTxn, {
      receiver: this.app.address,
      amount: globals.minBalance + globals.assetOptInMinBalance,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: this.app.address,
      assetAmount: 0,
    });
  }

  buy(buyerTxn: PayTxn, quantity: number) {
    assert(this.unitaryPrice.value !== 0);

    verifyPayTxn(buyerTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: this.unitaryPrice.value * quantity,
      closeRemainderTo: globals.zeroAddress,
      rekeyTo: globals.zeroAddress,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: this.txn.sender,
      assetAmount: quantity,
    });
  }

  deleteApplication() {
    assert(this.txn.sender === globals.creatorAddress);

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: globals.creatorAddress,
      assetAmount: 0,
      assetCloseTo: globals.creatorAddress,
    });

    sendPayment({
      receiver: globals.creatorAddress,
      amount: 0,
      closeRemainderTo: globals.creatorAddress,
    });
  }
}
