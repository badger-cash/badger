import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ConfirmPageContainer, {
  ConfirmDetailRow,
} from '../../confirm-page-container'
import { formatCurrency } from '../../../helpers/confirm-transaction/util'
import {
  isBalanceSufficient,
  isTokenBalanceSufficient,
  removeUnspendableUtxo,
  signAndPublishBchTransaction,
} from '../../send/send.utils'
import { DEFAULT_ROUTE } from '../../../routes'
import {
  INSUFFICIENT_FUNDS_ERROR_KEY,
  TRANSACTION_ERROR_KEY,
  INSUFFICIENT_TOKENS_ERROR_KEY,
} from '../../../constants/error-keys'
import { PageContainerFooter } from '../../page-container'
import ConfirmPageContainerHeader from '../../confirm-page-container/confirm-page-container-header'
import localStorage from 'store'

export default class ConfirmTransactionBase extends Component {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    // react-router props
    match: PropTypes.object,
    history: PropTypes.object,
    // Redux props
    balance: PropTypes.any,
    cancelTransaction: PropTypes.func,
    clearConfirmTransaction: PropTypes.func,
    clearSend: PropTypes.func,
    conversionRate: PropTypes.number,
    currentCurrency: PropTypes.string,
    editTransaction: PropTypes.func,
    ethTransactionAmount: PropTypes.string,
    ethTransactionFee: PropTypes.string,
    ethTransactionTotal: PropTypes.string,
    fiatTransactionAmount: PropTypes.string,
    fiatTransactionFee: PropTypes.string,
    fiatTransactionTotal: PropTypes.string,
    fromAddress: PropTypes.string,
    fromName: PropTypes.string,
    hexGasTotal: PropTypes.string,
    isTxReprice: PropTypes.bool,
    methodData: PropTypes.object,
    nonce: PropTypes.string,
    assetImage: PropTypes.string,
    sendTransaction: PropTypes.func,
    showCustomizeGasModal: PropTypes.func,
    showTransactionConfirmedModal: PropTypes.func,
    toAddress: PropTypes.string,
    tokenData: PropTypes.object,
    tokenProps: PropTypes.object,
    toName: PropTypes.string,
    transactionStatus: PropTypes.string,
    txData: PropTypes.object,
    opReturn: PropTypes.object,
    // Component props
    action: PropTypes.string,
    contentComponent: PropTypes.node,
    dataComponent: PropTypes.node,
    detailsComponent: PropTypes.node,
    errorKey: PropTypes.string,
    errorMessage: PropTypes.string,
    ethTotalTextOverride: PropTypes.string,
    fiatTotalTextOverride: PropTypes.string,
    hideData: PropTypes.bool,
    hideDetails: PropTypes.bool,
    hideSubtitle: PropTypes.bool,
    identiconAddress: PropTypes.string,
    onCancel: PropTypes.func,
    onEdit: PropTypes.func,
    onEditGas: PropTypes.func,
    onSubmit: PropTypes.func,
    subtitle: PropTypes.string,
    summaryComponent: PropTypes.node,
    title: PropTypes.string,
    valid: PropTypes.bool,
    warning: PropTypes.string,
    historicalBchTransactions: PropTypes.object,
  }

  state = {
    submitting: false,
    submitError: null,
    pendingCashAccount: localStorage.get('pendingCashAccount'),
    submitSuccess: false,
  }

  componentDidUpdate() {
    const {
      transactionStatus,
      showTransactionConfirmedModal,
      history,
      clearConfirmTransaction,
    } = this.props

    if (transactionStatus === 'dropped') {
      showTransactionConfirmedModal({
        onHide: () => {
          clearConfirmTransaction()
          history.push(DEFAULT_ROUTE)
        },
      })

      return
    }
  }

  getErrorKey() {
    const {
      balance,
      conversionRate,
      hexGasTotal,
      txData: { simulationFails, txParams: { value: amount } = {} } = {},
      txParams,
      accountTokens,
    } = this.props

    const insufficientBalance = txParams.sendTokenData
      ? false
      : balance &&
        !isBalanceSufficient({
          amount,
          gasTotal: hexGasTotal || '0x0',
          balance,
          conversionRate,
        })

    if (insufficientBalance) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_FUNDS_ERROR_KEY,
      }
    }

    let insufficientTokens = !!txParams.sendTokenData
    if (txParams.sendTokenData) {
      if (
        accountTokens &&
        accountTokens[txParams.from] &&
        accountTokens[txParams.from]['mainnet']
      ) {
        const tokenToSend = accountTokens[txParams.from]['mainnet'].find(
          token => token.address === txParams.sendTokenData.tokenId
        )
        insufficientTokens = tokenToSend
          ? !isTokenBalanceSufficient({
              tokenBalance: tokenToSend.string,
              amount,
              decimals: tokenToSend.decimals,
            })
          : true
      } else {
        insufficientTokens = true
      }
    }

    if (insufficientTokens) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_TOKENS_ERROR_KEY,
      }
    }

    if (simulationFails) {
      return {
        valid: true,
        errorKey: TRANSACTION_ERROR_KEY,
      }
    }

    return {
      valid: true,
    }
  }

  handleEditGas() {
    const { onEditGas, showCustomizeGasModal } = this.props

    if (onEditGas) {
      onEditGas()
    } else {
      showCustomizeGasModal()
    }
  }

  renderDetails() {
    const {
      detailsComponent,
      fiatTransactionFee,
      ethTransactionFee,
      currentCurrency,
      fiatTransactionTotal,
      ethTransactionTotal,
      fiatTotalTextOverride,
      ethTotalTextOverride,
      hideDetails,
    } = this.props

    if (hideDetails) {
      return null
    }

    const formattedCurrency = formatCurrency(
      fiatTransactionTotal,
      currentCurrency
    )

    return (
      detailsComponent || (
        <div className="confirm-page-container-content__details">
          <div className="confirm-page-container-content__gas-fee">
            <ConfirmDetailRow
              label="Gas Fee"
              fiatText={formatCurrency(fiatTransactionFee, currentCurrency)}
              ethText={`\u2666 ${ethTransactionFee}`}
              headerText="Edit"
              headerTextClassName="confirm-detail-row__header-text--edit"
              onHeaderClick={() => this.handleEditGas()}
            />
          </div>
          <div>
            <ConfirmDetailRow
              label="Total"
              fiatText={fiatTotalTextOverride || formattedCurrency}
              ethText={ethTotalTextOverride || `\u2666 ${ethTransactionTotal}`}
              headerText="Amount + Gas Fee"
              headerTextClassName="confirm-detail-row__header-text--total"
              fiatTextColor="#2d7cc2"
            />
          </div>
        </div>
      )
    )
  }

  renderData() {
    const { t } = this.context
    const {
      txData: { txParams: { data } = {} } = {},
      methodData: { name, params } = {},
      hideData,
      dataComponent,
    } = this.props

    if (hideData) {
      return null
    }

    return (
      dataComponent || (
        <div className="confirm-page-container-content__data">
          <div className="confirm-page-container-content__data-box-label">
            {`${t('functionType')}:`}
            <span className="confirm-page-container-content__function-type">
              {name || t('notFound')}
            </span>
          </div>
          {params && (
            <div className="confirm-page-container-content__data-box">
              <div className="confirm-page-container-content__data-field-label">
                {`${t('parameters')}:`}
              </div>
              <div>
                <pre>{JSON.stringify(params, null, 2)}</pre>
              </div>
            </div>
          )}
          <div className="confirm-page-container-content__data-box-label">
            {`${t('hexData')}:`}
          </div>
          <div className="confirm-page-container-content__data-box">{data}</div>
        </div>
      )
    )
  }

  handleEdit() {
    const { txData, tokenData, tokenProps, onEdit } = this.props
    onEdit({ txData, tokenData, tokenProps })
  }

  handleCancel() {
    const {
      onCancel,
      txData,
      cancelTransaction,
      history,
      clearConfirmTransaction,
    } = this.props

    localStorage.remove('cashAccount')
    localStorage.remove('pendingCashAccount')

    if (onCancel) {
      onCancel(txData)
    } else {
      cancelTransaction(txData).then(() => {
        clearConfirmTransaction()
        history.push(DEFAULT_ROUTE)
      })
    }
  }

  handleSubmit() {
    const {
      sendTransaction,
      clearConfirmTransaction,
      txData,
      history,
      onSubmit,
      txParams,
    } = this.props
    const { submitting } = this.state

    localStorage.remove('cashAccount')
    localStorage.remove('pendingCashAccount')

    const isCashAccountRegistration =
      txParams.opReturn !== undefined &&
      txParams.opReturn.data[0] === '0x01010101'

    if (submitting) {
      return
    }

    this.setState({ submitting: true, submitError: null })

    if (onSubmit) {
      Promise.resolve(onSubmit(txData)).then(
        this.setState({ submitting: false })
      )
    } else {
      sendTransaction(txData, isCashAccountRegistration)
        .then(async x => {
          this.setState({ submitting: false, submitSuccess: true })

          setTimeout(async function () {
            await clearConfirmTransaction()
            history.push(DEFAULT_ROUTE)
          }, 3 * 1000)
        })
        .catch(error => {
          this.setState({ submitting: false, submitError: error.message })
        })
    }
  }

  renderRegistration = () => {
    const { pendingCashAccount } = this.state

    return (
      <div className="page-container">
        <div className="confirm-page-container-header__row">
          <h1>
            Pending handle is{' '}
            <span style={{ fontWeight: 'bold' }}>{pendingCashAccount}</span>
          </h1>
        </div>

        <div className="confirm-page-container-summary">
          <p>
            Your number will be determined once the registration is confirmed.
          </p>
          <br />
          <br />
          <small>
            A tiny amount of BCH will be spent to cover the mining fee if you
            continue.
          </small>
        </div>

        <PageContainerFooter
          onCancel={() => this.handleCancel()}
          onSubmit={() => this.handleSubmit()}
          submitText={this.context.t('confirm')}
          submitButtonType="confirm"
        />
      </div>
    )
  }

  renderSuccess = () => {
    return (
      <div className="page-container">
        <div className="page-container__header">
          <div className="page-container__title">
            Payment Sent
          </div>
        </div>
        <div className="page-container__success">
          <i className="fa fa-check-circle"></i>
        </div>
      </div>
    )
  }

  render() {
    let {
      isTxReprice,
      fromName,
      fromAddress,
      toName,
      toAddress,
      methodData,
      ethTransactionAmount,
      fiatTransactionAmount,
      valid: propsValid = true,
      errorMessage,
      errorKey: propsErrorKey,
      currentCurrency,
      action,
      title,
      subtitle,
      hideSubtitle,
      identiconAddress,
      summaryComponent,
      contentComponent,
      onEdit,
      nonce,
      assetImage,
      warning,
      txParams,
      accountTokens,
    } = this.props
    const { submitting, submitError, submitSuccess } = this.state
    const isCashAccountRegistration =
      txParams.opReturn !== undefined &&
      txParams.opReturn.data[0] === '0x01010101'

    if (submitSuccess) {
      return this.renderSuccess()
    }

    if (isCashAccountRegistration) {
      return this.renderRegistration()
    }

    const { name } = methodData
    const fiatConvertedAmount = formatCurrency(
      fiatTransactionAmount,
      currentCurrency
    )
    const { valid, errorKey } = this.getErrorKey()

    // Send Token Settings
    if (txParams.sendTokenData) {
      let tokenToSend = null

      // Set token if metadata exists
      try {
        tokenToSend = accountTokens[txParams.from]['mainnet'].find(
          token => token.address === txParams.sendTokenData.tokenId
        )
      } catch (err) {
        // Token not found
      }

      title = tokenToSend
        ? `${txParams.value} ${tokenToSend.symbol}`
        : 'Unknown Token'
      subtitle = tokenToSend
        ? txParams.sendTokenData.tokenProtocol === 'slp'
          ? 'Simple Ledger Protocol'
          : 'UNKNOWN PROTOCOL'
        : ''
      hideSubtitle = !tokenToSend

      // Update sendTokenData symbol
      txParams.sendTokenData.tokenSymbol = tokenToSend
        ? tokenToSend.symbol
        : 'Unknown Token'
    }

    return (
      <ConfirmPageContainer
        fromName={fromName}
        fromAddress={fromAddress}
        toName={toName}
        toAddress={toAddress}
        txParams={txParams}
        showEdit={
          onEdit &&
          !isTxReprice &&
          !txParams.sendTokenData &&
          !txParams.paymentData
        }
        action={action || name || this.context.t('unknownFunction')}
        title={
          title || `${fiatConvertedAmount} ${currentCurrency.toUpperCase()}`
        }
        subtitle={subtitle || `\u2666 ${ethTransactionAmount}`}
        hideSubtitle={hideSubtitle}
        summaryComponent={summaryComponent}
        detailsComponent={this.renderDetails()}
        dataComponent={this.renderData()}
        contentComponent={contentComponent}
        nonce={nonce}
        assetImage={assetImage}
        identiconAddress={identiconAddress}
        errorMessage={errorMessage || submitError}
        errorKey={propsErrorKey || errorKey}
        warning={warning}
        disabled={!propsValid || !valid || submitting}
        onEdit={() => this.handleEdit()}
        onCancel={() => this.handleCancel()}
        onSubmit={() => this.handleSubmit()}
      />
    )
  }
}
