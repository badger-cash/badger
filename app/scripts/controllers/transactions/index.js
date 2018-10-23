const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ethUtil = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx')
const EthQuery = require('ethjs-query')
const TransactionStateManager = require('./tx-state-manager')
const PendingTransactionTracker = require('./pending-tx-tracker')
const txUtils = require('./lib/util')
const cleanErrorStack = require('../../lib/cleanErrorStack')
const log = require('loglevel')
const recipientBlacklistChecker = require('./lib/recipient-blacklist-checker')
const {
  TRANSACTION_TYPE_CANCEL,
  TRANSACTION_TYPE_RETRY,
  TRANSACTION_TYPE_STANDARD,
  TRANSACTION_STATUS_APPROVED,
} = require('./enums')

const { hexToBn, bnToHex } = require('../../lib/util')

const bitboxUtils = require('./bitbox-utils')

/**
  Transaction Controller is an aggregate of sub-controllers and trackers
  composing them in a way to be exposed to the metamask controller
    <br>- txStateManager
      responsible for the state of a transaction and
      storing the transaction
    <br>- pendingTxTracker
      watching blocks for transactions to be include
      and emitting confirmed events
    <br>- txGasUtil
      gas calculations and safety buffering
    <br>- nonceTracker
      calculating nonces


  @class
  @param {object} - opts
  @param {object}  opts.initState - initial transaction list default is an empty array
  @param {Object}  opts.networkStore - an observable store for network number
  @param {Object}  opts.provider - A network provider.
  @param {Object}  opts.accountTrackerStore - UTXO data for account
  @param {Function}  opts.signTransaction - function the signs an ethereumjs-tx
  @param {Function}  [opts.getGasPrice] - optional gas price calculator
  @param {Function}  opts.signTransaction - ethTx signer that returns a rawTx
  @param {Number}  [opts.txHistoryLimit] - number *optional* for limiting how many transactions are in state
  @param {Object}  opts.preferencesStore
*/

class TransactionController extends EventEmitter {
  constructor (opts) {
    super()
    this.networkStore = opts.networkStore || new ObservableStore({})
    this.preferencesStore = opts.preferencesStore || new ObservableStore({})
    this.accountTrackerStore = opts.accountTrackerStore || new ObservableStore({})
    this.provider = opts.provider
    this.signEthTx = opts.signTransaction
    this.exportKeyPair = opts.exportKeyPair
    this.getGasPrice = opts.getGasPrice

    this.memStore = new ObservableStore({})
    this.query = new EthQuery(this.provider)

    this._mapMethods()
    this.txStateManager = new TransactionStateManager({
      initState: opts.initState,
      txHistoryLimit: opts.txHistoryLimit,
      getNetwork: this.getNetwork.bind(this),
    })
    this._onBootCleanUp()

    this.store = this.txStateManager.store

    this.pendingTxTracker = new PendingTransactionTracker({
      provider: this.provider,
      publishTransaction: (rawTx) => this.query.sendRawTransaction(rawTx),
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(this.txStateManager),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(this.txStateManager),
    })

    this.txStateManager.store.subscribe(() => this.emit('update:badge'))
    this._setupListeners()
    // memstore is computed from a few different stores
    this._updateMemstore()
    this.txStateManager.store.subscribe(() => this._updateMemstore())
    this.networkStore.subscribe(() => this._updateMemstore())
    this.preferencesStore.subscribe(() => this._updateMemstore())
    this.accountTrackerStore.subscribe(() => this._updateMemstore())
  }

  /** @returns {number} the chainId*/
  getChainId () {
    const networkState = this.networkStore.getState()
    const getChainId = parseInt(networkState)
    if (Number.isNaN(getChainId)) {
      return 0
    } else {
      return getChainId
    }
  }

/**
  Adds a tx to the txlist
  @emits ${txMeta.id}:unapproved
*/
  addTx (txMeta) {
    this.txStateManager.addTx(txMeta)
    this.emit(`${txMeta.id}:unapproved`, txMeta)
  }

  /**
  Wipes the transactions for a given account
  @param {string} address - hex string of the from address for txs being removed
  */
  wipeTransactions (address) {
    this.txStateManager.wipeTransactions(address)
  }

