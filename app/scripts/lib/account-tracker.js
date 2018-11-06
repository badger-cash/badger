/* Account Tracker
 *
 * This module is responsible for tracking any number of accounts
 * and caching their current balances & transaction counts.
 *
 * It also tracks transaction hashes, and checks their inclusion status
 * on each new block.
 */

// const EthQuery = require('eth-query')
const ObservableStore = require('obs-store')
const log = require('loglevel')
const chunk = require('lodash.chunk')
const BigNumber = require('bignumber.js')
// const pify = require('pify')

const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()

const bitboxUtils = require('../controllers/transactions/bitbox-utils')
const slpUtils = require('../controllers/transactions/slp-utils')

const WH = require('wormhole-sdk/lib/Wormhole').default
const Wormhole = new WH({
  restURL: `https://rest.bitcoin.com/v1/`,
})
const whcTokens = require('../../whc-tokens.json')
const slpjs = require('slpjs')

class AccountTracker {
  /**
   * This module is responsible for tracking any number of accounts and caching their current balances & transaction
   * counts.
   *
   * It also tracks transaction hashes, and checks their inclusion status on each new block.
   *
   * @typedef {Object} AccountTracker
   * @param {Object} opts Initialize various properties of the class.
   * @property {Object} store The stored object containing all accounts to track, as well as the current block's gas limit.
   * @property {Object} store.accounts The accounts currently stored in this AccountTracker
   * @property {string} store.currentBlockGasLimit A hex string indicating the gas limit of the current block
   * @property {Object} _provider A provider needed to create the EthQuery instance used within this AccountTracker.
   * @property {EthQuery} _query An EthQuery instance used to access account information from the blockchain
   * when a new block is created.
   *
   */
  constructor (opts = {}) {
    const initState = {
      accounts: {},
      accountUtxoCache: {},
      currentBlockGasLimit: '',
      tokenCache: {
        slp: [],
        wormhole: [],
      },
    }
    this.store = new ObservableStore(initState)

    this._provider = opts.provider
    this._preferences = opts.preferences
    // this._query = pify(new EthQuery(this._provider))
  }

  start () {
    // fetch account balances
    this._updateAccounts()

    this.stop()
    this.timeoutId = setTimeout(this.start.bind(this), 30 * 1000)
  }

  stop () {
    clearTimeout(this.timeoutId)
  }

  /**
   * Ensures that the locally stored accounts are in sync with a set of accounts stored externally to this
   * AccountTracker.
   *
   * Once this AccountTracker's accounts are up to date with those referenced by the passed addresses, each
   * of these accounts are given an updated balance via EthQuery.
   *
   * @param {array} address The array of hex addresses for accounts with which this AccountTracker's accounts should be
   * in sync
   *
   */
  syncWithAddresses (addresses) {
    const accounts = this.store.getState().accounts
    const locals = Object.keys(accounts)

    const accountsToAdd = []
    addresses.forEach(upstream => {
      if (!locals.includes(upstream)) {
        accountsToAdd.push(upstream)
      }
    })

    const accountsToRemove = []
    locals.forEach(local => {
      if (!addresses.includes(local)) {
        accountsToRemove.push(local)
      }
    })

    this.addAccounts(accountsToAdd)
    this.removeAccount(accountsToRemove)
  }

  /**
   * Adds new addresses to track the balances of
   * given a balance as long this._currentBlockNumber is defined.
   *
   * @param {array} addresses An array of hex addresses of new accounts to track
   *
   */
  addAccounts (addresses) {
    const accounts = this.store.getState().accounts
    // add initial state for addresses
    addresses.forEach(address => {
      accounts[address] = {}
    })
    // save accounts state
    this.store.updateState({ accounts })
    // fetch balances for the accounts
    addresses.forEach(address => this._updateAccount(address))
  }

  /**
   * Removes accounts from being tracked
   *
   * @param {array} an array of hex addresses to stop tracking
   *
   */
  removeAccount (addresses) {
    const accounts = this.store.getState().accounts
    // remove each state object
    addresses.forEach(address => {
      delete accounts[address]
    })
    // save accounts state
    this.store.updateState({ accounts })
  }

  /**
   * Calls this._updateAccount for each account in this.store
   *
   * @returns {Promise} after all account balances updated
   *
   */
  async _updateAccounts () {
    const accounts = this.store.getState().accounts
    const addresses = Object.keys(accounts)
    await Promise.all(addresses.map(this._updateAccount.bind(this)))
  }

  /**
   * Updates the current balance of an account.
   *
   * @private
   * @param {string} address A hex address of a the account to be updated
   * @returns {Promise} after the account balance is updated
   *
   */
  async _updateAccount (address) {
    // update accounts state
    const { accounts } = this.store.getState()

    // only populate if the entry is still present
    if (!accounts[address]) return

    // query balance
    let balance = await this._updateAccountTokens(address)
    if (!balance) balance = accounts[address].balance ? accounts[address].balance : balance

    const result = { address, balance }

    accounts[address] = result

    this.store.updateState({ accounts })
  }

