const {
  addCurrencies,
  conversionUtil,
  conversionGTE,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
} = require('../../conversion-util')
const { calcTokenAmount } = require('../../token-util')
const {
  BASE_TOKEN_GAS_COST,
  INSUFFICIENT_FUNDS_ERROR,
  INSUFFICIENT_TOKENS_ERROR,
  NEGATIVE_ETH_ERROR,
  ONE_GWEI_IN_WEI_HEX,
  SIMPLE_GAS_COST,
  TOKEN_TRANSFER_FUNCTION_SIGNATURE,
} = require('./send.constants')
// const abi = require('ethereumjs-abi')
const ethUtil = require('ethereumjs-util')

const BITBOX = require('bitbox-sdk').BITBOX
const bitbox = new BITBOX()

module.exports = {
  addGasBuffer,
  calcGasTotal,
  calcTokenBalance,
  doesAmountErrorRequireUpdate,
  estimateGas,
  estimateGasPriceFromRecentBlocks,
  generateTokenTransferData,
  getAmountErrorObject,
  getGasFeeErrorObject,
  getToAddressForGasUpdate,
  isBalanceSufficient,
  isTokenBalanceSufficient,
  removeLeadingZeroes,
  removeUnspendableUtxo,
  calculateMaxSendSatoshis,
}

function calcGasTotal (gasLimit = '0', gasPrice = '0') {
  return multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  })
}

function isBalanceSufficient ({
  amount = '0',
  amountConversionRate = 1,
  balance = '0',
  conversionRate = 1,
  gasTotal = '0',
  primaryCurrency,
}) {
  const totalAmount = amount

  // TODO: calculate fee
  // const totalAmount = addCurrencies(amount, gasTotal, {
  //   aBase: 10,
  //   bBase: 10,
  //   toNumericBase: 'dec',
  // })

  const balanceIsSufficient = conversionGTE(
    {
      value: balance,
      fromNumericBase: 'dec',
      fromCurrency: primaryCurrency,
      conversionRate,
    },
    {
      value: totalAmount,
      fromNumericBase: 'dec',
      conversionRate: Number(amountConversionRate) || conversionRate,
      fromCurrency: primaryCurrency,
    }
  )

  return balanceIsSufficient
}

function isTokenBalanceSufficient ({ amount = '0', tokenBalance, decimals }) {
  // const amountInDec = conversionUtil(amount, {
  //   fromNumericBase: 'hex',
  // })

  const tokenBalanceIsSufficient = conversionGTE(
    {
      value: tokenBalance,
      fromNumericBase: 'dec',
    },
    {
      value: amount,
      // value: calcTokenAmount(amount, decimals),
      fromNumericBase: 'dec',
    }
  )

  return tokenBalanceIsSufficient
}

function getAmountErrorObject ({
  amount,
  amountConversionRate,
  balance,
  conversionRate,
  primaryCurrency,
  selectedToken,
  tokenBalance,
}) {
  let insufficientFunds = false
  if (conversionRate && !selectedToken) {
    insufficientFunds = !isBalanceSufficient({
      amount,
      amountConversionRate,
      balance,
      conversionRate,
      primaryCurrency,
    })
  }

  let inSufficientTokens = false
  if (selectedToken && selectedToken.string !== null) {
    const { decimals } = selectedToken
    inSufficientTokens = !isTokenBalanceSufficient({
      tokenBalance: selectedToken.string,
      amount,
      decimals,
    })
  }

  const amountLessThanZero = conversionGreaterThan(
    { value: 0, fromNumericBase: 'dec' },
    { value: amount, fromNumericBase: 'dec' }
  )

  let amountError = null

  if (insufficientFunds) {
    amountError = INSUFFICIENT_FUNDS_ERROR
  } else if (inSufficientTokens) {
    amountError = INSUFFICIENT_TOKENS_ERROR
  } else if (amountLessThanZero) {
    amountError = NEGATIVE_ETH_ERROR
  }

  return { amount: amountError }
}

function getGasFeeErrorObject ({
  amount,
  amountConversionRate,
  balance,
  conversionRate,
  gasTotal,
  primaryCurrency,
}) {
  const gasFeeError = null

  // if (gasTotal && conversionRate) {
  //   const insufficientFunds = !isBalanceSufficient({
  //     amount: '0',
  //     amountConversionRate,
  //     balance,
  //     conversionRate,
  //     gasTotal,
  //     primaryCurrency,
  //   })

  //   if (insufficientFunds) {
  //     gasFeeError = INSUFFICIENT_FUNDS_ERROR
  //   }
  // }

  return { gasFee: gasFeeError }
}

function calcTokenBalance ({ selectedToken, usersToken }) {
  const { decimals } = selectedToken || {}
  return calcTokenAmount(usersToken.balance.toString(), decimals) + ''
}

function doesAmountErrorRequireUpdate ({
  balance,
  gasTotal,
  prevBalance,
  prevGasTotal,
  prevTokenBalance,
  selectedToken,
  tokenBalance,
}) {
  const balanceHasChanged = balance !== prevBalance
  const gasTotalHasChange = gasTotal !== prevGasTotal
  const tokenBalanceHasChanged =
    selectedToken && tokenBalance !== prevTokenBalance
  const amountErrorRequiresUpdate =
    balanceHasChanged || gasTotalHasChange || tokenBalanceHasChanged

  return amountErrorRequiresUpdate
}

