import { ConnectButton, useAddRecentTransaction } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"
import { BigNumber, ethers } from "ethers"
import { useEffect, useState } from "react"
import useSound from "use-sound"
import { useAccount, useWaitForTransaction } from "wagmi"
import "./App.css"
import { Footer } from "./components/Footer"
import { LandingCopy } from "./components/LandingCopy"
import { LinksTab } from "./components/LinksTab"
import NoticeModal from "./components/NoticeModal"
import deployments from "./deployments.json"
import {
  usePlanetsIsOpen,
  usePlanetsMint,
  usePlanetsPrice,
  usePlanetsTotalMinted,
  usePlanetsTotalSupply,
  usePreparePlanetsMint,
} from "./generated"
import blockSpinner from "./img/blockSpinner.svg"
import generalClickEffect from "./sounds/generalClick.mp3"
import mintEffect from "./sounds/mint.mp3"
import smallClickEffect from "./sounds/smallClick.mp3"
import submitEffect from "./sounds/submit.mp3"
import { getEtherscanBaseURL } from "./utils/getEtherscanBaseURL"
import { getOpenSeaLink } from "./utils/getOpenSeaLink"

const etherscanBaseURL = getEtherscanBaseURL(deployments.chainId)
const htmlFileURL = process.env.PUBLIC_URL + "/homeScreen.html"