  /**
  add a new unapproved transaction to the pipeline

  @returns {Promise<string>} the hash of the transaction after being submitted to the network
  @param txParams {object} - txParams for the transaction
  @param opts {object} - with the key origin to put the origin on the txMeta
  */

  async newUnapprovedTransaction (txParams, opts = {}) {
    log.debug(`MetaMaskController newUnapprovedTransaction ${JSON.stringify(txParams)}`)
    const initialTxMeta = await this.addUnapprovedTransaction(txParams)
    initialTxMeta.origin = opts.origin
    this.txStateManager.updateTx(initialTxMeta, '#newUnapprovedTransaction - adding the origin')
    // listen for tx completion (success, fail)
    return new Promise((resolve, reject) => {
      this.txStateManager.once(`${initialTxMeta.id}:finished`, (finishedTxMeta) => {
        switch (finishedTxMeta.status) {
          // TODO: Remove confirmed after txQueue is live, only submit to queue
          case 'confirmed':
            return resolve(finishedTxMeta.hash)
          case 'submitted':
            return resolve(finishedTxMeta.hash)
          case 'rejected':
            return reject(cleanErrorStack(new Error('Badger Tx Signature: User denied transaction signature.')))
          case 'failed':
            return reject(cleanErrorStack(new Error(finishedTxMeta.err.message)))
          default:
            return reject(cleanErrorStack(new Error(`Badger Tx Signature: Unknown problem: ${JSON.stringify(finishedTxMeta.txParams)}`)))
        }
      })
    })
  }

  /**
  Validates and generates a txMeta with defaults and puts it in txStateManager
  store

  @returns {txMeta}
  */

  async addUnapprovedTransaction (txParams) {
    // validate
    // skip normalize
    // const normalizedTxParams = txUtils.normalizeTxParams(txParams)
    const normalizedTxParams = txParams
    // txUtils.validateTxParams(normalizedTxParams)
    // construct txMeta
    let txMeta = this.txStateManager.generateTxMeta({
      txParams: normalizedTxParams,
      type: TRANSACTION_TYPE_STANDARD,
    })
    this.addTx(txMeta)
    this.emit('newUnapprovedTx', txMeta)

    try {
      // check whether recipient account is blacklisted
      recipientBlacklistChecker.checkAccount(txMeta.metamaskNetworkId, normalizedTxParams.to)
      // add default tx params
      // skip gas
      // txMeta = await this.addTxGasDefaults(txMeta)
    } catch (error) {
      log.warn(error)
      this.txStateManager.setTxStatusFailed(txMeta.id, error)
      throw error
    }
    txMeta.loadingDefaults = false
    // save txMeta
    this.txStateManager.updateTx(txMeta)

    return txMeta
  }
/**
  adds the tx gas defaults: gas && gasPrice
  @param txMeta {Object} - the txMeta object
  @returns {Promise<object>} resolves with txMeta
*/
  async addTxGasDefaults (txMeta) {
    const txParams = txMeta.txParams

    // ensure value
    txParams.value = txParams.value ? txParams.value : '0'

    // TODO: calculate fee
    // txMeta.gasPriceSpecified = Boolean(txParams.gasPrice)
    // let gasPrice = txParams.gasPrice
    // if (!gasPrice) {
    //   gasPrice = this.getGasPrice ? this.getGasPrice() : await this.query.gasPrice()
    // }

    // TODO: verify fee not too high
    txParams.gasPrice = 1

    return txMeta
  }

  /**
    Creates a new txMeta with the same txParams as the original
    to allow the user to resign the transaction with a higher gas values
    @param  originalTxId {number} - the id of the txMeta that
    you want to attempt to retry
    @return {txMeta}
  */

  async retryTransaction (originalTxId) {
    const originalTxMeta = this.txStateManager.getTx(originalTxId)
    const lastGasPrice = originalTxMeta.txParams.gasPrice
    const txMeta = this.txStateManager.generateTxMeta({
      txParams: originalTxMeta.txParams,
      lastGasPrice,
      loadingDefaults: false,
      type: TRANSACTION_TYPE_RETRY,
    })
    this.addTx(txMeta)
    this.emit('newUnapprovedTx', txMeta)
    return txMeta
  }

