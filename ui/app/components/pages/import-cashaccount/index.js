import React from 'react'
import axios from 'axios'
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
    cashaccount: PropTypes.object,
    cashaccountRegistrations: PropTypes.any,
  }

  state = {
    username: '',
    results: '',
    loading: true,
    err: '',
  }

  componentDidMount() {
    const { selectedSlpAddress } = this.props
    const badgerSlpAddress = cashaccount.toSlpAddress(selectedSlpAddress)

    this.performReverseLookup(badgerSlpAddress)
  }

  performReverseLookup = async address => {
    const validArray = []
    const { selectedAddress, selectedSlpAddress } = this.props
    const badgerSlpAddress = cashaccount.toSlpAddress(selectedSlpAddress)

    const { data } = await axios
      .get(`https://rest.bitcoin.com/v2/cashAccounts/reverselookup/${address}`)
      .catch(err => {
        return this.setState({ loading: false, results: validArray })
      })

    for (const each of data.results) {
      const resp = await cashaccount.trustedSearch(
        `${each.nameText}#${each.accountNumber}`
      )
      for (const registration of resp) {
        const bchAddr = registration.information.payment[0].address
        const slpAddr = registration.information.payment[1].address

        const isValid =
          bchAddr === selectedAddress && slpAddr === badgerSlpAddress
        if (isValid) {
          validArray.push(registration)
        }
      }
    }

    this.setState({ loading: false, results: validArray })
  }

  renderResults = () => {
    const { results } = this.state

    if (!results.length) {
      return (
        <div className="cashaccount-import"> No valid registrations found </div>
      )
    }

    return (
      <div className="cashaccount-import">
        {results
          ? results.map((x, i) => {
              return (
                <div key={i}>
                  <p className="identity">
                    {x.information.emoji}&nbsp;
                    {x.identifier}
                  </p>

                  <Button
                    type="primary"
                    large={true}
                    className="new-account-create-form__button"
                    onClick={() => {
                      this.restoreCashAccount(x)
                    }}
                  >
                    {this.context.t('restore')}
                  </Button>
                </div>
              )
            })
          : ''}
      </div>
    )
  }

  restoreCashAccount = async results => {
    const { txid } = results
    const { setCashAccount, history } = this.props
    CashAccountUtils.upsertLocalStorage('cashaccount-registrations', {
      txid: txid,
    })

    setCashAccount(results)
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

  renderSpinner = () => {
    return (
      <div className="lds-roller">
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
    )
  }

  render() {
    const { history } = this.props
    const { err, results, loading } = this.state

    return (
      <div>
        <div className="cashaccount-import">
          {this.renderBackButton()}
          <div className="cashaccount-import title">
            Import your existing Cashaccount
          </div>

          {loading ? (
            <div style={{ textAlign: 'center' }}>{this.renderSpinner()}</div>
          ) : (
            <div>
              <p className="cashaccount-import notice">
                Note, only accounts registered in Badger can be recovered.
              </p>
              {results && this.renderResults()}
            </div>
          )}
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
  setCashAccount: x => dispatch(actions.setCashAccount(x)),
})

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(ImportCashAccount)
