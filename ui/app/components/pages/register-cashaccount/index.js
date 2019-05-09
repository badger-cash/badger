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
const { DEFAULT_ROUTE } = require('../../../routes')

const cashaccount = require('cashaccounts')

class CashAccountPage extends Component {
  static propTypes = {
    selectedAddress: PropTypes.string,
    selectedSlpAddress: PropTypes.string,
  }

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
    const { selectedAddress } = this.props
    let registered
    const existingAccount = CashAccountUtils.getAccountByAddr(selectedAddress)

    if (existingAccount === undefined) {
      registered = await CashAccountUtils.checkIsRegistered(selectedAddress)
    }
    this.setState({
      cashaccount: existingAccount,
      registered: registered,
    })
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
    const { history, selectedAddress, selectedSlpAddress } = this.props
    const { username } = this.state

    const resp = await cashaccount.registerCashAccount(
      username,
      selectedAddress,
      selectedSlpAddress
    )

    if (resp.txid !== undefined) {
      await CashAccountUtils.saveRegistration(resp)
      await CashAccountUtils.upsertAccounts()
      history.push(DEFAULT_ROUTE)
    } else {
      this.setState({ err: 'Service unable to parse payment data.' })
    }
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
    const { history } = this.props
    const { err, cashaccount, registered } = this.state

    if (registered || cashaccount !== undefined) {
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
          </div>
        </div>
      )
    }
  }
}

CashAccountPage.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object,
  t: PropTypes.func,
}

CashAccountPage.contextTypes = {
  t: PropTypes.func,
}

const mapStateToProps = state => ({
  displayedForm: getCurrentViewContext(state),
  selectedAddress: selectors.getSelectedAddress(state),
  selectedSlpAddress: selectors.getSelectedSlpAddress(state),
})

const mapDispatchToProps = dispatch => ({
  displayForm: form => dispatch(actions.setNewAccountForm(form)),
  hideModal: () => dispatch(actions.hideModal()),
})

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(CashAccountPage)
