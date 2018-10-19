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
// const pify = require('pify')

const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()

const WH = require('wormhole-sdk/lib/Wormhole').default
const Wormhole = new WH({
  restURL: `https://rest.bitcoin.com/v1/`,
})
const whcTokens = require('../../whc-tokens.json')

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
      currentBlockGasLimit: '',
    }
    this.store = new ObservableStore(initState)

    this._provider = opts.provider
    this._preferences = opts.preferences
    // this._query = pify(new EthQuery(this._provider))
  }

  start () {
    // fetch account balances
    this._updateAccounts()
  }

  stop () {}

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
    // query balance
    const balance = await this.getBchBalance(address)
    const result = { address, balance }
    // update accounts state
    const { accounts } = this.store.getState()
    // only populate if the entry is still present
    if (!accounts[address]) return
    accounts[address] = result

    await this._updateAccountTokens(address)

    this.store.updateState({ accounts })
  }

  async _updateAccountTokens (address) {
    try {
      // Remove current tokens
      this._preferences.removeTokensByAccount(address)
      
      const tokens = await this._getTokenBalance(address)

      if (!tokens) return

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
        }

        await this._preferences.addTokenByAccount(address, 'mainnet', addTokenData)
      })
    } catch (error) {
      log.error('AccountTracker::_updateAccountTokens', error)
    }
  }

  async getBchBalance (address) {
    return new Promise((resolve, reject) => {
      BITBOX.Address.utxo(address).then(
        resultArray => {
          const result = resultArray && resultArray.length > 0 ? resultArray[0] : []
          const balance =
            result && result.length > 0
              ? result.reduce((prev, cur) => prev + cur.satoshis, 0)
              : 0
          resolve(balance)
        },
        err => {
          log.error('AccountTracker::getBchBalance', err)
          reject(err)
        }
      )
    })
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

module.exports = AccountTracker
