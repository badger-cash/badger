const {
  REQUIRED_ERROR,
  INVALID_RECIPIENT_ADDRESS_ERROR,
} = require('../../send.constants')
// const { isValidAddress } = require('../../../../util')
const bchaddr = require('bchaddrjs-slp')

function getToErrorObject (to, toError = null, selectedToken = null) {
  if (!to) {
    toError = REQUIRED_ERROR
  } else if (!toError && !selectedToken && !isValidBchAddress(to)) {
    toError = INVALID_RECIPIENT_ADDRESS_ERROR
  } else if (!toError && selectedToken && selectedToken.protocol === 'slp' && !isValidSlpAddress(to)) {
    toError = INVALID_RECIPIENT_ADDRESS_ERROR
  } else if (toError === 'invalid') {
    toError = INVALID_RECIPIENT_ADDRESS_ERROR
  }

  return { to: toError }
}

function isValidBchAddress (address) {
  return bchaddr.isMainnetAddress(address) && bchaddr.isLegacyAddress(address) || bchaddr.isCashAddress(address)
}

function isValidSlpAddress (address) {
  return bchaddr.isMainnetAddress(address) && bchaddr.isSlpAddress(address)
}

module.exports = {
  getToErrorObject,
}
