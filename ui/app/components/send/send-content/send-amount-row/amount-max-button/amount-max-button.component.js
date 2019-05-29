import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  removeUnspendableUtxo,
  calculateMaxSendSatoshis,
} from '../../../send.utils'

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
      selectedSlpAddress,
      utxo,
    } = this.props

    let bchUtxo = utxo[selectedAddress]
    if (selectedSlpAddress && utxo[selectedSlpAddress]) {
      bchUtxo = bchUtxo.concat(utxo[selectedSlpAddress])
    }
    const cleanUtxo = removeUnspendableUtxo(bchUtxo)
    const maxSendSatoshis = calculateMaxSendSatoshis(cleanUtxo)

    setMaxModeTo(true)
    setAmountToMax({ balance, selectedToken, tokenBalance, maxSendSatoshis })
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
