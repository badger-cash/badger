import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import Identicon from '../identicon'
// import TransactionStatus from '../transaction-status'
import TransactionAction from '../transaction-action'
import CurrencyDisplay from '../currency-display'
import TokenCurrencyDisplay from '../token-currency-display'
import TransactionListItemDetails from '../transaction-list-item-details'
const recipientWhitelist = require('../../../../app/scripts/controllers/transactions/lib/recipient-whitelist')
import { CONFIRM_TRANSACTION_ROUTE } from '../../routes'
import { UNAPPROVED_STATUS } from '../../constants/transactions'
import { BCH } from '../../constants/common'
import CashAccountUtils from '../../../../app/scripts/lib/cashaccountutils'

export default class TransactionListItem extends PureComponent {
  static propTypes = {
    history: PropTypes.object,
    transaction: PropTypes.object,
    value: PropTypes.string,
    methodData: PropTypes.object,
    showRetry: PropTypes.bool,
    retryTransaction: PropTypes.func,
    setSelectedToken: PropTypes.func,
    nonceAndDate: PropTypes.string,
    token: PropTypes.object,
    assetImages: PropTypes.object,
    tokenData: PropTypes.object,
    selectedAddress: PropTypes.string,
    index: PropTypes.number,
  }

  state = {
    showTransactionDetails: false,
  }

  handleClick = () => {
    const { transaction, history } = this.props
    const { id, status } = transaction
    const { showTransactionDetails } = this.state

    if (status === UNAPPROVED_STATUS) {
      history.push(`${CONFIRM_TRANSACTION_ROUTE}/${id}`)
      return
    }

    this.setState({ showTransactionDetails: !showTransactionDetails })
  }

  handleRetry = () => {
    // TODO: handleRetry
    // const {
    //   transaction: { txParams: { to } = {} },
    //   methodData: { name } = {},
    //   setSelectedToken,
    // } = this.props
    // if (name === TOKEN_MBCHOD_TRANSFER) {
    //   setSelectedToken(to)
    // }
    // this.resubmit()
  }

  resubmit () {
    // TODO: resubmit
    // const {
    //   transaction: { id },
    //   retryTransaction,
    //   history,
    // } = this.props
    // retryTransaction(id).then(id =>
    //   history.push(`${CONFIRM_TRANSACTION_ROUTE}/${id}`)
    // )
  }

  renderPrimaryCurrency (currencyPrefix) {
    const {
      token,
      transaction: { txParams: { data } = {} } = {},
      transaction: { txParams } = {},
      value,
    } = this.props

    const sendTokenData = txParams.sendTokenData
    if (sendTokenData && token) {
      token.decimals = 0
    }

    return token ? (
      <TokenCurrencyDisplay
        className="transaction-list-item__amount transaction-list-item__amount--primary"
        token={token}
        transactionData={data}
        prefix={currencyPrefix}
        amount={txParams.value}
      />
    ) : (
      <CurrencyDisplay
        className="transaction-list-item__amount transaction-list-item__amount--primary"
        value={value}
        prefix={currencyPrefix}
        numberOfDecimals={8}
        currency={BCH}
        fromDenomination="SAT"
      />
    )
  }

  renderSecondaryCurrency (currencyPrefix) {
    const { value, transaction: { txParams } = {} } = this.props

    return txParams.sendTokenData ? null : (
      <CurrencyDisplay
        className="transaction-list-item__amount transaction-list-item__amount--secondary"
        prefix={currencyPrefix}
        value={value}
        fromDenomination="SAT"
      />
    )
  }

  upsertRegistration = async transaction => {
    const { setCashAccountRegistration } = this.props
    const exists = CashAccountUtils.checkRegistrationExistsAlready(
      transaction.hash
    )

    if (!exists) {
      const registration = { txid: transaction.hash }

      await CashAccountUtils.saveRegistration(registration)
      await CashAccountUtils.upsertAccounts()

      setCashAccountRegistration(registration)
    }
  }

