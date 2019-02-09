/*global Web4Bch*/
cleanContextForImports()
require('web3bch') // TODO: use minified: require('web4bch/dist/web4bch.min.js')
const log = require('loglevel')
const LocalMessageDuplexStream = require('post-message-stream')
const setupDappAutoReload = require('./lib/auto-reload.js')
const MetamaskInpageProvider = require('metamask-inpage-provider')
restoreContextAfterImports()

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

//
// setup plugin communication
//

// setup background connection
var metamaskStream = new LocalMessageDuplexStream({
  name: 'badgerwallet_inpage',
  target: 'badgerwallet_contentscript',
})

// compose the inpage provider
var inpageProvider = new MetamaskInpageProvider(metamaskStream)

// Augment the provider with its enable method
inpageProvider.enable = function (options = {}) {
  return new Promise((resolve, reject) => {
    if (options.mockRejection) {
      reject('User rejected account access')
    } else {
      inpageProvider.sendAsync(
        { method: 'eth_accounts', params: [] },
        (error, response) => {
          if (error) {
            reject(error)
          } else {
            resolve(response.result)
          }
        }
      )
    }
  })
}

// window.badgerWallet = inpageProvider

//
// setup web3
//

if (typeof window.web4bch !== 'undefined') {
  throw new Error(`Badger detected another web4bch.
     Badger will not work reliably with another web4bch extension.
     This usually happens if you have two MetaMasks installed,
     or Badger and another web4bch extension. Please remove one
     and try again.`)
}
var web4bch = new Web4Bch(inpageProvider)
web4bch.setProvider = function () {
  // log.debug('Badger - overrode web4bch.setProvider')
}
// log.debug('Badger - injected web4bch')

setupDappAutoReload(web4bch, inpageProvider.publicConfigStore)

// export global web3, with usage-detection and deprecation warning

/* TODO: Uncomment this area once auto-reload.js has been deprecated:
let hasBeenWarned = false
global.web3 = new Proxy(web3, {
  get: (_web3, key) => {
    // show warning once on web3 access
    if (!hasBeenWarned && key !== 'currentProvider') {
      console.warn('MetaMask: web3 will be deprecated in the near future in favor of the ethereumProvider \nhttps://github.com/MetaMask/faq/blob/master/detecting_metamask.md#web3-deprecation')
      hasBeenWarned = true
    }
    // return value normally
    return _web3[key]
  },
  set: (_web3, key, value) => {
    // set value normally
    _web3[key] = value
  },
})
*/

// set web4bch defaultAccount
inpageProvider.publicConfigStore.subscribe(function (state) {
  web4bch.eth.defaultAccount = state.selectedAddress
})

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports () {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('Badger - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports () {
  try {
    global.define = __define
  } catch (_) {
    console.warn('Badger - global.define could not be overwritten.')
  }
}