  /**
  updates the txMeta in the txStateManager
  @param txMeta {Object} - the updated txMeta
  */
  async updateTransaction (txMeta) {
    this.txStateManager.updateTx(txMeta, 'confTx: user updated transaction')
  }

  /**
  updates and approves the transaction
  @param txMeta {Object}
  */
  async updateAndApproveTransaction (txMeta) {
    this.txStateManager.updateTx(txMeta, 'confTx: user approved transaction')
    await this.approveTransaction(txMeta.id)
  }

  /**
  sets the tx status to approved
  auto fills the nonce
  signs the transaction
  publishes the transaction
  if any of these steps fails the tx status will be set to failed
    @param txId {number} - the tx's Id
  */
  async approveTransaction (txId) {
    try {
      // approve
      this.txStateManager.setTxStatusApproved(txId)
      // get next nonce
      const txMeta = this.txStateManager.getTx(txId)
      const fromAddress = txMeta.txParams.from

      // add nonce debugging information to txMeta
      this.txStateManager.updateTx(txMeta, 'transactions#approveTransaction')
      // sign transaction
      await this.signAndPublishTransaction(txId)

      this.confirmTransaction(txId)

      // TODO: split signAndPublish method
      // const rawTx = await this.signTransaction(txId)
      // await this.publishTransaction(txId, rawTx)
      // must set transaction to submitted/failed before releasing lock
    } catch (err) {
      // this is try-catch wrapped so that we can guarantee that the nonceLock is released
      try {
        this.txStateManager.setTxStatusFailed(txId, err)
      } catch (err) {
        log.error(err)
      }
      // continue with error chain
      throw err
    }
  }

  async signAndPublishTransaction (txId) {
    const txMeta = this.txStateManager.getTx(txId)
    // add network/chain id
    const chainId = this.getChainId()
    const txParams = Object.assign({}, txMeta.txParams, { chainId })
    // set state to signed
    this.txStateManager.setTxStatusSigned(txMeta.id)

    this.txStateManager.updateTx(txMeta, 'transactions#publishTransaction')
    const keyPair = await this.exportKeyPair(txParams.from)

    const utxoCache = this.getAccountUtxoCache[txParams.from]
    let spendableUtxos = []
    if (utxoCache && utxoCache.length) {
      spendableUtxos = utxoCache.filter(utxo => utxo.spendable === true)
    }

    const txHash = await bitboxUtils.signAndPublishTransaction(txParams, keyPair, spendableUtxos)
    this.setTxHash(txId, txHash)
    this.txStateManager.setTxStatusSubmitted(txId)
  }

  /**
    adds the chain id and signs the transaction and set the status to signed
    @param txId {number} - the tx's Id
    @returns - rawTx {string}
  */
  async signTransaction (txId) {
    const txMeta = this.txStateManager.getTx(txId)
    // add network/chain id
    const chainId = this.getChainId()
    const txParams = Object.assign({}, txMeta.txParams, { chainId })
    // sign tx
    const fromAddress = txParams.from
    const ethTx = new Transaction(txParams)
    await this.signEthTx(ethTx, fromAddress)
    // set state to signed
    this.txStateManager.setTxStatusSigned(txMeta.id)
    const rawTx = ethUtil.bufferToHex(ethTx.serialize())
    return rawTx
  }

  /**
    publishes the raw tx and sets the txMeta to submitted
    @param txId {number} - the tx's Id
    @param rawTx {string} - the hex string of the serialized signed transaction
    @returns {Promise<void>}
  */
  async publishTransaction (txId, rawTx) {
    const txMeta = this.txStateManager.getTx(txId)
    txMeta.rawTx = rawTx
    this.txStateManager.updateTx(txMeta, 'transactions#publishTransaction')
    const txHash = await this.query.sendRawTransaction(rawTx)
    this.setTxHash(txId, txHash)
    this.txStateManager.setTxStatusSubmitted(txId)
  }

  confirmTransaction (txId) {
    this.txStateManager.setTxStatusConfirmed(txId)
  }

