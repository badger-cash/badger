const injectCss = require('inject-css')
const NewMetaMaskUiCss = require('../../ui/css')
const startPopup = require('./popup-core')
const PortStream = require('extension-port-stream')
const { getEnvironmentType } = require('./lib/util')
const { ENVIRONMENT_TYPE_NOTIFICATION } = require('./lib/enums')
const extension = require('extensionizer')
const ExtensionPlatform = require('./platforms/extension')
const NotificationManager = require('./lib/notification-manager')
const notificationManager = new NotificationManager()
const setupRaven = require('./lib/setupRaven')
const log = require('loglevel')

start().catch(log.error)

async function start () {
  // create platform global
  global.platform = new ExtensionPlatform()

  // setup sentry error reporting
  const release = global.platform.getVersion()
  setupRaven({ release })

  // inject css
  // const css = MetaMaskUiCss()
  // injectCss(css)

  // identify window type (popup, notification)
  const windowType = getEnvironmentType(window.location.href)
  global.METAMASK_UI_TYPE = windowType
  closePopupIfOpen(windowType)

  // setup stream to background
  const extensionPort = extension.runtime.connect({ name: windowType })
  const connectionStream = new PortStream(extensionPort)

  // start ui
  const container = document.getElementById('app-content')
  startPopup({ container, connectionStream }, (err, store) => {
    if (err) return displayCriticalError(err)

    const { featureFlags = {} } = store.getState().metamask
    let betaUIState = featureFlags.betaUI


    let css = NewMetaMaskUiCss()
    let deleteInjectedCss = injectCss(css)
    let newBetaUIState

    store.subscribe(() => {
      const state = store.getState()
      newBetaUIState = state.metamask.featureFlags.betaUI
      if (newBetaUIState !== betaUIState) {
        deleteInjectedCss()
        betaUIState = newBetaUIState
        css = NewMetaMaskUiCss()
        deleteInjectedCss = injectCss(css)
      }
    })
  })

  function closePopupIfOpen (windowType) {
    if (windowType !== ENVIRONMENT_TYPE_NOTIFICATION) {
      // should close only chrome popup
      notificationManager.closePopup()
    }
  }

  function displayCriticalError (err) {
    container.innerHTML =
      '<div class="critical-error">The Badger app failed to load: please open and close Badger again to restart.</div>'
    container.style.height = '80px'
    // log.error(err.stack)
    throw err
  }
}
