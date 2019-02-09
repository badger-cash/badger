const Web4Bch = require('web3bch')
const contracts = require('eth-contract-metadata')
const { warn } = require('loglevel')
const { MAINNET } = require('./network/enums')
const log = require('loglevel')
const whcTokens = require('../../whc-tokens.json')
// By default, poll every 3 minutes
const DEFAULT_INTERVAL = 180 * 1000
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    type: 'function',
  },
]
const WH = require('wormhole-sdk/lib/Wormhole').default
const Wormhole = new WH({
  restURL: `https://rest.bitcoin.com/v1/`,
})

/**
 * A controller that polls for token exchange
 * rates based on a user's current token list
 */
class DetectTokensController {
  /**
   * Creates a DetectTokensController
   *
   * @param {Object} [config] - Options to configure controller
   */
  constructor ({
    interval = DEFAULT_INTERVAL,
    preferences,
    network,
    keyringMemStore,
  } = {}) {
    this.preferences = preferences
    this.interval = interval
    this.network = network
    this.keyringMemStore = keyringMemStore
  }

  /**
   * For each token in eth-contract-metada, find check selectedAddress balance.
   *
   */
  async detectNewTokens () {
    if (!this.isActive) {
      return
    }
    if (this._network.store.getState().provider.type !== MAINNET) {
      return
    }
    // this.web4bch.setProvider(this._network._provider)
    // for (const contractAddress in contracts) {
    //   if (
    //     contracts[contractAddress].erc20 &&
    //     !this.tokenAddresses.includes(contractAddress.toLowerCase())
    //   ) {
    //     this.detectTokenBalance(contractAddress)
    //   }
    // }

    // try {
    //   const tokens = await this._getTokenBalance(this.selectedAddress)

    //   log.debug(tokens)
    //   tokens.forEach(async (token, index) => {
    //     whcTokens.forEach(async (whcToken, indx) => {
    //       if (token.propertyid === whcToken.propertyid) {
    //         const tokenData = {
    //           address: `bc7234234dc7c4333387af83a76c8927d7a0f28829c84c76636b1a983020461${index}`,
    //           symbol: whcToken.name,
    //           decimals: 0,
    //           string: token.balance.toString(), // token balance string
    //         }
    //         await this._preferences.addToken(tokenData)
    //         // } else {
    //         //   let property = await Wormhole.DataRetrieval.property(token.propertyid);
    //         //   console.log(property)
    //       }
    //     })
    //   })
    // } catch (error) {
    //   log.error(error)
    // }
  }

  /**
   * Find if selectedAddress has tokens with contract in contractAddress.
   *
   * @param {string} contractAddress Hex address of the token contract to explore.
   * @returns {boolean} If balance is detected, token is added.
   *
   */
  async detectTokenBalance (contractAddress) {
    const ethContract = this.web4bch.eth.contract(ERC20_ABI).at(contractAddress)
    ethContract.balanceOf(this.selectedAddress, (error, result) => {
      if (!error) {
        if (!result.isZero()) {
          this._preferences.addToken(
            contractAddress,
            contracts[contractAddress].symbol,
            contracts[contractAddress].decimals
          )
        }
      } else {
        warn(
          `Badger - DetectTokensController balance fetch failed for ${contractAddress}.`,
          error
        )
      }
    })
  }

  /**
   * Restart token detection polling period and call detectNewTokens
   * in case of address change or user session initialization.
   *
   */
  restartTokenDetection () {
    if (!(this.isActive && this.selectedAddress)) {
      return
    }
    this.detectNewTokens()
    this.interval = DEFAULT_INTERVAL
  }

  /**
   * @type {Number}
   */
  set interval (interval) {
    this._handle && clearInterval(this._handle)
    if (!interval) {
      return
    }
    this._handle = setInterval(() => {
      this.detectNewTokens()
    }, interval)
  }

  /**
   * In setter when selectedAddress is changed, detectNewTokens and restart polling
   * @type {Object}
   */
  set preferences (preferences) {
    if (!preferences) {
      return
    }
    this._preferences = preferences
    preferences.store.subscribe(({ tokens = [] }) => {
      this.tokenAddresses = tokens.map(obj => {
        return obj.address
      })
    })
    preferences.store.subscribe(({ selectedAddress }) => {
      if (this.selectedAddress !== selectedAddress) {
        this.selectedAddress = selectedAddress
        this.restartTokenDetection()
      }
    })
  }

  /**
   * @type {Object}
   */
  set network (network) {
    if (!network) {
      return
    }
    this._network = network
    this.web4bch = new Web4Bch(network._provider)
  }

  /**
   * In setter when isUnlocked is updated to true, detectNewTokens and restart polling
   * @type {Object}
   */
  set keyringMemStore (keyringMemStore) {
    if (!keyringMemStore) {
      return
    }
    this._keyringMemStore = keyringMemStore
    this._keyringMemStore.subscribe(({ isUnlocked }) => {
      if (this.isUnlocked !== isUnlocked) {
        this.isUnlocked = isUnlocked
        if (isUnlocked) {
          this.restartTokenDetection()
        }
      }
    })
  }

  /**
   * Internal isActive state
   * @type {Object}
   */
  get isActive () {
    return this.isOpen && this.isUnlocked
  }

  async _getTokenBalance (address) {
    let balances
    try {
      balances = await Wormhole.DataRetrieval.balancesForAddress(address)
    } catch (error) {
      console.error(error)
    }
    return balances
  }
}

module.exports = DetectTokensController
