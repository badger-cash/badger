/**
@module
*/

const BigNumber = require('bignumber.js')
const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()

module.exports = {
  normalizeTxParams,
  validateTxParams,
  validateFrom,
  validateRecipient,
  getFinalStates,
}

 /**
  normalizes txParams
  @param txParams {object}
  @returns {object} normalized txParams
 */
function normalizeTxParams (txParams) {
  if (txParams.to) {
    txParams.to = BITBOX.Address.toCashAddress(txParams.to)
  }
  if (txParams.from) {
    txParams.from = BITBOX.Address.toCashAddress(txParams.from)
  }
  return txParams
}

 /**
  validates txParams
  @param txParams {object}
 */
function validateTxParams (txParams) {
  validateFrom(txParams)
  validateRecipient(txParams)

  // value property required
  if (!('value' in txParams)) {
    throw new Error('Value property must exist')
  }

  // No negative values
  const value = txParams.value.toString()
  if (value.includes('-')) {
    throw new Error(`Invalid transaction value of ${txParams.value} not a positive number.`)
  }

  // Ensure parse as BigNumber and non negative value
  const bnValue = new BigNumber(value)
  if (bnValue.isNaN() || bnValue.isNegative()) {
    throw new Error('Value property invalid')
  }

  // TODO: Accept only satoshis
  // if (value.includes('.')) {
  //   throw new Error(`Invalid transaction value of ${txParams.value} number must be in wei`)
  // }
}

 /**
  validates the from field in  txParams
  @param txParams {object}
 */
function validateFrom (txParams) {
  if (!(typeof txParams.from === 'string')) throw new Error(`Invalid from address ${txParams.from} not a string`)
  else if (txParams.from !== undefined && !isValidAddress(txParams.from)) {
    throw new Error('Invalid from address')
  }
}

 /**
  validates the to field in  txParams
  @param txParams {object}
 */
function validateRecipient (txParams) {
  if (txParams.to === '' || txParams.to === null) {
    throw new Error('Invalid recipient address')
  } else if (txParams.to !== undefined && !isValidAddress(txParams.to)) {
    throw new Error('Invalid recipient address')
  }
  return txParams
}

/**
  validates the to field in  txParams
  @param address {string}
 */
function isValidAddress (address) {
  try {
    const legacyAddress = BITBOX.Address.toLegacyAddress(address)
    const addrIsMain = BITBOX.Address.isMainnetAddress(legacyAddress)
    return addrIsMain
  } catch (err) {
    return false
  }
}

  /**
    @returns an {array} of states that can be considered final
  */
function getFinalStates () {
  return [
    'rejected', // the user has responded no!
    'confirmed', // the tx has been included in a block.
    'failed', // the tx failed for some reason, included on tx data.
    'dropped', // the tx nonce was already used
  ]
}

