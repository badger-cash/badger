const {
  multiplyCurrencies,
  subtractCurrencies,
} = require('../../../../../conversion-util')
const ethUtil = require('ethereumjs-util')

function calcMaxAmount ({ balance, selectedToken, tokenBalance, fee }) {
  const { decimals } = selectedToken || {}
  const multiplier = Math.pow(10, Number(decimals || 0))

  if (selectedToken) {
    return selectedToken.string
  } else {
    balance = balance - fee
    return balance.toString()
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