  render () {
    const {
      transaction,
      methodData,
      showRetry,
      nonceAndDate,
      assetImages,
      tokenData,
      selectedAddress,
      token,
      index,
    } = this.props
    const { txParams = {} } = transaction
    const { showTransactionDetails } = this.state
    const showMemo = txParams.paymentData && txParams.paymentData.memo
    const fromAddress = txParams.from
    const toAddress = tokenData
      ? (tokenData.params &&
          tokenData.params[0] &&
          tokenData.params[0].value) ||
        txParams.to
      : txParams.to
    const tokenSymbol = token && token.symbol ? token.symbol : ''

    const toAddresses = txParams.toAddresses ? txParams.toAddresses : []
    if (toAddress) {
      toAddresses.push(toAddress)
    }

    const fromAddresses = txParams.fromAddresses ? txParams.fromAddresses : []
    if (fromAddress) {
      fromAddresses.push(toAddress)
    }

    // Determine sent or received
    let currencyPrefix = ''
    let actionPrefix = ''
    let img = assetImages[toAddress]
    if (fromAddress === toAddress) {
      const isCashAccountRegistration =
        txParams.opReturn !== undefined &&
        txParams.opReturn.data[0] === '0x01010101'

      if (isCashAccountRegistration && index === 0) {
        this.upsertRegistration(transaction)
      }

      // Send to self
    } else if (selectedAddress === fromAddress) {
      // Sent tx
      currencyPrefix = '-'
      actionPrefix = 'Sent'
      if (
        toAddress &&
        toAddress.split(':')[1] === 'pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g'
      ) {
        actionPrefix = 'Sent to eatBCH VE'
        img = 'images/addresses/pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g.png'
      } else if (
        toAddress &&
        toAddress.split(':')[1] === 'qrsrvtc95gg8rrag7dge3jlnfs4j9pe0ugrmeml950'
      ) {
        actionPrefix = 'Sent to eatBCH SS'
        img = 'images/addresses/qrsrvtc95gg8rrag7dge3jlnfs4j9pe0ugrmeml950.png'
      } else if (
        toAddresses.some(address =>
          recipientWhitelist.satoshidice.includes(address.split(':')[1])
        )
      ) {
        actionPrefix = 'Sent to SatoshiDice'
        img = 'images/satoshidice.png'
      } else if (
        toAddresses.some(address =>
          recipientWhitelist.satoshistack.includes(address.split(':')[1])
        )
      ) {
        actionPrefix = 'Sent to SatoshiStack'
        img = 'images/satoshidice.png'
      }
    } else if (selectedAddress === toAddress) {
      // Received tx
      currencyPrefix = '+'
      actionPrefix = 'Received'
      if (
        fromAddresses.some(address =>
          recipientWhitelist.satoshidice.includes(address.split(':')[1])
        )
      ) {
        actionPrefix = 'SatoshiDice Win'
        img = 'images/satoshidice.png'
      } else if (
        fromAddresses.some(address =>
          recipientWhitelist.satoshistack.includes(address.split(':')[1])
        )
      ) {
        actionPrefix = 'SatoshiStack Win'
        img = 'images/satoshidice.png'
      }
    }

    return (
      <div className={`transaction-list-item ${actionPrefix.toLowerCase()}`}>
        <div className="transaction-list-item__grid" onClick={this.handleClick}>
          <Identicon
            className="transaction-list-item__identicon"
            address={toAddress}
            diameter={34}
            image={img}
          />
          <TransactionAction
            transaction={transaction}
            methodData={methodData}
            actionPrefix={actionPrefix}
            tokenSymbol={tokenSymbol}
            className="transaction-list-item__action"
          />
          <div className="transaction-list-item__nonce" title={nonceAndDate}>
            {nonceAndDate}
          </div>
          {/* <TransactionStatus
            className="transaction-list-item__status"
            statusKey={transaction.status}
            title={
              transaction.err && transaction.err.rpc
                ? transaction.err.rpc.message
                : transaction.err && transaction.err.message
            }
            transaction={transaction}
          /> */}
          {fromAddress !== toAddress
            ? this.renderPrimaryCurrency(currencyPrefix)
            : ''}
          {fromAddress !== toAddress
            ? this.renderSecondaryCurrency(currencyPrefix)
            : ''}
        </div>
        {showMemo && (
          <div className="transaction-list-item__memo-container">
            {txParams.paymentData.memo}
          </div>
        )}
        {showTransactionDetails && (
          <div className="transaction-list-item__details-container">
            <TransactionListItemDetails
              transaction={transaction}
              showRetry={showRetry && methodData.done}
              onRetry={this.handleRetry}
            />
          </div>
        )}
      </div>
    )
  }
}
