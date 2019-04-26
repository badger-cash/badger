const assert = require('assert')
const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ComposedStore = require('obs-store/lib/composed')
const EthQuery = require('eth-query')
const JsonRpcEngine = require('json-rpc-engine')
const providerFromEngine = require('bch-json-rpc-middleware/providerFromEngine')
const log = require('loglevel')
const createMetamaskMiddleware = require('./createMetamaskMiddleware')
const createInfuraClient = require('./createInfuraClient')
const createJsonRpcClient = require('./createJsonRpcClient')
const {
  createSwappableProxy,
  createEventEmitterProxy,
} = require('swappable-obj-proxy')

const { ROPSTEN, RINKEBY, KOVAN, MAINNET, LOCALHOST } = require('./enums')
const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]

const env = process.env.METAMASK_ENV
const METAMASK_DEBUG = process.env.METAMASK_DEBUG
const testMode = METAMASK_DEBUG || env === 'test'

const defaultProviderConfig = {
  // type: testMode ? RINKEBY : MAINNET,
  type: testMode ? MAINNET : MAINNET,
}

module.exports = class NetworkController extends EventEmitter {
  constructor (opts = {}) {
    super()

    // parse options
    const providerConfig = opts.provider || defaultProviderConfig
    // create stores
    this.providerStore = new ObservableStore(providerConfig)
    this.networkStore = new ObservableStore('loading')
    this.store = new ComposedStore({
      provider: this.providerStore,
      network: this.networkStore,
    })
    // this.on('networkDidChange', this.lookupNetwork)
    // provider
    this._provider = null
    // provider and block tracker proxies - because the network changes
    this._providerProxy = null
  }

  initializeProvider (providerParams) {
    this._baseProviderParams = providerParams
    const { type, rpcTarget } = this.providerStore.getState()
    this._configureProvider({ type, rpcTarget })
    this.lookupNetwork()
  }

  // return the proxies so the references will always be good
  getProviderAndBlockTracker () {
    const provider = this._providerProxy
    return { provider }
  }

  verifyNetwork () {
    // Check network when restoring connectivity:
    if (this.isNetworkLoading()) this.lookupNetwork()
  }

  getNetworkState () {
    return this.networkStore.getState()
  }

  setNetworkState (network) {
    return this.networkStore.putState(network)
  }

  isNetworkLoading () {
    return this.getNetworkState() === 'loading'
  }

  lookupNetwork () {
    // Prevent firing when provider is not defined.
    if (!this._provider) {
      return log.warn(
        'NetworkController - lookupNetwork aborted due to missing provider'
      )
    }
    // const ethQuery = new EthQuery(this._provider)
    // ethQuery.sendAsync({ method: 'net_version' }, (err, network) => {
    //   if (err) return this.setNetworkState('loading')
    //   log.info('web3.getNetwork returned ' + network)
    //   this.setNetworkState(network)
    // })
    this.setNetworkState('mainnet')
  }

  setRpcTarget (rpcTarget) {
    const providerConfig = {
      type: 'rpc',
      rpcTarget,
    }
    this.providerConfig = providerConfig
  }

  async setProviderType (type) {
    assert.notEqual(
      type,
      'rpc',
      `NetworkController - cannot call "setProviderType" with type 'rpc'. use "setRpcTarget"`
    )
    assert(
      INFURA_PROVIDER_TYPES.includes(type) || type === LOCALHOST,
      `NetworkController - Unknown rpc type "${type}"`
    )
    const providerConfig = { type }
    this.providerConfig = providerConfig
  }

  resetConnection () {
    this.providerConfig = this.getProviderConfig()
  }

  set providerConfig (providerConfig) {
    this.providerStore.updateState(providerConfig)
    this._switchNetwork(providerConfig)
  }

  getProviderConfig () {
    return this.providerStore.getState()
  }

  //
  // Private
  //

  _switchNetwork (opts) {
    this.setNetworkState('loading')
    this._configureProvider(opts)
    this.emit('networkDidChange')
  }

  _configureProvider (opts) {
    const { type, rpcTarget } = opts
    // infura type-based endpoints
    const isInfura = INFURA_PROVIDER_TYPES.includes(type)
    if (isInfura) {
      this._configureInfuraProvider(opts)
      // url-based rpc endpoints
    } else if (type === 'rpc') {
      this._configureStandardProvider({ rpcUrl: rpcTarget })
    } else {
      throw new Error(
        `NetworkController - _configureProvider - unknown type "${type}"`
      )
    }
  }

  _configureInfuraProvider ({ type }) {
    // log.info('NetworkController - configureInfuraProvider', type)
    const networkClient = createInfuraClient({ network: type })
    this._setNetworkClient(networkClient)
  }

  _configureStandardProvider ({ rpcUrl }) {
    // log.info('NetworkController - configureStandardProvider', rpcUrl)
    const networkClient = createJsonRpcClient({ rpcUrl })
    this._setNetworkClient(networkClient)
  }

  _setNetworkClient ({ networkMiddleware }) {
    const metamaskMiddleware = createMetamaskMiddleware(
      this._baseProviderParams
    )
    const engine = new JsonRpcEngine()
    engine.push(metamaskMiddleware)
    engine.push(networkMiddleware)
    const provider = providerFromEngine(engine)
    this._setProviderAndBlockTracker({ provider })
  }

  _setProviderAndBlockTracker ({ provider }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider)
    } else {
      this._providerProxy = createSwappableProxy(provider)
    }
    // set new provider
    this._provider = provider
  }

  _logBlock (block) {
    // log.info(
    //   `BLOCK CHANGED: #${block.number.toString('hex')} 0x${block.hash.toString(
    //     'hex'
    //   )}`
    // )
    this.verifyNetwork()
  }
}
