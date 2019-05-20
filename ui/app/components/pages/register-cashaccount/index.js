import React from 'react'
import Button from '../../button'
import localStorage from 'store'
import CashAccountUtils from '../../../../../app/scripts/lib/cashaccountutils'

const selectors = require('../../../selectors')
const Component = require('react').Component
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const actions = require('../../../actions')
const { getCurrentViewContext } = require('../../../selectors')
const { DEFAULT_ROUTE, IMPORT_CASHACCOUNT } = require('../../../routes')

const CashaccountClass = require('cashaccounts')
const cashaccount = new CashaccountClass()

class RegisterCashAccount extends Component {
  state = {
    cashaccount: '',
    username: '',
    registered: false,
    err: '',
  }

  componentDidMount () {
    this.checkCashAccountStatus()
  }

  componentDidUpdate (prevProps) {
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
      history,
      selectedAddress,
      selectedSlpAddress,
      setCashAccountRegistration,
    } = this.props
    const { username } = this.state

    const resp = await cashaccount.trustedRegistration(
      username,
      selectedAddress,
      selectedSlpAddress
    )

    if (resp.txid !== undefined) {
      const registrations = await CashAccountUtils.saveRegistration(resp)
      await CashAccountUtils.upsertAccounts()

      await setCashAccountRegistration(registrations)
      history.push(DEFAULT_ROUTE)
    } else {
      this.setState({ err: 'Service unable to parse payment data.' })
    }
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

  render () {
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

RegisterCashAccount.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object,
  selectedAddress: PropTypes.string,
  cashaccount: PropTypes.object,
  cashaccountRegistrations: PropTypes.any,
  t: PropTypes.func,
}

RegisterCashAccount.contextTypes = {
  t: PropTypes.func,
}

const mapStateToProps = state => {
  const { metamask } = state
  const {
    selectedAddress,
    selectedSlpAddress,
    cashaccount,
    cashaccountRegistrations,
  } = metamask

  return {
    selectedAddress,
    selectedSlpAddress,
    cashaccount,
    cashaccountRegistrations,
  }
}

const mapDispatchToProps = dispatch => ({
  displayForm: form => dispatch(actions.setNewAccountForm(form)),
  hideModal: () => dispatch(actions.hideModal()),
  setCashAccount: x => dispatch(actions.setCashAccount(x)),
  setCashAccountRegistration: x =>
    dispatch(actions.setCashAccountRegistration(x)),
})

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(RegisterCashAccount)
