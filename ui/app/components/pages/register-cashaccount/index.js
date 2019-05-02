import React from 'react'
import Button from '../../button'
import CashAccount from '../../../../../app/scripts/lib/cashaccount'
import localStorage from 'store'

const selectors = require('../../../selectors')
const Component = require('react').Component
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const actions = require('../../../actions')
const { getCurrentViewContext } = require('../../../selectors')
const { DEFAULT_ROUTE } = require('../../../routes')

// save registration tx to localstorage
// wait until confirmation
// parse it for details
// show pending
// if confirmed, hide registration from menu

class CashAccountPage extends Component {
  state = {
    username: '',
    err: '',
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
    const existingArray = localStorage.get('cashaccount-registrations')

    const resp = await CashAccount.registerCashAccount(
      username,
      selectedAddress,
      selectedSlpAddress
    )

    if (resp.hex !== undefined) {
      const array = existingArray === undefined ? [] : existingArray

      array.push(resp)
      localStorage.set('cashaccount-registrations', array)
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
        <h5>Jonathan#100 => bitcoincash:qp3w...</h5>
        <p>Choose a username to get started.</p>
      </div>
    )
  }

  render () {
    const { history, location } = this.props
    const { err, username } = this.state

    return (
      <div>
        <div className="cashaccount-description">
          <div className="new-account-create-form__input-label">
            Register CashAccount
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
        </div>{' '}
      </div>
    )
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