  async _updateAccountTokens (address) {
    let balance = 0
    try {
      let tokens = []
      try {
        const wormholeTokens = await this._getWormholeTokens(address)
        if (wormholeTokens) {
          tokens = tokens.concat(wormholeTokens)
        }

        const { slpTokens, bchBalanceSatoshis } = await this._getSlpTokens(address)

        if (slpTokens) {
          tokens = tokens.concat(slpTokens)
        }

        balance = bchBalanceSatoshis
      } catch (err) {
        log.error('AccountTracker::_updateAccountTokens - Token update failed', err)
      }

      // Remove current tokens
      this._preferences.removeTokensByAccount(address)

      // Sort and add tokens
      tokens = tokens.sort((a, b) => {
        if (a.address < b.address) return -1
        else if (a.address > b.address) return 1
        return 0
      })
      tokens.forEach(async token => {
        await this._preferences.addTokenByAccount(address, 'mainnet', token)
      })

    } catch (error) {
      log.error('AccountTracker::_updateAccountTokens', error)
    }

    return balance
  }

  async _getSlpTokens (address) {
    const rtnTokens = []
    let bchBalanceSatoshis = 0

    try {
      const mutableAccountUtxoCache = this.store.getState().accountUtxoCache
      const accountUtxoCache = Object.assign({}, mutableAccountUtxoCache)
      if (!accountUtxoCache[address]) accountUtxoCache[address] = []
      const allCurrentUtxos = await bitboxUtils.getAllUtxo(address)

      // Remove spent utxos from cache
      accountUtxoCache[address] = accountUtxoCache[address].filter(cachedUtxo => {
        return allCurrentUtxos.some(currentUtxo => {
          return (currentUtxo.txid === cachedUtxo.txid && currentUtxo.vout === cachedUtxo.vout)
        })
      })

      // Remove not yet validated slp txs from cache
      accountUtxoCache[address] = accountUtxoCache[address].filter(cachedUtxo => {
        return !(cachedUtxo.slp && cachedUtxo.validSlpTx !== true)
      })

      // Find current utxos that aren't cached
      const uncachedUtxos = allCurrentUtxos.filter(currentUtxo => {
        return !accountUtxoCache[address].some(cachedUtxo => {
          return (currentUtxo.txid === cachedUtxo.txid && currentUtxo.vout === cachedUtxo.vout)
        })
      })

      // Add txDetails to uncached utxos
      const txIds = uncachedUtxos.map(i => i.txid)

      // Split txIds into chunks of 20 (BitBox limit), run the detail queries in parallel
      let txDetails = await Promise.all(chunk(txIds, 20).map(txIdchunk => {
          return bitboxUtils.getTransactionDetails(txIdchunk)
      }))

      // concat the chunked arrays
      txDetails = [].concat(...txDetails)

      for (let i = 0; i < uncachedUtxos.length; i++) {
        uncachedUtxos[i].tx = txDetails[i]
      }

      // Parse the txDetails for txid and run list against tokengraph validate
      // try to parse out SLP object from SEND or GENESIS txn type
      for (let txOut of uncachedUtxos) {
        try {
          txOut.slp = slpUtils.decodeTxOut(txOut)
          
          // All utxos with slp metadata are unspendable -- valid or invalid
          txOut.spendable = false
        } catch (e) {
          // Not an SLP token
          txOut.spendable = true
        }
      }

      // get set of VALID SLP txn ids
      if (uncachedUtxos.length) {
        const txidsToValidate = [
          ...new Set(uncachedUtxos.filter(txOut => {
            if (txOut.slp === undefined) {
              return false
            }
            return true
          }).map(txOut => txOut.txid)),
        ]
        const validSLPTx = await slpjs.bitdb.verifyTransactions(txidsToValidate)
        for (const validTxid of validSLPTx) {
          for (const utxo of uncachedUtxos) {
            if (utxo.txid === validTxid) {
              utxo.validSlpTx = true
            }
          }
        }
      }

      // Update accountUtxoCache
      accountUtxoCache[address] = accountUtxoCache[address].concat(uncachedUtxos)

      // loop through UTXO set and accumulate balances for each valid token.
      const bals = {
        satoshis_available: 0,
        satoshis_locked_in_minting_baton: 0,
        satoshis_locked_in_token: 0,
      }
      const validTokenIds = []
      const batons = []
      for (const txOut of accountUtxoCache[address]) {
        if ("slp" in txOut && txOut.slp.baton === false && txOut.validSlpTx === true) {
          if (!(txOut.slp.token in bals)) {
            bals[txOut.slp.token] = new BigNumber(0)
          }
          bals[txOut.slp.token] = bals[txOut.slp.token].plus(
            txOut.slp.quantity
          )
          bals.satoshis_locked_in_token += txOut.satoshis
          validTokenIds.push(txOut.slp.token)
        } else if (txOut.slp && txOut.slp.baton === true && txOut.validSlpTx === true) {
          bals.satoshis_locked_in_minting_baton += txOut.satoshis
          validTokenIds.push(txOut.slp.token)
          batons.push(txOut.slp.token)
        } else if (txOut.spendable === true) {
          bals.satoshis_available += txOut.satoshis
        }
      }

      bchBalanceSatoshis = bals.satoshis_available

      // Get token metadata
      const tokenMetadataCache = this.store.getState().tokenCache

      const uncachedTokenIds = validTokenIds.filter(tokenId =>
        !tokenMetadataCache.slp.some(slpMetadata => slpMetadata.id === tokenId)
      )

      let tokenTxDetailsList = await Promise.all(chunk(uncachedTokenIds, 20).map(txIdchunk => {
        return bitboxUtils.getTransactionDetails(txIdchunk)
      }))

      // concat the chunked arrays
      tokenTxDetailsList = [].concat(...tokenTxDetailsList)
      
      const tokenMetadataList = tokenTxDetailsList.map(txDetails => {
        try {
          const decodedMetadata = slpUtils.decodeMetadata(txDetails)
          return {
            id: decodedMetadata.token,
            ticker: decodedMetadata.ticker,
            name: decodedMetadata.name,
            decimals: decodedMetadata.decimals,
          }
        } catch (err) {
          log.error('Could not parse SLP genesis:', err)
          return null
        }
      }).filter(tokenMetadata => tokenMetadata)

      tokenMetadataCache.slp = tokenMetadataCache.slp.concat(tokenMetadataList)

      Object.keys(bals)
        .filter(key => key.length === 64)
        .forEach(key => {
          const tokenMetadata = tokenMetadataCache.slp.find(token => token.id === key)
          const addTokenData = {
            address: key,
            symbol: tokenMetadata.ticker ? tokenMetadata.ticker.slice(0, 12) : tokenMetadata.name ? tokenMetadata.name.slice(0, 12) : 'N/A',
            decimals: tokenMetadata.decimals,
            string: tokenMetadata.decimals ? bals[key].div(10 ** tokenMetadata.decimals).toString() : bals[key].toString(),
            protocol: 'slp',
            protocolData: {
              baton: false,
            },
          }
          if ((new BigNumber(addTokenData.string)).gt(0)) {
            rtnTokens.push(addTokenData)
          }
        })

      // TODO: Display mint batons when send support added
      // batons.forEach(batonTokenId => {
      //   const tokenMetadata = tokenMetadataCache.slp.find(token => token.id === batonTokenId)
      //   const addTokenData = {
      //     address: batonTokenId,
      //     symbol: tokenMetadata.ticker ? tokenMetadata.ticker.slice(0, 12) : tokenMetadata.name ? tokenMetadata.name.slice(0, 12) : 'N/A',
      //     decimals: 0,
      //     string: 'Mint Baton',
      //     protocol: 'slp',
      //     protocolData: {
      //       baton: true,
      //     },
      //   }
      //   rtnTokens.push(addTokenData)
      // })

      // Update cache state
      mutableAccountUtxoCache[address] = accountUtxoCache[address]
      this.store.updateState({ accountUtxoCache, tokenMetadataCache })
    } catch (error) {
      log.error('AccountTracker::_updateAccountTokens', error)
    }

    const slpTokens = rtnTokens
    return { slpTokens, bchBalanceSatoshis }
  }

