import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Button from '../../button'
import CashAccountUtils from '../../../../../app/scripts/lib/cashaccountutils'

import localStorage from 'store'

const {
  DEFAULT_ROUTE,
  IMPORT_CASHACCOUNT,
  CONFIRM_TRANSACTION_ROUTE,
} = require('../../../routes')

const CashaccountClass = require('cashaccounts')
const cashaccount = new CashaccountClass()

class CashAccountRegistration extends Component {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    location: PropTypes.object,
    history: PropTypes.object,
    selectedAddress: PropTypes.string,
    from: PropTypes.any,
    cashaccount: PropTypes.object,
    cashaccountRegistrations: PropTypes.any,
    t: PropTypes.func,
    updateSendTo: PropTypes.func,
  }

  state = {
    cashaccount: '',
    username: localStorage.get('pendingCashAccount'),
    registered: false,
    err: '',
  }

  componentDidMount() {
    const {
      from: { address: from },
      updateSendTo,
    } = this.props

    this.checkCashAccountStatus()

    updateSendTo(from, '')
  }

  componentDidUpdate(prevProps) {
    const { selectedAddress } = this.props
    if (prevProps.selectedAddress !== selectedAddress) {
      this.checkCashAccountStatus()
    }
  }

  checkCashAccountStatus = async () => {
    const {
      selectedAddress,
      setCashAccount,
      setCashAccountRegistration,
    } = this.props
    const existingAccount = await CashAccountUtils.getAccountByAddr(
      selectedAddress
    )

    const registration = await CashAccountUtils.getRegistrationByAddr(
      selectedAddress
    )

    await setCashAccount(existingAccount)
    await setCashAccountRegistration(
      registration !== undefined ? [registration] : ''
    )
  }

  onChange = e => {
    const cashAccountRegex = /^([a-zA-Z0-9_]{2,99})?$/i

    const { value } = e.target

    this.setState({ username: value })
    if (!cashAccountRegex.test(value)) {
      this.setState({ err: 'Invalid characters' })
    } else {
      this.setState({ err: '' })
    }
  }

  createAccount = async () => {
    const {
      amount,
      from: { address: from },
      selectedToken,
      sign,
      to,
      history,
      selectedAddress,
      selectedSlpAddress,
      setCashAccountRegistration,
    } = this.props

    const { username } = this.state
    localStorage.set('pendingCashAccount', username)

    const accountName = cashaccount.encodeUsername(username)
    const bchHex = cashaccount.getHashFromAddress(selectedAddress)
    const slpHex = cashaccount.getHashFromAddress(selectedSlpAddress)

    const data = [
      '0x01010101',
      `0x${accountName}`,
      `0x01${bchHex.p2pkh}`,
      `0x81${slpHex.p2pkh}`,
    ]

    await sign({ data, selectedToken, to, amount, from })
    history.push(CONFIRM_TRANSACTION_ROUTE)
  }

  renderImport = () => {
    const { history } = this.props

    return (
      <div className="cashaccount-advanced">
        Advanced
        <br />
        <a
          onClick={() => {
            history.push(IMPORT_CASHACCOUNT)
          }}
        >
          Import existing Cash Account
        </a>
      </div>
    )
  }

  renderDescription = () => {
    return (
      <div className="">
        <h4>
          CashAccounts are handles/aliases for your Bitcoin cash and tokens.
        </h4>
        <h5>
          for example, you can send to Jonathan#100 instead of memorizing
          bitcoincash:qp3w......
        </h5>
        <p>Choose a username to get started.</p>
      </div>
    )
  }
  renderWarning = () => {
    const { history } = this.props
    return (
      <div className="cashaccount-description">
        <h4>This wallet already has a registration.</h4>
        <p>
          Accounts are not finalized until the next block confirmation, which
          takes up to 10 minutes on average.
        </p>

        <div className="new-account-create-form__buttons">
          <Button
            type="default"
            large={true}
            className="new-account-create-form__button"
            onClick={() => history.push(DEFAULT_ROUTE)}
          >
            {this.context.t('cancel')}
          </Button>
        </div>
      </div>
    )
  }

  render() {
    const { history, cashaccount, cashaccountRegistrations } = this.props
    const { err } = this.state

    if (
      (cashaccountRegistrations !== undefined &&
        cashaccountRegistrations.length >= 1) ||
      cashaccount !== undefined
    ) {
      return <div>{this.renderWarning()}</div>
    } else {
      return (
        <div>
          <div className="cashaccount-description">
            <div className="new-account-create-form__input-label">
              Register Username
            </div>
            {this.renderDescription()}
            <div className="new-account-create-form__input-wrapper">
              <input
                className="new-account-create-form__input"
                onChange={this.onChange}
              />
            </div>
            {err !== '' && <aside className="error-message"> {err}</aside>}
            <div className="new-account-create-form__buttons">
              <Button
                type="default"
                large={true}
                className="new-account-create-form__button"
                onClick={() => history.push(DEFAULT_ROUTE)}
              >
                {this.context.t('cancel')}
              </Button>
              <Button
                type="primary"
                large={true}
                className="new-account-create-form__button"
                disabled={err !== ''}
                onClick={() => {
                  this.createAccount()
                }}
              >
                {this.context.t('create')}
              </Button>
            </div>

            {this.renderImport()}
          </div>
        </div>
      )
    }
  }
}

export default CashAccountRegistration
