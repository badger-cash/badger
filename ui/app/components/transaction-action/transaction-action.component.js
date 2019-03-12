import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { getTransactionActionKey } from '../../helpers/transactions.util'

export default class TransactionAction extends PureComponent {
  static contextTypes = {
    tOrDefault: PropTypes.func,
  }

  static propTypes = {
    className: PropTypes.string,
    transaction: PropTypes.object,
    methodData: PropTypes.object,
    actionPrefix: PropTypes.string,
  }

  state = {
    transactionAction: '',
  }

  componentDidMount () {
    this.getTransactionAction()
  }

  componentDidUpdate () {
    this.getTransactionAction()
  }

  async getTransactionAction () {
    const { transactionAction } = this.state
    const { transaction, methodData, actionPrefix } = this.props
    const { data, done } = methodData

    if (!done || transactionAction) {
      return
    }

    const actionKey = await getTransactionActionKey(transaction, data)
    let action = actionKey && this.context.tOrDefault(actionKey)

    if (actionKey === 'sentBitcoinCash') {
      action = `${actionPrefix}`
    }

    if (
      transaction &&
      transaction.txParams &&
      transaction.txParams.sendTokenData
    ) {
      action = `${actionPrefix} ${
        transaction.txParams.sendTokenData.tokenSymbol
      }`
    }

    this.setState({ transactionAction: action })
  }

  render () {
    const {
      className,
      methodData: { done },
    } = this.props
    const { transactionAction } = this.state

    return (
      <div className={className}>{(done && transactionAction) || '--'}</div>
    )
  }
}
