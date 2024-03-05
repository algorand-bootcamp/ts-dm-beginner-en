import { Contract } from '@algorandfoundation/tealscript';

// eslint-disable-next-line no-unused-vars
class DigitalMarketplace extends Contract {
  assetId = GlobalStateKey<AssetID>();

  createApplication(assetId: number) {
    this.assetId.value = AssetID.fromUint64(assetId);
  }
}
