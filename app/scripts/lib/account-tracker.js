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
const axios = require('axios')
// const pify = require('pify')

const bitboxUtils = require('../controllers/transactions/bitbox-utils')
const slpUtils = require('../controllers/transactions/slp-utils')

const SLPSDK = require('slp-sdk')
const SLP = new SLPSDK()

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
      },
      historicalBchTransactions: {},
      historicalSlpTransactions: {},
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

    // query historical transactions
    this._updateHistoricalTransactions(address)

    // query balance
    let balance = await this._updateAccountTokens(address)
    if (balance === null || balance === undefined) {
      balance = accounts[address].balance ? accounts[address].balance : balance
    }

    const result = { address, balance }

    accounts[address] = result

    this.store.updateState({ accounts })
  }

  async _updateAccountTokens (address) {
    let balance = 0
    try {
      let tokens = []
      try {
        const { slpTokens, bchBalanceSatoshis } = await this._getSlpTokens(
          address
        )

        if (slpTokens) {
          tokens = tokens.concat(slpTokens)
        }

        // Get SLP tokens for 245 SLP address
        const slpAddress = this._preferences.getSlpAddressForAccount(address)
        const getSlpTokens245Response = await this._getSlpTokens(
          slpAddress
        )
        const slpTokens245 = getSlpTokens245Response.slpTokens
        if (slpTokens245) {
          slpTokens245.forEach(token => {
            const existingTokenIndex = tokens.findIndex(t => t.address === token.address)
            if (existingTokenIndex >= 0) {
              const existingToken = tokens[existingTokenIndex]
              const firstBalance = new BigNumber(existingToken.string)
              const secondBalance = new BigNumber(token.string)
              const finalBalance = firstBalance.plus(secondBalance)
              tokens[existingTokenIndex].string = finalBalance.toString()
            } else {
              tokens.push(token)
            }
          })
        }

        balance = bchBalanceSatoshis + getSlpTokens245Response.bchBalanceSatoshis
      } catch (err) {
        log.error(
          'AccountTracker::_updateAccountTokens - Token update failed',
          err
        )
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
    } catch (err) {
      log.error(
        'AccountTracker::_updateAccountTokens - Token update failed',
        err
      )
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
      accountUtxoCache[address] = accountUtxoCache[address].filter(
        cachedUtxo => {
          return allCurrentUtxos.some(currentUtxo => {
            return (
              currentUtxo.txid === cachedUtxo.txid &&
              currentUtxo.vout === cachedUtxo.vout
            )
          })
        }
      )

      // Remove not yet validated slp txs from cache
      accountUtxoCache[address] = accountUtxoCache[address].filter(
        cachedUtxo => {
          return !(cachedUtxo.slp && cachedUtxo.validSlpTx !== true)
        }
      )

      // Find current utxos that aren't cached
      const uncachedUtxos = allCurrentUtxos.filter(currentUtxo => {
        return !accountUtxoCache[address].some(cachedUtxo => {
          return (
            currentUtxo.txid === cachedUtxo.txid &&
            currentUtxo.vout === cachedUtxo.vout
          )
        })
      })

      // Add txDetails to uncached utxos
      const txIds = uncachedUtxos.map(i => i.txid)

      // Split txIds into chunks of 20 (BitBox limit), run the detail queries in parallel
      let txDetails = await Promise.all(
        chunk(txIds, 20).map(txIdchunk => {
          return bitboxUtils.getTransactionDetails(txIdchunk)
        })
      )

      // concat the chunked arrays
      txDetails = [].concat(...txDetails)

      // Add tx and address property to each utxo
      for (let i = 0; i < uncachedUtxos.length; i++) {
        uncachedUtxos[i].tx = txDetails[i]
        uncachedUtxos[i].address = address
      }

      // Parse the txDetails for txid and run list against slp/validate
      // try to parse out SLP object from SEND or GENESIS txn type
      for (const txOut of uncachedUtxos) {
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
          ...new Set(
            uncachedUtxos
              .filter(txOut => {
                if (txOut.slp === undefined) {
                  return false
                }
                return true
              })
              .map(txOut => txOut.txid)
          ),
        ]

        // Validate SLP DAG
        try {
          let validSLPTx = await Promise.all(
            chunk(txidsToValidate, 20).map(async txidsToValidateChunk => {
              const validationResponse = await axios({
                method: 'POST',
                url: 'https://rest.bitcoin.com/v2/slp/validateTxid',
                headers: {
                  'content-type': 'application/json',
                },
                data: {
                  txids: txidsToValidateChunk,
                },
              })
              const validSLPTxChunk = validationResponse.data
                .filter(chunkResult => chunkResult.valid === true)
                .map(chunkResult => chunkResult.txid)
              return validSLPTxChunk
            })
          )
          validSLPTx = [].concat(...validSLPTx)

          for (const validTxid of validSLPTx) {
            for (const utxo of uncachedUtxos) {
              if (utxo.txid === validTxid) {
                utxo.validSlpTx = true
              }
            }
          }

          // Update accountUtxoCache with all uncached utxos
          accountUtxoCache[address] = accountUtxoCache[address].concat(
            uncachedUtxos
          )
        } catch (validateSLPTxException) {
          // Validation incomplete. Ignore all uncached SLP UTXOs
          const nonSLPUtxos = uncachedUtxos.filter(txOut => {
            if (txOut.slp === undefined) {
              return true
            }
            return false
          })

          // Update accountUtxoCache with uncached non SLP Utxos
          accountUtxoCache[address] = accountUtxoCache[address].concat(
            nonSLPUtxos
          )
        }
      }

      // loop through UTXO set and accumulate balances for each valid token.
      const bals = {
        satoshis_available: 0,
        satoshis_locked_in_minting_baton: 0,
        satoshis_locked_in_token: 0,
      }
      const validTokenIds = []
      const batons = []
      for (const txOut of accountUtxoCache[address]) {
        if (
          'slp' in txOut &&
          txOut.slp.baton === false &&
          txOut.validSlpTx === true
        ) {
          if (!(txOut.slp.token in bals)) {
            bals[txOut.slp.token] = new BigNumber(0)
          }
          bals[txOut.slp.token] = bals[txOut.slp.token].plus(txOut.slp.quantity)
          bals.satoshis_locked_in_token += txOut.satoshis
          validTokenIds.push(txOut.slp.token)
        } else if (
          txOut.slp &&
          txOut.slp.baton === true &&
          txOut.validSlpTx === true
        ) {
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

      const uncachedTokenIds = validTokenIds.filter(
        tokenId =>
          !tokenMetadataCache.slp.some(
            slpMetadata => slpMetadata.id === tokenId
          )
      )

      let tokenTxDetailsList = await Promise.all(
        chunk(uncachedTokenIds, 20).map(txIdchunk => {
          return bitboxUtils.getTransactionDetails(txIdchunk)
        })
      )

      // concat the chunked arrays
      tokenTxDetailsList = [].concat(...tokenTxDetailsList)

      const tokenMetadataList = tokenTxDetailsList
        .map(txDetails => {
          try {
            const decodedMetadata = slpUtils.decodeMetadata(txDetails)
            return {
              id: decodedMetadata.token,
              ticker: decodedMetadata.ticker,
              name: decodedMetadata.name,
              decimals: decodedMetadata.decimals,
            }
          } catch (err) {
            // log.error('Could not parse SLP genesis:', err)
            return null
          }
        })
        .filter(tokenMetadata => tokenMetadata)

      tokenMetadataCache.slp = tokenMetadataCache.slp.concat(tokenMetadataList)

      Object.keys(bals)
        .filter(key => key.length === 64)
        .forEach(key => {
          const tokenMetadata = tokenMetadataCache.slp.find(
            token => token.id === key
          )
          const addTokenData = {
            address: key,
            symbol: tokenMetadata.ticker
              ? tokenMetadata.ticker.slice(0, 24)
              : tokenMetadata.name
                ? tokenMetadata.name.slice(0, 24)
                : 'N/A',
            decimals: tokenMetadata.decimals,
            string: tokenMetadata.decimals
              ? bals[key].div(10 ** tokenMetadata.decimals).toString()
              : bals[key].toString(),
            protocol: 'slp',
            protocolData: {
              baton: false,
            },
          }
          if (new BigNumber(addTokenData.string).gt(0)) {
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
      // log.error('AccountTracker::_updateAccountTokens', error)
    }

    const slpTokens = rtnTokens
    return { slpTokens, bchBalanceSatoshis }
  }

  async getBchBalance (address) {
    const balance = await this._updateAccountTokens(address)
    return balance
  }

  async _updateHistoricalTransactions (address) {
    try {
      await this._updateHistoricalBchTransactions(address)
    } catch (err) {
      console.error('Could not update BCH transactions', err)
    }
    try {
      await this._updateHistoricalSlpTransactions(address)
    } catch (err) {
      console.error('Could not update SLP transactions', err)
    }
  }

  async _updateHistoricalBchTransactions (address) {
    const mutableHistoricalBchTransactions = this.store.getState()
      .historicalBchTransactions
    const historicalBchTransactions = Object.assign(
      {},
      mutableHistoricalBchTransactions
    )
    if (!historicalBchTransactions[address]) historicalBchTransactions[address] = []

    const latestConfirmedTx = historicalBchTransactions[address].sort((a, b) => b.block - a.block)[0]
    const slpAddress = this._preferences.getSlpAddressForAccount(address)
    const latestBlock = latestConfirmedTx && latestConfirmedTx.block ? latestConfirmedTx.block : 0
    const addressTransactions = await this.getHistoricalBchTransactions(address, slpAddress, latestBlock)

    addressTransactions.forEach(tx => {
      const fromAddresses = tx.in
        .filter(input => input.e && input.e.a)
        .map(input => {
          const addr = `bitcoincash:${input.e.a}`
          if (addr === slpAddress) return address
          else return addr
        })
        .reduce((accumulator, currentValue) => {
          if (!accumulator.find(element => element === currentValue)) {
            accumulator.push(currentValue)
          }
          return accumulator
        }, [])
      let fromAddress = fromAddresses.length === 1 ? fromAddresses[0] : null
      if (!fromAddress && fromAddresses.includes(address)) {
        fromAddress = address
      }

      // Determine to address
      const toAddresses = tx.out
        .filter(output => output.e && output.e.a)
        .map(output => {
          const addr = `bitcoincash:${output.e.a}`
          if (addr === slpAddress) return address
          else return addr
        })
        .reduce((accumulator, currentValue) => {
          if (!accumulator.find(element => element === currentValue)) {
            accumulator.push(currentValue)
          }
          return accumulator
        }, [])
      let toAddress = toAddresses.length === 1 ? toAddresses[0] : null
      if (
        !toAddress &&
        toAddresses.length === 2 &&
        toAddresses.find(element => element === fromAddress)
      ) {
        toAddress = toAddresses.filter(element => element !== fromAddress)[0]
      } else if (!toAddress && toAddresses.includes(address)) {
        toAddress = address
      }

      // Determine value
      let value = 0
      if (toAddress && fromAddress !== toAddress) {
        value = tx.out.reduce((accumulator, currentValue) => {
          if (
            currentValue.e &&
            currentValue.e.v &&
            `bitcoincash:${currentValue.e.a}` === toAddress ||
            `bitcoincash:${currentValue.e.a}` === slpAddress
          ) {
            accumulator += currentValue.e.v
          }
          return accumulator
        }, 0)
      }

      const historicalTx = {
        hash: tx.tx.h,
        txParams: {
          from: fromAddress,
          to: toAddress,
          fromAddresses: fromAddresses,
          toAddresses: toAddresses,
          value: new BigNumber(value).toString(),
        },
        time:
          tx.blk && tx.blk.t
            ? tx.blk.t * 1000
            : new Date().getTime(),
        block: tx.blk && tx.blk.i ? tx.blk.i : 0,
        status: 'confirmed',
        // TODO: Track pending transactions
        // status: tx.blk && tx.blk.i ? 'confirmed' : 'submitted',
        metamaskNetworkId: 'mainnet',
        loadingDefaults: false,
      }
      if (
        historicalBchTransactions[address].filter(
          htx => htx.hash === historicalTx.hash
        ).length === 0
      ) {
        historicalBchTransactions[address].push(historicalTx)
      }
    })

    mutableHistoricalBchTransactions[address] = historicalBchTransactions[address]
    this.store.updateState({ historicalBchTransactions })
  }

  async getHistoricalBchTransactions (address, slpAddress, latestBlock) {
    const query = {
      v: 3,
      q: {
        find: {
          $query: {
            $or: [
              {
                'in.e.a': address.slice(12),
              },
              {
                'out.e.a': address.slice(12),
              },
              {
                'in.e.a': slpAddress.slice(12),
              },
              {
                'out.e.a': slpAddress.slice(12),
              },
            ],
            'out.h1': {
              $ne: '534c5000',
            },
            'blk.i': {
              $not: {
                $lte: latestBlock,
              },
            },
          },
          $orderby: {
            'blk.i': -1,
          },
        },
        project: {
          _id: 0,
          'tx.h': 1,
          'in.i': 1,
          'in.e': 1,
          'out.i': 1,
          'out.e': 1,
          blk: 1,
        },
        limit: 20,
      },
    }
    const s = JSON.stringify(query)
    const b64 = Buffer.from(s).toString('base64')
    const url = `https://bitdb.bitcoin.com/q/${b64}`
    const result = await axios.get(url)
    let transactions = []
    if (result.data && result.data.c) {
      transactions = transactions.concat(result.data.c)
    }
    if (result.data && result.data.u) {
      transactions = transactions.concat(result.data.u)
    }

    return transactions
  }

  async _updateHistoricalSlpTransactions (address) {
    const mutableHistoricalSlpTransactions = this.store.getState()
      .historicalSlpTransactions
    const historicalSlpTransactions = Object.assign(
      {},
      mutableHistoricalSlpTransactions
    )
    if (!historicalSlpTransactions[address]) historicalSlpTransactions[address] = []

    const latestConfirmedTx = historicalSlpTransactions[address].sort((a, b) => b.block - a.block)[0]
    const latestBlock = latestConfirmedTx && latestConfirmedTx.block ? latestConfirmedTx.block : 0
    const slpAddress = this._preferences.getSlpAddressForAccount(address)
    const addressTransactions = await this.getHistoricalSlpTransactions(address, slpAddress, latestBlock)

    addressTransactions.forEach(tx => {
      const fromAddresses = tx.in
        .filter(input => input.e && input.e.a)
        .map(input => {
          const addr = `bitcoincash:${input.e.a}`
          if (addr === slpAddress) return address
          else return addr
        })
        .reduce((accumulator, currentValue) => {
          if (!accumulator.find(element => element === currentValue)) {
            accumulator.push(currentValue)
          }
          return accumulator
        }, [])
      let fromAddress = fromAddresses.length === 1 ? fromAddresses[0] : null
      if (!fromAddress && fromAddresses.includes(address)) {
        fromAddress = address
      }

      // Determine to address
      const toAddresses = tx.slp.detail.outputs
        .filter(output => output.address)
        .map(output => {
          const addr = SLP.Address.toCashAddress(output.address)
          if (addr === slpAddress) return address
          else return addr
        })
        .reduce((accumulator, currentValue) => {
          if (!accumulator.find(element => element === currentValue)) {
            accumulator.push(currentValue)
          }
          return accumulator
        }, [])
      let toAddress = toAddresses.length === 1 ? toAddresses[0] : null
      if (
        !toAddress &&
        toAddresses.length === 2 &&
        toAddresses.find(element => element === fromAddress)
      ) {
        toAddress = toAddresses.filter(element => element !== fromAddress)[0]
      } else if (!toAddress && toAddresses.includes(address)) {
        toAddress = address
      }

      // Determine value
      let value = new BigNumber(0)
      if (toAddress && fromAddress !== toAddress) {
        value = tx.slp.detail.outputs.reduce((accumulator, currentValue) => {
          if (
            currentValue.address &&
            currentValue.amount
          ) {
            const outputAddress = SLP.Address.toCashAddress(currentValue.address)
            if (outputAddress === toAddress || (toAddress === address && outputAddress === slpAddress)) {
              accumulator = accumulator.plus(new BigNumber(currentValue.amount))
            }
          }
          return accumulator
        }, new BigNumber(0))
      }

      const historicalTx = {
        hash: tx.tx.h,
        txParams: {
          from: fromAddress,
          to: toAddress,
          fromAddresses: fromAddresses,
          toAddresses: toAddresses,
          value: value.toString(),
          sendTokenData: {
            tokenProtocol: 'slp',
            tokenId: tx.slp.detail.tokenIdHex,
          },
        },
        time:
          tx.blk && tx.blk.t
            ? tx.blk.t * 1000
            : new Date().getTime(),
        block: tx.blk && tx.blk.i ? tx.blk.i : 0,
        status: 'confirmed',
        metamaskNetworkId: 'mainnet',
        loadingDefaults: false,
      }
      if (
        historicalSlpTransactions[address].filter(
          htx => htx.hash === historicalTx.hash
        ).length === 0
      ) {
        historicalSlpTransactions[address].push(historicalTx)
      }
    })

    mutableHistoricalSlpTransactions[address] = historicalSlpTransactions[address]
    this.store.updateState({ historicalSlpTransactions })
  }

  async getHistoricalSlpTransactions (address, slpAddress, latestBlock) {
    const query = {
      v: 3,
      q: {
        find: {
          db: ['c', 'u'],
          $query: {
            $or: [
              {
                'in.e.a': address.slice(12),
              },
              {
                'slp.detail.outputs.address': SLP.Address.toSLPAddress(address),
              },
              {
                'in.e.a': slpAddress.slice(12),
              },
              {
                'slp.detail.outputs.address': SLP.Address.toSLPAddress(slpAddress),
              },
            ],
            'slp.valid': true,
            'blk.i': {
              $not: {
                $lte: latestBlock,
              },
            },
          },
          $orderby: {
            'blk.i': -1,
          },
        },
        project: {
          '_id': 0,
          'tx.h': 1,
          'in.i': 1,
          'in.e': 1,
          'slp.detail': 1,
          'blk': 1,
        },
        limit: 500,
      },
    }
    const s = JSON.stringify(query)
    const b64 = Buffer.from(s).toString('base64')
    const url = `https://slpdb.bitcoin.com/q/${b64}`
    const result = await axios.get(url)
    let transactions = []
    if (result.data && result.data.c) {
      transactions = transactions.concat(result.data.c)
    }
    if (result.data && result.data.u) {
      transactions = transactions.concat(result.data.u)
    }

    return transactions
  }
}

module.exports = AccountTracker
