import { connect } from 'react-redux'
import RegisterCashAccount from './register-cashaccount.component'

const {
  setCashAccount,
  setCashAccountRegistration,
} = require('../../../actions')

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

const mapDispatchToProps = dispatch => {
  return {
    setCashAccount: x => dispatch(setCashAccount(x)),
    setCashAccountRegistration: x => dispatch(setCashAccountRegistration(x)),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RegisterCashAccount)
