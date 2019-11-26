import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import CurrencyDisplay from '../currency-display/currency-display.component'
import { getTokenData } from '../../helpers/transactions.util'
import { calcTokenAmount } from '../../token-util'

import { formatTokenAmount } from '../../helpers/formatter-numbers.util'

export default class TokenCurrencyDisplay extends PureComponent {
  static propTypes = {
    transactionData: PropTypes.object,
    token: PropTypes.object,
    amount: PropTypes.any,
  }

  state = {
    displayValue: '',
  }

  componentDidMount () {
    this.setDisplayValue()
  }

  componentDidUpdate (prevProps) {
    const { transactionData } = this.props
    const { transactionData: prevTransactionData } = prevProps

    if (transactionData !== prevTransactionData) {
      this.setDisplayValue()
    }
  }

  setDisplayValue () {
    const { transactionData: data, token } = this.props
    const { decimals = '', symbol = '' } = token
    const { amount } = this.props

    const displayValue = `${formatTokenAmount(amount)} ${symbol}`

    // if (tokenData.params && tokenData.params.length === 2) {
    //   const tokenValue = tokenData.params[1].value
    //   const tokenAmount = calcTokenAmount(tokenValue, decimals)
    //   displayValue = `${tokenAmount} ${symbol}`
    // }

    this.setState({ displayValue })
  }

  render () {
    return (
      <CurrencyDisplay {...this.props} displayValue={this.state.displayValue} />
    )
  }
}
