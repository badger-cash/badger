import React from 'react'
import Button from '../../button'
import CashAccountUtils from '../../../../../app/scripts/lib/cashaccountutils'

const selectors = require('../../../selectors')
const Component = require('react').Component
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const actions = require('../../../actions')
const { getCurrentViewContext } = require('../../../selectors')
const { DEFAULT_ROUTE, REGISTER_CASHACCOUNT } = require('../../../routes')

const CashaccountClass = require('cashaccounts')
const cashaccount = new CashaccountClass()

class ImportCashAccount extends Component {
  static propTypes = {
    selectedAddress: PropTypes.string,
    selectedSlpAddress: PropTypes.string,
  }

  state = {
    username: '',
    results: '',
    err: '',
  }

  // componentDidMount () {
  //
  // }

  onChange = e => {
    const { value } = e.target

    this.setState({ username: value })

    if (value.length >= 4) {
      if (!cashaccount.isCashAccount(value)) {
        this.setState({ err: 'Not a valid Cashaccount' })
      } else {
        this.setState({ err: '' })
      }
    }
  }

  performSearch = async () => {
    const { username } = this.state
    const { selectedAddress, selectedSlpAddress } = this.props
    const results = await CashAccountUtils.getMatchingRegistration(
      username,
      selectedAddress,
      selectedSlpAddress
    )

    if (results === undefined) {
      this.setState({
        err: 'No cash accounts for your wallet were found.',
      })
    }
    this.setState({ results })
  }

  renderResults = () => {
    const { results } = this.state

    return (
      <div className="cashaccount-import">
        Please confirm that you are
        <p className="identity">
          {results.information.emoji}&nbsp;{results.identifier}.
          {results.information.collision.hash}
        </p>
        <Button
          type="primary"
          large={true}
          className="new-account-create-form__button"
          onClick={() => {
            this.restoreCashAccount(results)
          }}
        >
          {this.context.t('confirm')}
        </Button>
      </div>
    )
  }
  restoreCashAccount = async results => {
    const { txid } = results

    CashAccountUtils.upsertLocalStorage('cashaccount-registrations', {
      txid: txid,
    })

    await CashAccountUtils.upsertAccounts()

    history.push(DEFAULT_ROUTE)
  }

  renderBackButton = () => {
    const { history } = this.props

    return (
      <div className="">
        <br />
        <a
          className="import-account__back-button"
          onClick={() => {
            history.push(REGISTER_CASHACCOUNT)
          }}
        >
          Back
        </a>
      </div>
    )
  }

  render () {
    const { history } = this.props
    const { err, results } = this.state

    return (
      <div>
        <div className="cashaccount-import">
          {this.renderBackButton()}
          <div className="cashaccount-import title">
            Import your existing Cashaccount
          </div>
          <p className="cashaccount-import notice">
            ie: Jonathan#100. Note, only accounts registered in Badger can be
            recovered.
          </p>
          <div className="new-account-create-form__input-wrapper">
            <input
              className="new-account-create-form__input"
              onChange={this.onChange}
            />
          </div>
          {err !== '' && <aside className="error-message"> {err}</aside>}
          <div className="new-account-create-form__buttons">
            <Button
              type="primary"
              large={true}
              className="new-account-create-form__button"
              disabled={err !== ''}
              onClick={() => {
                this.performSearch()
              }}
            >
              {this.context.t('search')}
            </Button>
          </div>
          {results && this.renderResults()}
        </div>
      </div>
    )
  }
}

ImportCashAccount.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object,
  t: PropTypes.func,
}

ImportCashAccount.contextTypes = {
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
)(ImportCashAccount)
