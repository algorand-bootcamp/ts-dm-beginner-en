// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet'
import React, { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import MethodCall from './components/MethodCall'
import * as methods from './methods'
import { Config as AlgokitConfig } from '@algorandfoundation/algokit-utils'
import AlgorandClient from '@algorandfoundation/algokit-utils/types/algorand-client'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { DigitalMarketplaceClient } from './contracts/DigitalMarketplaceClient'
import algosdk from 'algosdk'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  AlgokitConfig.configure({ populateAppCallResources: true })

  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [appId, setAppId] = useState<number>(0)
  const [assetId, setAssetId] = useState<bigint>(0n)
  const [unitaryPrice, setUnitaryPrice] = useState<bigint>(0n)
  const [quantity, setQuantity] = useState<bigint>(0n)
  const [unitsLeft, setUnitsLeft] = useState<bigint>(0n)
  const { activeAddress, signer } = useWallet()

  useEffect(() => {
    dmClient
      .getGlobalState()
      .then((globalState) => {
        setUnitaryPrice(globalState.unitaryPrice?.asBigInt() || 0n)
        const id = globalState.assetId?.asBigInt() || 0n
        setAssetId(id)
        algorand.account.getAssetInformation(algosdk.getApplicationAddress(appId), id).then((info) => {
          setUnitsLeft(info.balance)
        })
      })
      .catch(() => {
        setUnitaryPrice(0n)
        setAssetId(0n)
        setUnitsLeft(0n)
      })
  }, [appId])

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })
  algorand.withDefaultSigner(signer)

  const dmClient = new DigitalMarketplaceClient(
    {
      resolveBy: 'id',
      id: appId,
      sender: { addr: activeAddress!, signer },
    },
    algorand.client.algod,
  )

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  return (
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">
            Welcome to <div className="font-bold">AlgoKit 🙂</div>
          </h1>
          <p className="py-6">
            This starter has been generated using official AlgoKit React template. Refer to the resource below for next steps.
          </p>

          <div className="grid">
            <button data-test-id="connect-wallet" className="btn m-2" onClick={toggleWalletModal}>
              Wallet Connection
            </button>

            <input
              type="number"
              className="input input-bordered m-2"
              value={appId}
              onChange={(e) => setAppId(e.currentTarget.valueAsNumber || 0)}
            />

            <div className="divider" />

            {activeAddress && appId === 0 && (
              <div>
                <label className="label">Unitary Price</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={(unitaryPrice / BigInt(10e6)).toString()}
                  onChange={(e) => setUnitaryPrice(BigInt(e.currentTarget.value || '0') * BigInt(10e6))}
                />
                <MethodCall
                  methodFunction={methods.create(algorand, dmClient, activeAddress, unitaryPrice, setAppId)}
                  text="Create Marketplace"
                />
              </div>
            )}

            {activeAddress && appId !== 0 && (
              <div>
                <label className="label">Asset ID</label>
                <input type="text" className="input input-bordered" value={assetId.toString()} readOnly />
                <label className="label">Price Per Unit</label>
                <input type="text" className="input input-bordered" value={(unitaryPrice / BigInt(10e6)).toString()} readOnly />
                <label className="label">Units Left</label>
                <input type="text" className="input input-bordered" value={unitsLeft.toString()} readOnly />
                <label className="label">Desired Quantity</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={quantity.toString()}
                  onChange={(e) => setQuantity(BigInt(e.currentTarget.value || 0))}
                />
                <MethodCall
                  methodFunction={methods.buy(
                    algorand,
                    dmClient,
                    activeAddress,
                    algosdk.getApplicationAddress(appId),
                    signer,
                    quantity,
                    unitaryPrice,
                    setUnitsLeft,
                  )}
                  text={`Buy ${quantity} unit for ${(unitaryPrice * BigInt(quantity)) / BigInt(10e6)} ALGO`}
                />
              </div>
            )}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
