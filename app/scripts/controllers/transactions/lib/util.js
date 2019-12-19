/**
@module
*/

const BigNumber = require('bignumber.js')
const bchaddr = require('bchaddrjs-slp')
const bitboxUtils = require('../bitbox-utils')

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
  // Set op return defaults if missing
  if (typeof txParams.opReturn !== 'undefined') {
    if (!txParams.to) txParams.to = txParams.from
    if (!txParams.value) txParams.value = 546
    if (typeof txParams.opReturn.position !== 'undefined') {
      if (txParams.opReturn.position !== '0' && txParams.opReturn.position !== '1') txParams.opReturn.position = '1'
    }
    if (!txParams.opReturn.isEncoded) txParams.opReturn.isEncoded = false
    if (txParams.opReturn.isEncoded && txParams.opReturn.data) {
      txParams.opReturn.data = Object.keys(txParams.opReturn.data).map(function (key) {
        return txParams.opReturn.data[key]
      })
    }
  }

  // Set from and to addresses to cash addr
  if (txParams.to) {
    txParams.to = bchaddr.toCashAddress(txParams.to)
  }
  if (txParams.from) {
    txParams.from = bchaddr.toCashAddress(txParams.from)
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

  // Validate op return
  if (typeof txParams.opReturn !== 'undefined') {
    validateOpReturn(txParams.opReturn)
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

function isValidAddress (address) {
  try {
    const legacyAddress = bchaddr.toLegacyAddress(address)
    const addrIsMain = bchaddr.isMainnetAddress(legacyAddress)
    return addrIsMain
  } catch (err) {
    return false
  }
}

function validateOpReturn (opReturn) {
  // Data property
  if (!opReturn.data || opReturn.data.length === 0) {
    throw new Error('Op return data property invalid')
  }

  // Only strings in unencoded data array
  if (!opReturn.isEncoded) {
    opReturn.data.forEach(pushData => {
      if (typeof pushData !== 'string') throw new Error('Only utf and hex strings supported in OP Return')
    })
  }

  // Encoded data must start with OP Return byte
  if (opReturn.isEncoded) {
    if (opReturn.data[0] !== 106) throw new Error('Invalid encoded OP Return data')
  }

  // Max length
  const encodedScript = bitboxUtils.encodeOpReturn(opReturn.data, opReturn.isEncoded)
  if (encodedScript.byteLength > 223) throw new Error('OP Return too large')
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

