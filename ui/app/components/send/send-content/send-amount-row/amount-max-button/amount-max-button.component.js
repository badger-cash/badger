import React, { Component } from 'react'
import PropTypes from 'prop-types'

const bitboxUtils = require('./../../../../../../../app/scripts/controllers/transactions/bitbox-utils')

export default class AmountMaxButton extends Component {
  static propTypes = {
    balance: PropTypes.any,
    gasTotal: PropTypes.string,
    maxModeOn: PropTypes.bool,
    selectedToken: PropTypes.object,
    utxo: PropTypes.object,
    setAmountToMax: PropTypes.func,
    setMaxModeTo: PropTypes.func,
    tokenBalance: PropTypes.string,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  handleOnClick = async e => {
    const {
      balance,
      selectedToken,
      tokenBalance,
      setAmountToMax,
      setMaxModeTo,
      selectedAddress,
      utxo,
    } = this.props

    const bchUtxo = utxo[selectedAddress]
    const fee = await bitboxUtils.calculateFee(bchUtxo)

    setMaxModeTo(true)
    setAmountToMax({ balance, selectedToken, tokenBalance, fee })
  }

  render () {
    const { maxModeOn } = this.props

    return (
      <div
        className="send-v2__amount-max"
        onClick={e => {
          this.handleOnClick(e)
        }}
      >
        {!maxModeOn ? this.context.t('max') : ''}
      </div>
    )
  }
}