  /**
    Convenience method for the ui thats sets the transaction to rejected
    @param txId {number} - the tx's Id
    @returns {Promise<void>}
  */
  async cancelTransaction (txId) {
    this.txStateManager.setTxStatusRejected(txId)
  }

  /**
    Sets the txHas on the txMeta
    @param txId {number} - the tx's Id
    @param txHash {string} - the hash for the txMeta
  */
  setTxHash (txId, txHash) {
    // Add the tx hash to the persisted meta-tx object
    const txMeta = this.txStateManager.getTx(txId)
    txMeta.hash = txHash
    this.txStateManager.updateTx(txMeta, 'transactions#setTxHash')
  }

//
//           PRIVATE METHODS
//
  /** maps methods for convenience*/
  _mapMethods () {
    /** @returns the state in transaction controller */
    this.getState = () => this.memStore.getState()
    /** @returns the network number stored in networkStore */
    this.getNetwork = () => this.networkStore.getState()
    /** @returns the user selected address */
    this.getSelectedAddress = () => this.preferencesStore.getState().selectedAddress
    /** @returns the utxo cache for accounts */
    this.getAccountUtxoCache = () => this.accountTrackerStore.getState().accountUtxoCache
    /** Returns an array of transactions whos status is unapproved */
    this.getUnapprovedTxCount = () => Object.keys(this.txStateManager.getUnapprovedTxList()).length
    /**
      @returns a number that represents how many transactions have the status submitted
      @param account {String} - hex prefixed account
    */
    this.getPendingTxCount = (account) => this.txStateManager.getPendingTransactions(account).length
    /** see txStateManager */
    this.getFilteredTxList = (opts) => this.txStateManager.getFilteredTxList(opts)
  }

  /**
    If transaction controller was rebooted with transactions that are uncompleted
    in steps of the transaction signing or user confirmation process it will either
    transition txMetas to a failed state or try to redo those tasks.
  */

  _onBootCleanUp () {
    this.txStateManager.getFilteredTxList({
      status: 'unapproved',
      loadingDefaults: true,
    }).forEach((tx) => {
      this.addTxGasDefaults(tx)
      .then((txMeta) => {
        txMeta.loadingDefaults = false
        this.txStateManager.updateTx(txMeta, 'transactions: gas estimation for tx on boot')
      }).catch((error) => {
        this.txStateManager.setTxStatusFailed(tx.id, error)
      })
    })

    this.txStateManager.getFilteredTxList({
      status: TRANSACTION_STATUS_APPROVED,
    }).forEach((txMeta) => {
      const txSignError = new Error('Transaction found as "approved" during boot - possibly stuck during signing')
      this.txStateManager.setTxStatusFailed(txMeta.id, txSignError)
    })
  }

  /**
    is called in constructor applies the listeners for pendingTxTracker txStateManager
  */
  _setupListeners () {
    this.txStateManager.on('tx:status-update', this.emit.bind(this, 'tx:status-update'))
    this.pendingTxTracker.on('tx:warning', (txMeta) => {
      this.txStateManager.updateTx(txMeta, 'transactions/pending-tx-tracker#event: tx:warning')
    })
    this.pendingTxTracker.on('tx:failed', this.txStateManager.setTxStatusFailed.bind(this.txStateManager))
    this.pendingTxTracker.on('tx:confirmed', (txId) => this.confirmTransaction(txId))
    this.pendingTxTracker.on('tx:retry', (txMeta) => {
      if (!('retryCount' in txMeta)) txMeta.retryCount = 0
      txMeta.retryCount++
      this.txStateManager.updateTx(txMeta, 'transactions/pending-tx-tracker#event: tx:retry')
    })
  }

  /**
    Updates the memStore in transaction controller
  */
  _updateMemstore () {
    const unapprovedTxs = this.txStateManager.getUnapprovedTxList()
    const selectedAddressTxList = this.txStateManager.getFilteredTxList({
      from: this.getSelectedAddress(),
      metamaskNetworkId: this.getNetwork(),
    })
    this.memStore.updateState({ unapprovedTxs, selectedAddressTxList })
  }
}

module.exports = TransactionController
