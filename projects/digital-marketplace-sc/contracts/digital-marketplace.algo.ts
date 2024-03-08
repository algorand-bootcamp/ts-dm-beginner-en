import { Contract } from '@algorandfoundation/tealscript';

export class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  deposited = GlobalStateKey<number>();

  unitaryPrice = GlobalStateKey<number>();

  createApplication(assetId: number) {
    this.assetId.value = AssetID.fromUint64(assetId);
    this.deposited.value = 0;
    this.unitaryPrice.value = 0;
  }

  // eslint-disable-next-line no-unused-vars
  prepareDeposit(mbrTxn: PayTxn) {
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

  @allow.call('DeleteApplication')
  withdraw() {
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

  setPrice(unitaryPrice: number) {
    assert(this.txn.sender === globals.creatorAddress);

    this.unitaryPrice.value = unitaryPrice;
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

    this.deposited.value -= quantity;
  }
}
