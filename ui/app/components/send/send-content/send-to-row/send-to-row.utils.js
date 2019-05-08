import cashaccount from 'cashaccounts'
const {
  REQUIRED_ERROR,
  INVALID_RECIPIENT_ADDRESS_ERROR,
} = require('../../send.constants')
// const { isValidAddress } = require('../../../../util')
const bchaddr = require('bchaddrjs-slp')

function getToErrorObject (to, toError = null, selectedToken = null) {
  try {
    isValidBchAddress(to)
  } catch (error) {
    toError = INVALID_RECIPIENT_ADDRESS_ERROR
  }
  if (toError !== null) {
    try {
      isValidSlpAddress(to)
    } catch (error) {
      toError = INVALID_RECIPIENT_ADDRESS_ERROR
    }
  }

  if (to === '') {
    toError = REQUIRED_ERROR
  }

  if (isValidCashAccount(to)) {
    toError = null
  }

  return { to: toError }
}

function isValidCashAccount (string) {
  return cashaccount.isCashAccount(string)
}

function isValidBchAddress (address) {
  return (
    (bchaddr.isMainnetAddress(address) && bchaddr.isLegacyAddress(address)) ||
    bchaddr.isCashAddress(address)
  )
}

function isValidSlpAddress (address) {
  return bchaddr.isMainnetAddress(address) && bchaddr.isSlpAddress(address)
}

module.exports = {
  getToErrorObject,
}
