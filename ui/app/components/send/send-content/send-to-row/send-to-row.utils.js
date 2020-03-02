const CashaccountClass = require('cashaccounts')
const cashaccount = new CashaccountClass()

const SLPSDK = require('slp-sdk')
const SLP = new SLPSDK()

const {
  REQUIRED_ERROR,
  INVALID_RECIPIENT_ADDRESS_ERROR,
} = require('../../send.constants')

async function getToErrorObject (to, toError = null, selectedToken = null) {
  const cashAddr = await SLP.Address.isCashAddress(to)
  const slpAddr = await SLP.Address.isSLPAddress(to)

  const isValid = cashAddr === true || slpAddr === true

  if (!isValid) {
    toError = INVALID_RECIPIENT_ADDRESS_ERROR
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

module.exports = {
  getToErrorObject,
}
