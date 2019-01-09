module.exports = getBuyBchUrl

/**
 * Gives the caller a url at which the user can acquire eth, depending on the network they are in
 *
 * @param {object} opts Options required to determine the correct url
 * @param {string} opts.network The network for which to return a url
 * @param {string} opts.amount The amount of ETH to buy on coinbase. Only relevant if network === '1'.
 * @param {string} opts.address The address the bought ETH should be sent to.  Only relevant if network === '1'.
 * @returns {string|undefined} The url at which the user can access ETH, while in the given network. If the passed
 * network does not match any of the specified cases, or if no network is given, returns undefined.
 *
 */
function getBuyBchUrl ({ network, amount, address }) {
  let url
  switch (network) {
    case '1':
    // TODO: Fix url to send directly to bch buy page  
    // url = `https://buy.coinbase.com/?code=9ec56d01-7e81-5017-930c-513daa27bb6a&amount=${amount}&address=${address}&crypto_currency=BCH`
      url = `https://buy.bitcoin.com/`
      break

    case '3':
      url = 'http://free.bitcoin.com/'
      break

    case '4':
      url = 'http://free.bitcoin.com/'
      break

    case '42':
      url = 'http://free.bitcoin.com/'
      break
  }
  return url
}