async function estimateGas ({
  selectedAddress,
  selectedToken,
  blockGasLimit,
  to,
  value,
  gasPrice,
  estimateGasMethod,
}) {
  const paramsForGasEstimate = { from: selectedAddress, value, gasPrice }

  if (selectedToken) {
    paramsForGasEstimate.value = '0x0'
    paramsForGasEstimate.data = generateTokenTransferData({
      toAddress: to,
      amount: value,
      selectedToken,
    })
  }

  // if recipient has no code, gas is 21k max:
  if (!selectedToken) {
    const code = Boolean(to) && (await global.eth.getCode(to))
    if (!code || code === '0x') {
      return SIMPLE_GAS_COST
    }
  } else if (selectedToken && !to) {
    return BASE_TOKEN_GAS_COST
  }

  paramsForGasEstimate.to = selectedToken ? selectedToken.address : to

  // if not, fall back to block gasLimit
  paramsForGasEstimate.gas = ethUtil.addHexPrefix(
    multiplyCurrencies(blockGasLimit, 0.95, {
      multiplicandBase: 16,
      multiplierBase: 10,
      roundDown: '0',
      toNumericBase: 'hex',
    })
  )
  // run tx
  return new Promise((resolve, reject) => {
    return estimateGasMethod(paramsForGasEstimate, (err, estimatedGas) => {
      if (err) {
        const simulationFailed =
          err.message.includes('Transaction execution error.') ||
          err.message.includes(
            'gas required exceeds allowance or always failing transaction'
          )
        if (simulationFailed) {
          const estimateWithBuffer = addGasBuffer(
            paramsForGasEstimate.gas,
            blockGasLimit,
            1.5
          )
          return resolve(ethUtil.addHexPrefix(estimateWithBuffer))
        } else {
          return reject(err)
        }
      }
      const estimateWithBuffer = addGasBuffer(
        estimatedGas.toString(16),
        blockGasLimit,
        1.5
      )
      return resolve(ethUtil.addHexPrefix(estimateWithBuffer))
    })
  })
}

function addGasBuffer (
  initialGasLimitHex,
  blockGasLimitHex,
  bufferMultiplier = 1.5
) {
  const upperGasLimit = multiplyCurrencies(blockGasLimitHex, 0.9, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  })
  const bufferedGasLimit = multiplyCurrencies(
    initialGasLimitHex,
    bufferMultiplier,
    {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
      numberOfDecimals: '0',
    }
  )

  // if initialGasLimit is above blockGasLimit, dont modify it
  if (
    conversionGreaterThan(
      { value: initialGasLimitHex, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' }
    )
  ) { return initialGasLimitHex }
  // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
  if (
    conversionLessThan(
      { value: bufferedGasLimit, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' }
    )
  ) { return bufferedGasLimit }
  // otherwise use blockGasLimit
  return upperGasLimit
}

function generateTokenTransferData ({
  toAddress = '0x0',
  amount = '0x0',
  selectedToken,
}) {
  if (!selectedToken) return

  // TODO removed for abi
  // return TOKEN_TRANSFER_FUNCTION_SIGNATURE + Array.prototype.map.call(
  //   abi.rawEncode(['address', 'uint256'], [toAddress, ethUtil.addHexPrefix(amount)]),
  //   x => ('00' + x.toString(16)).slice(-2)
  // ).join('')
}

function estimateGasPriceFromRecentBlocks (recentBlocks) {
  // Return 1 gwei if no blocks have been observed:
  if (!recentBlocks || recentBlocks.length === 0) {
    return ONE_GWEI_IN_WEI_HEX
  }

  const lowestPrices = recentBlocks
    .map(block => {
      if (!block.gasPrices || block.gasPrices.length < 1) {
        return ONE_GWEI_IN_WEI_HEX
      }
      return block.gasPrices.reduce((currentLowest, next) => {
        return parseInt(next, 16) < parseInt(currentLowest, 16)
          ? next
          : currentLowest
      })
    })
    .sort((a, b) => (parseInt(a, 16) > parseInt(b, 16) ? 1 : -1))

  return lowestPrices[Math.floor(lowestPrices.length / 2)]
}

function getToAddressForGasUpdate (...addresses) {
  return [...addresses, '']
    .find(str => str !== undefined && str !== null)
    .toLowerCase()
}

function removeLeadingZeroes (str) {
  return str.replace(/^0*(?=\d)/, '')
}

function removeUnspendableUtxo (utxo) {
  const sorted = utxo.sort((a, b) => {
    return b.satoshis - a.satoshis
  })

  const spendable = sorted.map(x => {
    if (x.spendable) {
      return x
    }
  })

  const clean = spendable.filter(val => {
    return val !== undefined
  })

  const chunk = chunkArray(clean, 20)

  // limit to 20 utxo to prevent tx failing
  return chunk[0]
}

function chunkArray (arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  )
}

function calculateMaxSendSatoshis (spendableUtxos) {
  if (!spendableUtxos || spendableUtxos.length === 0) {
    throw new Error('Insufficient funds')
  }

  // Calculate fee
  let byteCount = 0
  const sortedSpendableUtxos = spendableUtxos.sort((a, b) => {
    return b.satoshis - a.satoshis
  })
  const inputUtxos = []
  let totalUtxoAmount = 0
  for (const utxo of sortedSpendableUtxos) {
    if (utxo.spendable !== true) {
      throw new Error('Cannot spend unspendable utxo')
    }
    inputUtxos.push(utxo)
    totalUtxoAmount += utxo.satoshis

    byteCount = bitbox.BitcoinCash.getByteCount(
      { P2PKH: inputUtxos.length },
      { P2PKH: 2 }
    )
  }

  const maxSendSatoshis = totalUtxoAmount - byteCount
  return maxSendSatoshis
}
