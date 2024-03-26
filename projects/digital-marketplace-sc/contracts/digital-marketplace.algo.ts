import { Contract } from '@algorandfoundation/tealscript';

export class DigitalMarketplace extends Contract {
  /** The ID of the asset that we are selling */
  assetId = GlobalStateKey<AssetID>();

  /** The cost of buying one unit of the asset */
  unitaryPrice = GlobalStateKey<uint64>();

  /**
   * Create the application
   *
   * @param assetId The asset we are selling
   * @param unitaryPrice The price of one unit of the asset
   */
  createApplication(assetId: AssetID, unitaryPrice: uint64): void {
    this.assetId.value = assetId;
    this.unitaryPrice.value = unitaryPrice;
  }

  /**
   * Setting the new unitary price of the asset
   *
   * @param unitaryPrice The new unitary price
   */
  setPrice(unitaryPrice: uint64): void {
    assert(this.txn.sender === this.app.creator);

    this.unitaryPrice.value = unitaryPrice;
  }

  /**
   * Opt the contract address into the asset
   *
   * @param mbrTxn The payment transaction that pays for the Minimum Balance Requirement
   */
  optInToAsset(mbrTxn: PayTxn): void {
    assert(this.txn.sender === this.app.creator);

    verifyPayTxn(mbrTxn, {
      receiver: this.app.address,
      amount: globals.minBalance + globals.assetOptInMinBalance,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: 0,
      assetReceiver: this.app.address,
    });
  }

  /**
   * Buy the asset
   *
   * @param buyerTxn The payment transaction that pays for the asset
   * @param quantity The quantity of the asset to buy
   */
  buy(buyerTxn: PayTxn, quantity: uint64): void {
    verifyPayTxn(buyerTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: this.unitaryPrice.value * quantity,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: quantity,
      assetReceiver: this.txn.sender,
    });
  }

  /**
   * Method to delete the application.
   * It sends the remaining ALGO balance and the remaining asset to the creator
   */
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: this.app.creator,
      assetAmount: this.app.address.assetBalance(this.assetId.value),
      assetCloseTo: this.app.creator,
    });

    sendPayment({
      receiver: this.app.creator,
      amount: this.app.address.balance,
      closeRemainderTo: this.app.creator,
    });
  }
}