function App() {
  const { data: mintPrice, isLoading: priceLoading } = usePlanetsPrice({ watch: true })
  const { data: isOpen, isLoading: isIsOpenLoading } = usePlanetsIsOpen({ watch: true })
  const { data: amountMinted, isLoading: amountMintedLoading } = usePlanetsTotalMinted({ watch: true })
  const { data: totalSupply, isLoading: totalSupplyLoading } = usePlanetsTotalSupply()

  const addRecentTransaction = useAddRecentTransaction()
  const account = useAccount()

  const [mintCount, setMintAmount] = useState<number>(1)
  const [totalPrice, setTotalPrice] = useState<BigNumber>()
  const [mintBtnDisabled, setMintBtnDisabled] = useState<boolean>(true)
  const [mintBtnLoading, setMintBtnLoading] = useState<boolean>(false)
  const [isCustomVisible, setIsCustomVisible] = useState<boolean>(false)
  const [mintedTokens, setMintedTokens] = useState<number[]>([])
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const [playbackRate, setPlaybackRate] = useState(0.5)
  const [smallClickSound] = useSound(smallClickEffect, { playbackRate: playbackRate })
  const [generalClickSound] = useSound(generalClickEffect)
  const [mintSound] = useSound(mintEffect)
  const [submitSound] = useSound(submitEffect)

  const { config: mintConfig, error: mintError } = usePreparePlanetsMint({
    args: [BigNumber.from(`${mintCount}`)],
    overrides: {
      value: mintPrice?.mul(mintCount!),
    },
    enabled: isOpen !== undefined && isOpen,
  })

  const {
    write: mint,
    data: mintSignResult,
    isLoading: isMintSignLoading,
    isSuccess: isMintSignSuccess,
  } = usePlanetsMint(mintConfig)

  const { data: mintTx, isLoading: isMintTxLoading } = useWaitForTransaction({
    hash: mintSignResult?.hash,
    confirmations: 1,
  })

  const handleAmountClick = (value: number) => {
    let tempPlaybackRate = playbackRate

    if (value > mintCount) {
      for (let i = mintCount; i < value; i++) {
        if (tempPlaybackRate < 10) {
          tempPlaybackRate = tempPlaybackRate + 0.4
        }
      }
      setPlaybackRate(tempPlaybackRate)
      smallClickSound()
    }
    let tempMintCount = value
    if (value < mintCount) {
      for (let i = value; i < mintCount; i++) {
        tempMintCount = tempMintCount - 1
        if (tempMintCount < 24) {
          if (tempPlaybackRate - 0.4 > 0.5) {
            tempPlaybackRate = tempPlaybackRate - 0.4
          }
        }
      }
      setPlaybackRate(tempPlaybackRate)
      smallClickSound()
    }
  }

  const handleMintAmountChange = (amount: number) => {
    setMintAmount(amount)
    setTotalPrice(mintPrice?.mul(amount))
  }

  const toggelCustomAmount = () => {
    if (isCustomVisible) {
      setIsCustomVisible(false)
    } else {
      setIsCustomVisible(true)
    }
  }

  useEffect(() => {
    const loading = priceLoading || isIsOpenLoading || amountMintedLoading || isMintTxLoading
    setMintBtnLoading(loading)
  }, [priceLoading, isIsOpenLoading, amountMintedLoading, isMintTxLoading])

  useEffect(() => {
    if (mintSignResult) {
      addRecentTransaction({
        hash: mintSignResult.hash,
        description: `Mint ${mintCount} Ether Planet${mintCount === 1 ? "" : "s"}`,
      })
      submitSound()
    }
  }, [mintSignResult])

  useEffect(() => {
    if (mintTx?.status === 1) {
      mintSound()
      const transferEventAbi = ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]
      const transferEventInterface = new ethers.utils.Interface(transferEventAbi)

      const tokenIds = mintTx.logs
        .map((log) => {
          try {
            const event = transferEventInterface.parseLog(log)
            if (event && event.name === "Transfer") {
              return event.args.tokenId.toString()
            }
          } catch (e) {
            return null
          }
        })
        .filter((id) => id !== null)
      setMintedTokens(tokenIds)
    }
  }, [mintTx])

  const displayMintedTokens = (tokens: number[]) => {
    return (
      <>
        <span key={tokens[0]}>
          <a
            href={getOpenSeaLink(deployments.contracts.Planets.address, tokens[0])}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white hover:underline no-underline transition-colors"
          >
            {tokens[0]}
          </a>
          &nbsp;
        </span>
        {tokens.length > 1 && (
          <>
            {" "}
            ... &nbsp;
            <span key={tokens[tokens.length - 1]}>
              <a
                href={getOpenSeaLink(deployments.chainId, tokens[tokens.length - 1])}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline no-underline transition-colors"
              >
                {tokens[tokens.length - 1]}
              </a>
              &nbsp;
            </span>
          </>
        )}
      </>
    )
  }

  return (
    <div className="App">
      <NoticeModal
        isOpen={isModalOpen}
        onRequestClose={() => {
          setIsModalOpen(false)
        }}
        // onMint={handleMint}
        onMint={() => {
          generalClickSound()
          console.log("test mint")
          setIsModalOpen(false)
          mint?.()
        }}
      />
      <LinksTab />
      <LandingCopy htmlFileURL={htmlFileURL} />
      <div className="absolute w-full  top-0 flex justify-end z-20 p-3 sm:p-5">
        <ConnectButton />
      </div>
      {/* <LinksTab /> */}
      <div className="absolute sm:top-[66%] top-[66%] w-full  flex justify-center">
        <div>
          {amountMinted && totalSupply && (
            <div className="text-center text-[12px] pb-5 text-white">
              {amountMinted.toBigInt().toLocaleString()}/{totalSupply.toBigInt().toLocaleString()}
            </div>
          )}

          <div className="flex justify-center">
            <button
              className="text-gray-500 text-[36px] mt-[-5px] hover:text-white pl-3"
              onClick={() => {
                handleMintAmountChange(Math.max(1, mintCount - 1))
                setIsCustomVisible(false)
                handleAmountClick(mintCount - 1)
              }}
              disabled={mintBtnDisabled || !account.isConnected || isMintSignLoading}
            >
              -
            </button>
            <button
              onClick={() => {
                generalClickSound()
                setIsModalOpen(true)
                setIsCustomVisible(false)
              }}
              className="transition-colors duration-300 bg-none hover:bg-white border-[1px] border-white text-white hover:text-black px-4 py-2 rounded text-[14px] mx-2"
              disabled={mintBtnDisabled || isMintSignLoading || isMintTxLoading}
            >
              {mintBtnLoading ? (
                <div className="w-full flex justify-center h-full">
                  <img className="h-full p-[12px]" src={blockSpinner}></img>
                </div>
              ) : (
                <>
                  {isMintSignLoading
                    ? "WAITING FOR WALLET"
                    : !account.isConnected
                    ? "CONNECT WALLET"
                    : totalPrice !== undefined
                    ? `MINT ${mintCount} FOR ${ethers.utils.formatEther(totalPrice)} ETH`
                    : "PRICE UNAVAILABLE"}
                </>
                // <>Mint {mintCount} for 23 ETH </>
              )}
            </button>
            <button
              disabled={mintBtnDisabled || !account.isConnected || isMintSignLoading}
              className="text-gray-500 text-3xl pr-3 hover:text-white"
              onClick={() => {
                handleMintAmountChange(mintCount + 1)
                setIsCustomVisible(false)
                // handleAmountClickUp()
                handleAmountClick(mintCount + 1)
              }}
            >
              +
            </button>
          </div>
          {account.isConnected && (
            <>
              <div className="w-full justify-center flex mt-1 transition-all">
                <button
                  disabled={isMintSignLoading || isMintTxLoading}
                  className=" text-[12px] text-gray-500 hover:text-white transition-all text-right"
                  onClick={() => {
                    toggelCustomAmount()
                    generalClickSound()
                  }}
                >
                  {isCustomVisible ? <>Hide</> : <>Custom amount</>}
                </button>
              </div>
              <div className="w-full justify-center flex mt-1 transition-all">
                <input
                  className={`text-white block rounded text-[12px] appearance-none bg-black border border-gray-500 hover:border-blue-950 focus:border-blue-900 px-3 py-1 leading-tight focus:outline-none w-[70px] mb-2 transition-all ${
                    isCustomVisible && !isMintSignLoading && !isMintTxLoading ? "visible" : "hidden"
                  }`}
                  type="number"
                  min="1"
                  max="4000"
                  placeholder={mintCount.toString()}
                  onChange={(e) => {
                    let value = parseInt(e.target.value)
                    if (e.target.value === "" || value === 0) {
                      handleMintAmountChange(1)
                    } else {
                      handleMintAmountChange(value)
                      handleAmountClick(value)
                    }
                  }}
                ></input>
              </div>
            </>
          )}
        </div>
        {mintTx && mintTx.status && (
          <div>
            <div className="w-full flex justify-center">
              <a
                href={`${etherscanBaseURL}/tx/${mintTx.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-gray-500 hover:text-white hover:underline no-underline transition-colors pt-5"
              >
                View transaction
              </a>
            </div>
            <p className="text-base text-gray-500 transition-colors w-full text-center pt-1">
              Minted tokens: [ {displayMintedTokens(mintedTokens)}]
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default App
