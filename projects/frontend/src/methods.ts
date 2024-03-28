import * as algokit from '@algorandfoundation/algokit-utils'
import { type TransactionSigner } from 'algosdk'
import { DigitalMarketplaceClient } from './contracts/DigitalMarketplaceClient'

/**
 * Create the application and opt it into the desired asset
 */
export const create =
  (
    algorand: algokit.AlgorandClient,
    dmClient: DigitalMarketplaceClient,
    sender: string,
    unitaryPrice: bigint,
    setAppId: (id: number) => void,
  ) =>
  async () => {
    // In production, the user would supply this asset
    const assetCreate = await algorand.send.assetCreate({
      sender,
      total: 100n,
    })

    const assetId = BigInt(assetCreate.confirmation.assetIndex!)

    const createResult = await dmClient.create.createApplication({ assetId, unitaryPrice })

    const mbrTxn = await algorand.transactions.payment({
      sender,
      receiver: createResult.appAddress,
      amount: algokit.algos(0.1 + 0.1),
      extraFee: algokit.algos(0.001),
    })

    await dmClient.optInToAsset({ mbrTxn })

    await algorand.send.assetTransfer({
      assetId,
      sender,
      receiver: createResult.appAddress,
      amount: 100n,
    })

    setAppId(Number(createResult.appId))
  }

export const buy =
  (
    algorand: algokit.AlgorandClient,
    dmClient: DigitalMarketplaceClient,
    sender: string,
    appAddress: string,
    signer: TransactionSigner,
    quantity: bigint,
    unitaryPrice: bigint,
    setUnitsLeft: React.Dispatch<React.SetStateAction<bigint>>,
  ) =>
  async () => {
    const buyerTxn = await algorand.transactions.payment({
      sender,
      receiver: appAddress,
      amount: algokit.microAlgos(Number(quantity * unitaryPrice)),
      extraFee: algokit.algos(0.001),
    })

    await dmClient.buy(
      {
        buyerTxn,
        quantity,
      },
      {
        sender: { addr: sender, signer },
      },
    )

    const state = await dmClient.getGlobalState()
    const info = await algorand.account.getAssetInformation(appAddress, state.assetId!.asBigInt())
    setUnitsLeft(info.balance)
  }
