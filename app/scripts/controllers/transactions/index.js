const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ethUtil = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx')
const EthQuery = require('ethjs-query')
const TransactionStateManager = require('./tx-state-manager')
const PendingTransactionTracker = require('./pending-tx-tracker')
const txUtils = require('./lib/util')
const cleanErrorStack = require('../../lib/cleanErrorStack')
const axios = require('axios')
const toBuffer = require('blob-to-buffer')
const log = require('loglevel')
const {
  TRANSACTION_TYPE_CANCEL,
  TRANSACTION_TYPE_RETRY,
  TRANSACTION_TYPE_STANDARD,
  TRANSACTION_STATUS_APPROVED,
} = require('./enums')

const bitboxUtils = require('./bitbox-utils')
const slpUtils = require('./slp-utils')
const PaymentProtocol = require('bitcore-payment-protocol')

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


  @class
  @param {object} - opts
  @param {object}  opts.initState - initial transaction list default is an empty array
  @param {Object}  opts.networkStore - an observable store for network number
  @param {Object}  opts.provider - A network provider.
  @param {Object}  opts.accountTracker - UTXO data for account
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
    this.accountTracker = opts.accountTracker
    this.accountTrackerStore =
      this.accountTracker.store || new ObservableStore({})
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
      publishTransaction: rawTx => this.query.sendRawTransaction(rawTx),
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(
        this.txStateManager
      ),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(
        this.txStateManager
      ),
    })

    this.txStateManager.store.subscribe(() => this.emit('update:badge'))
    this._setupListeners()
    // memstore is computed from a few different stores
    this._updateMemstore()
    this.txStateManager.store.subscribe(() => this._updateMemstore())
    this.networkStore.subscribe(() => this._updateMemstore())
    this.preferencesStore.subscribe(() => this._updateMemstore())
    this.accountTrackerStore.subscribe(() => {
      this._updateHistoricalTransactions()
      this._updateMemstore()
    })
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

  // TODO: Payment requests
  async decodePaymentRequest (requestData) {
    return new Promise((resolve, reject) => {
      toBuffer(requestData, function (err, buffer) {
        if (err) reject(err)
       
        try {
          var body = PaymentProtocol.PaymentRequest.decode(buffer)
          var request = new PaymentProtocol().makePaymentRequest(body)

          const detailsData = {}
          var serializedDetails = request.get('serialized_payment_details')

          // Verify the request signature
          const verifiedData = request.verify(true)
          detailsData.verified = false
          if (verifiedData.caTrusted && verifiedData.chainVerified && verifiedData.isChain &&
            verifiedData.selfSigned === 0 && verifiedData.verified) {
            detailsData.verified = true
          } else {
            reject(new Error('Request could not be verified'))
          }

          // Get the payment details
          var decodedDetails = PaymentProtocol.PaymentDetails.decode(serializedDetails)
          var details = new PaymentProtocol().makePaymentDetails(decodedDetails)
          
          // Verify network is mainnet
          detailsData.network = details.get('network')
          if (detailsData.network !== 'main') {
            reject(new Error('Network must be mainnet'))
          }
          
          // Sanity check time created is in the past
          const currentUnixTime = Math.floor(Date.now() / 1000)
          detailsData.time = details.get('time')
          if (currentUnixTime < detailsData.time) {
            reject(new Error('Payment request time not valid'))
          }

          // Verify request is not yet expired
          detailsData.expires = details.get('expires')
          if (detailsData.expires < currentUnixTime) {
            reject(new Error('Payment request expired'))
          }

          // Get memo, paymentUrl, merchantData and requiredFeeRate
          detailsData.memo = details.get('memo')
          detailsData.paymentUrl = details.get('payment_url')
          const merchantData = details.get('merchant_data')
          detailsData.merchantData = merchantData.toString()
          detailsData.requiredFeeRate = details.get('required_fee_rate')

          // Parse outputs as number amount and hex string script
          detailsData.outputs = details.get('outputs').map(output => {
            return {
              amount: output.amount.toNumber(),
              script: output.script.toString('hex'),
            }
          })

          // Calculate total output value
          let totalValue = 0
          for (const output of detailsData.outputs) {
            totalValue += output.amount
          }
          detailsData.totalValue = totalValue
          resolve(detailsData)
        } catch (ex) {
          reject(ex)
        }
      })
    })
  }

  /**
  add a new unapproved transaction to the pipeline

  @returns {Promise<string>} the hash of the transaction after being submitted to the network
  @param txParams {object} - txParams for the transaction
  @param opts {object} - with the key origin to put the origin on the txMeta
  */

  async newUnapprovedTransaction (txParams, opts = {}) {
    // Check for payment url
    // TODO: Payment requests
    if (txParams.paymentRequestUrl) {
      var headers = {
        'Accept': 'application/bitcoincash-paymentrequest',
        'Content-Type': 'application/octet-stream',
      }
      
      // Assume BCH, but fail over to SLP
      var paymentResponse
      var txType
      try {
        paymentResponse = await axios.get(txParams.paymentRequestUrl, {
          headers,
          responseType: 'blob',
        })
        txType = 'BCH'
      } catch(err) {
        headers.Accept = 'application/simpleledger-paymentrequest'
        paymentResponse = await axios.get(txParams.paymentRequestUrl, {
          headers,
          responseType: 'blob',
        })
        txType = 'SLP'
      }

      txParams.paymentData = await this.decodePaymentRequest(paymentResponse.data)
      txParams.value = txParams.paymentData.totalValue
      txParams.paymentData.type = txType
      // Handle SLP payment requests
      if (txType == 'SLP') {
        txParams.value = 0
        var opReturnScript = txParams.paymentData.outputs[0].script
        var decodedScriptArray = []
        for(let i = 1; i < txParams.paymentData.outputs.length; i++) {
          let decodedScript = slpUtils.decodeScriptPubKey(opReturnScript, i)
          decodedScriptArray.push(decodedScript)
        }
        var tokenInfo = await slpUtils.getTokenInfo(decodedScriptArray[0].token)
        txParams.sendTokenData = {
          tokenId: decodedScriptArray[0].token,
          tokenProtocol: 'slp',
          tokenSymbol: tokenInfo.symbol
        }
        var decimals = tokenInfo.decimals
        txParams.value = decodedScriptArray.reduce(function sum(total, decoded) {
          return total + decoded.quantity.dividedBy(10 ** decimals).toNumber()
        }, 0)

        txParams.valueArray = decodedScriptArray.map(decoded => decoded.quantity)
      }
      
    }

    const initialTxMeta = await this.addUnapprovedTransaction(txParams)
    initialTxMeta.origin = opts.origin
    this.txStateManager.updateTx(
      initialTxMeta,
      '#newUnapprovedTransaction - adding the origin'
    )
    // listen for tx completion (success, fail)
    return new Promise((resolve, reject) => {
      this.txStateManager.once(
        `${initialTxMeta.id}:finished`,
        finishedTxMeta => {
          switch (finishedTxMeta.status) {
            // TODO: Remove confirmed after txQueue is live, only submit to queue
            case 'confirmed':
              return resolve(finishedTxMeta.hash)
            case 'submitted':
              return resolve(finishedTxMeta.hash)
            case 'rejected':
              return reject(
                cleanErrorStack(
                  new Error(
                    'Badger Tx Signature: User denied transaction signature.'
                  )
                )
              )
            case 'failed':
              return reject(
                cleanErrorStack(new Error(finishedTxMeta.err.message))
              )
            default:
              return reject(
                cleanErrorStack(
                  new Error(
                    `Badger Tx Signature: Unknown problem: ${JSON.stringify(
                      finishedTxMeta.txParams
                    )}`
                  )
                )
              )
          }
        }
      )
    })
  }

  /**
  Validates and generates a txMeta with defaults and puts it in txStateManager
  store

  @returns {txMeta}
  */

  async addUnapprovedTransaction (txParams) {
    // Default from address to selected account
    if (!txParams.from) {
      txParams.from = this.getSelectedAddress()
    }
    
    // validate & normalize
    const normalizedTxParams = txUtils.normalizeTxParams(txParams)

    // TODO: Validate payment requests separately
    // if (!txParams.paymentDetails) {
      txUtils.validateTxParams(normalizedTxParams)
    // }

    // construct txMeta
    const txMeta = this.txStateManager.generateTxMeta({
      txParams: normalizedTxParams,
      type: TRANSACTION_TYPE_STANDARD,
    })
    this.addTx(txMeta)

    this.emit('newUnapprovedTx', txMeta)

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

      // Update balances
      setTimeout(() => this.accountTracker._updateAccount(fromAddress), 3000)
      setTimeout(
        () => this.accountTracker._updateAccount(txMeta.txParams.to),
        6000
      )

      // TODO: split signAndPublish method
      // const rawTx = await this.signTransaction(txId)
      // await this.publishTransaction(txId, rawTx)
      // must set transaction to submitted/failed before releasing lock
    } catch (err) {
      // this is try-catch wrapped so that we can guarantee that the nonceLock is released
      try {
        this.txStateManager.setTxStatusFailed(txId, err)
      } catch (err) {
        // log.error(err)
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

    const slpAddress = this.getSlpAddressForAccount(txParams.from)
    const slpKeyPair = await this.exportKeyPair(slpAddress)

    const accountUtxoCache = Object.assign({}, this.getAccountUtxoCache())
    const utxoCache = accountUtxoCache[txParams.from]
    const slpUtxoCache = accountUtxoCache[slpAddress]
    let spendableUtxos = []

    if (utxoCache && utxoCache.length) {
      // Filter spendable utxos and map keypair to utxo
      spendableUtxos = utxoCache.filter(utxo =>
        utxo.spendable === true
      ).map(utxo => {
        utxo.keyPair = keyPair
        return utxo
      })
    }

    if (slpUtxoCache && slpUtxoCache.length) {
      // Filter spendable SLP utxos and map keypair to utxo
      const spendableSlpUtxos = slpUtxoCache.filter(utxo =>
        utxo.spendable === true &&
        utxo.slp === undefined
      ).map(utxo => {
        utxo.keyPair = slpKeyPair
        return utxo
      })

      spendableUtxos = spendableUtxos.concat(spendableSlpUtxos)
    }

    let txHash
    if (txParams.sendTokenData) {
      const tokenProtocol = txParams.sendTokenData.tokenProtocol
      const tokenId = txParams.sendTokenData.tokenId
      const tokenMetadataCache = Object.assign({}, this.getTokenMetadataCache())

      const tokenMetadata = tokenMetadataCache[tokenProtocol].find(
        token => token.id === tokenId
      )

      if (tokenProtocol === 'slp') {
        // Filter SLP tokens and map keypair to each utxo
        const allTokenUtxos = utxoCache.concat(slpUtxoCache)
        const spendableTokenUtxos = allTokenUtxos.filter(utxo => {
          return (
            utxo.slp &&
            utxo.slp.baton === false &&
            utxo.validSlpTx === true &&
            utxo.slp.token === tokenId
          )
        }).map(utxo => {
          utxo.keyPair = utxo.address === txParams.from ? keyPair : slpKeyPair
          return utxo
        })

        txHash = await bitboxUtils.signAndPublishSlpTransaction(
          txParams,
          spendableUtxos,
          tokenMetadata,
          spendableTokenUtxos,
          slpAddress
        )
      }
    } else if (txParams.paymentData) {
      txHash = await bitboxUtils.signAndPublishPaymentRequestTransaction(
        txParams,
        keyPair,
        spendableUtxos
      )
    } else {
      txHash = await bitboxUtils.signAndPublishBchTransaction(
        txParams,
        spendableUtxos
      )
    }

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
    this.getSelectedAddress = () =>
      this.preferencesStore.getState().selectedAddress
    this.getSlpAddressForAccount = (address) => {
      const selectedIdentity = this.preferencesStore.getState().identities[address]
      return selectedIdentity.slpAddress
    }
    /** @returns the utxo cache for accounts */
    this.getAccountUtxoCache = () =>
      this.accountTrackerStore.getState().accountUtxoCache
    /** @returns the token metadata cache */
    this.getTokenMetadataCache = () =>
      this.accountTrackerStore.getState().tokenCache
    /** @returns historicalTransactions */
    this.gethistoricalTransactions = () => {
      const historsicalTransactions = Object.assign(
        {},
        this.accountTrackerStore.getState().historicalBchTransactions || {}
      )
      const historicalSlpTransactions = this.accountTrackerStore.getState().historicalSlpTransactions || {}

      Object.keys(historicalSlpTransactions).forEach(address => {
        if (!historsicalTransactions[address]) {
          historsicalTransactions[address] = []
        }
        historsicalTransactions[address] = historsicalTransactions[address].concat(historicalSlpTransactions[address])
      })

      return historsicalTransactions
    }
    /** Returns an array of transactions whos status is unapproved */
    this.getUnapprovedTxCount = () =>
      Object.keys(this.txStateManager.getUnapprovedTxList()).length
    /**
      @returns a number that represents how many transactions have the status submitted
      @param account {String} - hex prefixed account
    */
    this.getPendingTxCount = account =>
      this.txStateManager.getPendingTransactions(account).length
    /** see txStateManager */
    this.getFilteredTxList = opts => this.txStateManager.getFilteredTxList(opts)
  }

  /**
    If transaction controller was rebooted with transactions that are uncompleted
    in steps of the transaction signing or user confirmation process it will either
    transition txMetas to a failed state or try to redo those tasks.
  */

  _onBootCleanUp () {
    this.txStateManager
      .getFilteredTxList({
        status: 'unapproved',
        loadingDefaults: true,
      })
      .forEach(tx => {
        this.addTxGasDefaults(tx)
          .then(txMeta => {
            txMeta.loadingDefaults = false
            this.txStateManager.updateTx(
              txMeta,
              'transactions: gas estimation for tx on boot'
            )
          })
          .catch(error => {
            this.txStateManager.setTxStatusFailed(tx.id, error)
          })
      })

    this.txStateManager
      .getFilteredTxList({
        status: TRANSACTION_STATUS_APPROVED,
      })
      .forEach(txMeta => {
        const txSignError = new Error(
          'Transaction found as "approved" during boot - possibly stuck during signing'
        )
        this.txStateManager.setTxStatusFailed(txMeta.id, txSignError)
      })
  }

  /**
    is called in constructor applies the listeners for pendingTxTracker txStateManager
  */
  _setupListeners () {
    this.txStateManager.on(
      'tx:status-update',
      this.emit.bind(this, 'tx:status-update')
    )
    this.pendingTxTracker.on('tx:warning', txMeta => {
      this.txStateManager.updateTx(
        txMeta,
        'transactions/pending-tx-tracker#event: tx:warning'
      )
    })
    this.pendingTxTracker.on(
      'tx:failed',
      this.txStateManager.setTxStatusFailed.bind(this.txStateManager)
    )
    this.pendingTxTracker.on('tx:confirmed', txId =>
      this.confirmTransaction(txId)
    )
    this.pendingTxTracker.on('tx:retry', txMeta => {
      if (!('retryCount' in txMeta)) txMeta.retryCount = 0
      txMeta.retryCount++
      this.txStateManager.updateTx(
        txMeta,
        'transactions/pending-tx-tracker#event: tx:retry'
      )
    })
  }

  /**
    Updates tx history with historicalTransactions from account-tracker
  */
  _updateHistoricalTransactions () {
    const historicalTransactions = Object.assign(
      {},
      this.gethistoricalTransactions()
    )
    if (!historicalTransactions) return

    const txHistory = this.txStateManager.getFilteredTxList({
      metamaskNetworkId: this.getNetwork(),
    })

    Object.keys(historicalTransactions).forEach(address => {
      for (const tx of historicalTransactions[address]) {
        if (
          txHistory.some(
            txh =>
              txh.hash === tx.hash &&
              txh.txParams.from === tx.txParams.from &&
              txh.txParams.to === tx.txParams.to
          )
        ) {
          continue
        }
        const txMeta = Object.assign(
          this.txStateManager.generateTxMeta(tx),
          {
            type: TRANSACTION_TYPE_STANDARD,
          },
          tx
        )
        this.txStateManager.addTx(txMeta)
      }
    })
  }

  /**
    Updates the memStore in transaction controller
  */
  _updateMemstore () {
    const unapprovedTxs = this.txStateManager.getUnapprovedTxList()
    const selectedAddressTxList = this.txStateManager
      .getFilteredTxList({
        metamaskNetworkId: this.getNetwork(),
      })
      .filter(
        tx =>
          tx.txParams.from === this.getSelectedAddress() ||
          tx.txParams.to === this.getSelectedAddress()
      )
      .reduce((txSet, tx) => {
        const txExists = txSet.find((item) => item.hash === tx.hash)
        return txExists ? txSet : [...txSet, tx]
      }, [])
    this.memStore.updateState({ unapprovedTxs, selectedAddressTxList })
  }
}

module.exports = TransactionController
