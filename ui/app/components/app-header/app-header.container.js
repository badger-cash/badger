import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'

import AppHeader from './app-header.component'
const actions = require('../../actions')
const selectors = require('../../selectors')

const mapStateToProps = state => {
  const { appState, metamask } = state
  const { networkDropdownOpen } = appState
  const {
    network,
    provider,
    selectedAddress,
    selectedSlpAddress,
    isUnlocked,
    cashaccount,
    cashaccountRegistrations,
  } = metamask

  return {
    networkDropdownOpen,
    network,
    provider,
    selectedAddress,
    isUnlocked,
    cashaccount,
    cashaccountRegistrations,
    selectedSlpAddress,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    showNetworkDropdown: () => dispatch(actions.showNetworkDropdown()),
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
    toggleAccountMenu: () => dispatch(actions.toggleAccountMenu()),
    checkUnencrypted: () => dispatch(actions.checkUnencrypted()),
    setCashAccount: x => dispatch(actions.setCashAccount(x)),
    setCashAccountRegistration: x =>
      dispatch(actions.setCashAccountRegistration(x)),
  }
}

export default compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AppHeader)
