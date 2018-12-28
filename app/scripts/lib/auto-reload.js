module.exports = setupDappAutoReload

function setupDappAutoReload (web4bch, observable) {
  // export web4bch as a global, checking for usage
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork

  global.web4bch = new Proxy(web4bch, {
    get: (_web4bch, key) => {
      // get the time of use
      lastTimeUsed = Date.now()
      // return value normally
      return _web4bch[key]
    },
    set: (_web4bch, key, value) => {
      // set value normally
      _web4bch[key] = value
    },
  })

  observable.subscribe(function (state) {
    // if reload in progress, no need to check reload logic
    if (reloadInProgress) return

    const currentNetwork = state.networkVersion

    // set the initial network
    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork
      return
    }

    // skip reload logic if web4bch not used
    if (!lastTimeUsed) return

    // if network did not change, exit
    if (currentNetwork === lastSeenNetwork) return

    // initiate page reload
    reloadInProgress = true
    const timeSinceUse = Date.now() - lastTimeUsed
    // if web4bch was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      triggerReset()
    } else {
      setTimeout(triggerReset, 500)
    }
  })
}

// reload the page
function triggerReset () {
  global.location.reload()
}
