import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { matchPath } from 'react-router-dom'
import localStorage from 'store'

import CashAccountUtils from '../../../../app/scripts/lib/cashaccountutils'

const {
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_POPUP,
} = require('../../../../app/scripts/lib/enums')
const {
  DEFAULT_ROUTE,
  INITIALIZE_ROUTE,
  CONFIRM_TRANSACTION_ROUTE,
} = require('../../routes')
const Identicon = require('../identicon')
const NetworkIndicator = require('../network')

export default class AppHeader extends PureComponent {
  static propTypes = {
    history: PropTypes.object,
    location: PropTypes.object,
    network: PropTypes.string,
    provider: PropTypes.object,
    networkDropdownOpen: PropTypes.bool,
    showNetworkDropdown: PropTypes.func,
    hideNetworkDropdown: PropTypes.func,
    toggleAccountMenu: PropTypes.func,
    checkUnencrypted: PropTypes.func,
    selectedAddress: PropTypes.string,
    selectedSlpAddress: PropTypes.string,
    isUnlocked: PropTypes.bool,
  }

  static contextTypes = {
    t: PropTypes.func,
  }
  state = {
    pending: '',
    cashaccount: '',
  }
  async componentDidMount () {
    const { checkUnencrypted } = this.props
    checkUnencrypted()
    await CashAccountUtils.upsertAccounts()
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
    const existingAccount = await CashAccountUtils.getAccountByAddr(
      selectedAddress
    )

    let pending

    if (existingAccount === undefined) {
      pending = await CashAccountUtils.getRegistrationByAddr(selectedAddress)
    }
    this.setState({
      cashaccount: existingAccount,
      pending: pending,
    })
  }

  handleNetworkIndicatorClick (event) {
    event.preventDefault()
    event.stopPropagation()

    const {
      networkDropdownOpen,
      showNetworkDropdown,
      hideNetworkDropdown,
    } = this.props

    return networkDropdownOpen === false
      ? showNetworkDropdown()
      : hideNetworkDropdown()
  }

  isConfirming () {
    const { location } = this.props

    return Boolean(
      matchPath(location.pathname, {
        path: CONFIRM_TRANSACTION_ROUTE,
        exact: false,
      })
    )
  }

  renderAccountMenu () {
    const { isUnlocked, toggleAccountMenu, selectedAddress } = this.props

    return (
      isUnlocked && (
        <div
          className={classnames('account-menu__icon', {
            'account-menu__icon--disabled': this.isConfirming(),
          })}
          onClick={() => this.isConfirming() || toggleAccountMenu()}
        >
          <Identicon address={selectedAddress} diameter={32} />
        </div>
      )
    )
  }

  hideAppHeader () {
    const { location } = this.props

    const isInitializing = Boolean(
      matchPath(location.pathname, {
        path: INITIALIZE_ROUTE,
        exact: false,
      })
    )

    if (isInitializing) {
      return true
    }

    if (window.METAMASK_UI_TYPE === ENVIRONMENT_TYPE_NOTIFICATION) {
      return true
    }

    if (
      window.METAMASK_UI_TYPE === ENVIRONMENT_TYPE_POPUP &&
      this.isConfirming()
    ) {
      return true
    }
  }

  renderCashAccount = () => {
    const { cashaccount, pending } = this.state

    if (cashaccount) {
      return (
        <div className="pending">
          {cashaccount.information.emoji} {cashaccount.identifier}
        </div>
      )
    }
    if (pending) {
      return <div className="pending">registration pending</div>
    } else {
      return
    }
  }

  render () {
    const { history, isUnlocked } = this.props

    // if (this.hideAppHeader()) {
    //   return null
    // }

    return (
      <div
        className={classnames('app-header', {
          'app-header--back-drop': isUnlocked,
        })}
      >
        <div className="app-header__contents">
          <div
            className="app-header__logo-container"
            onClick={() => history.push(DEFAULT_ROUTE)}
          >
            <img
              className="app-header__metafox-logo app-header__metafox-logo--horizontal"
              src="/images/badger.png"
              height={30}
            />
            <img
              className="app-header__metafox-logo app-header__metafox-logo--icon"
              src="/images/bch_logo.svg"
              height={42}
              width={42}
            />
          </div>
          <div>{this.renderCashAccount()}</div>
          <div className="app-header__account-menu-container">
            {this.renderAccountMenu()}
          </div>
        </div>
      </div>
    )
  }
}