  async _getWormholeTokens (address) {
    const rtnTokens = []

    try {
      const tokens = await this._getTokenBalance(address)

      if (!tokens) return rtnTokens

      tokens.forEach(async (token, index) => {
        let tokenData
        whcTokens.forEach(async (whcToken, indx) => {
          if (token.propertyid === whcToken.propertyid) {
            tokenData = whcToken
          }
        })

        if (!tokenData) {
          tokenData = await Wormhole.DataRetrieval.property(token.propertyid)
        }

        const addTokenData = {
          address: `qqqqqqqqqqqqqqqqqqqqqqqqqqqqqu08dsyxz98whc${tokenData.propertyid}`,
          symbol: tokenData.name,
          decimals: tokenData.precision,
          string: token.balance.toString(), // token balance string
          protocol: 'wormhole',
          protocolData: {
            ...tokenData,
          },
        }
        rtnTokens.push(addTokenData)
      })
    } catch (error) {
      log.error('AccountTracker::_getWormholeTokens', error)
    }

    return rtnTokens
  }

  async getBchBalance (address) {
    const balance = await this._updateAccountTokens(address)
    return balance
  }

  async _getTokenBalance (address) {
    let balances
    try {
      balances = await Wormhole.DataRetrieval.balancesForAddress(address)
    } catch (error) {
      log.debug("AccountTracker::_getTokenBalance no wh tokens", error)
    }
    return balances
  }
}

module.exports = AccountTracker
