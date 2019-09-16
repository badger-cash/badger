import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import SenderToRecipient from '../sender-to-recipient'
import { CARDS_VARIANT } from '../sender-to-recipient/sender-to-recipient.constants'
import TransactionActivityLog from '../transaction-activity-log'
import TransactionBreakdown from '../transaction-breakdown'
import Button from '../button'
import prefixForNetwork from '../../../lib/etherscan-prefix-for-network'

export default class TransactionListItemDetails extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    onRetry: PropTypes.func,
    showRetry: PropTypes.bool,
    transaction: PropTypes.object,
  }

  handleEtherscanClick = () => {
    const { hash, metamaskNetworkId } = this.props.transaction

    const prefix = prefixForNetwork(metamaskNetworkId)
    const etherscanUrl = `https://explorer.bitcoin.com/bch/tx/${hash}`
    global.platform.openWindow({ url: etherscanUrl })
    this.setState({ showTransactionDetails: true })
  }

  handleRetry = event => {
    // TODO: handleRetry
    // const { onRetry } = this.props
    // event.stopPropagation()
    // onRetry()
  }

  render () {
    const { t } = this.context
    let { transaction, showRetry } = this.props
    // TODO: showRetry
    showRetry = false

    const { txParams: { to, from, sendTokenData } = {} } = transaction

    return (
      <div className="transaction-list-item-details">
        <div className="transaction-list-item-details__header">
          <div>Details</div>
          <div className="transaction-list-item-details__header-buttons">
            {showRetry && (
              <Button
                type="raised"
                onClick={this.handleRetry}
                className="transaction-list-item-details__header-button"
              >
                {t('speedUp')}
              </Button>
            )}
            <Button
              type="raised"
              onClick={this.handleEtherscanClick}
              className="transaction-list-item-details__header-button"
            >
              <img src="/images/arrow-popout.svg" />
            </Button>
          </div>
        </div>
        <div className="transaction-list-item-details__sender-to-recipient-container">
          <SenderToRecipient
            variant={CARDS_VARIANT}
            addressOnly
            recipientAddress={to}
            senderAddress={from}
            symbol={
              transaction.txParams.sendTokenData
                ? transaction.txParams.sendTokenData.tokenSymbol
                : 'BCH'
            }
          />
        </div>
        {!sendTokenData && (
          <div className="transaction-list-item-details__cards-container">
            <TransactionBreakdown
              transaction={transaction}
              className="transaction-list-item-details__transaction-breakdown"
            />
            {/* <TransactionActivityLog
              transaction={transaction}
              className="transaction-list-item-details__transaction-activity-log"
            /> */}
          </div>
        )}
      </div>
    )
  }
}
