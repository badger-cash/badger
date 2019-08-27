const {
  multiplyCurrencies,
  subtractCurrencies,
} = require('../../../../../conversion-util')
const ethUtil = require('ethereumjs-util')

function calcMaxAmount ({ balance, selectedToken, tokenBalance, maxSendSatoshis }) {
  const { decimals } = selectedToken || {}
  const multiplier = Math.pow(10, Number(decimals || 0))

  if (selectedToken) {
    return selectedToken.string
  } else {
    return maxSendSatoshis.toString()
  }

  // return selectedToken
  //   ? multiplyCurrencies(tokenBalance, multiplier, { toNumericBase: 'hex' })
  //   : subtractCurrencies(
  //       ethUtil.addHexPrefix(balance),
  //       ethUtil.addHexPrefix(gasTotal),
  //       { toNumericBase: 'hex' }
  //     )
}

module.exports = {
  calcMaxAmount,
}
