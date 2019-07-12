import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import TransactionListItem from '../transaction-list-item'
import Button from '../button/button.component'

export default class TransactionList extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static defaultProps = {
    pendingTransactions: [],
    completedTransactions: [],
    transactionToRetry: {},
  }

  static propTypes = {
    pendingTransactions: PropTypes.array,
    completedTransactions: PropTypes.array,
    transactionToRetry: PropTypes.object,
    selectedToken: PropTypes.object,
    updateNetworkNonce: PropTypes.func,
    assetImages: PropTypes.object,
    selectedAddress: PropTypes.string,
  }

  componentDidMount () {
    this.props.updateNetworkNonce()
  }

  componentDidUpdate (prevProps) {
    const { pendingTransactions: prevPendingTransactions = [] } = prevProps
    const { pendingTransactions = [], updateNetworkNonce } = this.props

    if (pendingTransactions.length > prevPendingTransactions.length) {
      updateNetworkNonce()
    }
  }

  shouldShowRetry = transaction => {
    return false

    // TODO: show retry
    // const { transactionToRetry } = this.props
    // const { id, submittedTime } = transaction
    // return id === transactionToRetry.id && Date.now() - submittedTime > 30000
  }

  renderTransactions () {
    const { t } = this.context
    const {
      pendingTransactions = [],
      completedTransactions = [],
      selectedAddress,
    } = this.props

    return (
      <div className="transaction-list__transactions">
        {pendingTransactions.length > 0 && (
          <div className="transaction-list__pending-transactions">
            <div className="transaction-list__header">
              {`${t('queue')} (${pendingTransactions.length})`}
            </div>
            {pendingTransactions.map((transaction, index) =>
              this.renderTransaction(transaction, index)
            )}
          </div>
        )}
        <div className="transaction-list__completed-transactions">
          <div className="transaction-list__header">{t('history')}</div>
          {completedTransactions.length > 0
            ? completedTransactions.map((transaction, index) =>
                this.renderTransaction(transaction, index)
              )
            : this.renderEmpty()}
        </div>
        <div>
          <Button
            type="default"
            style={{ margin: '15px auto', width: '70%' }}
            onClick={() => {
              const url = `https://explorer.bitcoin.com/bch/address/${selectedAddress}`
              global.platform.openWindow({ url })
            }}
          >
            View history on explorer
          </Button>
        </div>
      </div>
    )
  }

  renderTransaction (transaction, index) {
    const { selectedToken, assetImages, selectedAddress } = this.props

    return (
      <TransactionListItem
        transaction={transaction}
        key={`${selectedAddress}${transaction.id}`}
        showRetry={this.shouldShowRetry(transaction)}
        token={selectedToken}
        assetImages={assetImages}
        selectedAddress={selectedAddress}
        index={index}
      />
    )
  }

  renderEmpty () {
    return (
      <div className="transaction-list__empty">
        <div className="transaction-list__empty-text">
          {this.context.t('noTransactions')}
        </div>
      </div>
    )
  }

  render () {
    return <div className="transaction-list">{this.renderTransactions()}</div>
  }
}
