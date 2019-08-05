import React from 'react'
const inherits = require('util').inherits
const Component = require('react').Component
const connect = require('react-redux').connect
const { compose } = require('recompose')
const { withRouter } = require('react-router-dom')
const PropTypes = require('prop-types')
const actions = require('../../actions')
const {
  Menu,
  Item,
  Divider,
  CloseArea,
} = require('../dropdowns/components/menu')
const Identicon = require('../identicon')
const { formatBalance } = require('../../util')
const Tooltip = require('../tooltip')

const {
  SETTINGS_ROUTE,
  INFO_ROUTE,
  NEW_ACCOUNT_ROUTE,
  REGISTER_CASHACCOUNT,
  DEFAULT_ROUTE,
} = require('../../routes')

module.exports = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AccountMenu)

AccountMenu.contextTypes = {
  t: PropTypes.func,
}

inherits(AccountMenu, Component)
function AccountMenu () {
  Component.call(this)
}

function mapStateToProps (state) {
  return {
    selectedAddress: state.metamask.selectedAddress,
    isAccountMenuOpen: state.metamask.isAccountMenuOpen,
    keyrings: state.metamask.keyrings,
    identities: state.metamask.identities,
    accounts: state.metamask.accounts,
    isUnencrypted: state.metamask.isUnencrypted,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    toggleAccountMenu: () => dispatch(actions.toggleAccountMenu()),
    showAccountDetail: address => {
      dispatch(actions.showAccountDetail(address))
      dispatch(actions.hideSidebar())
      dispatch(actions.toggleAccountMenu())
    },
    lockMetamask: () => {
      dispatch(actions.lockMetamask())
      dispatch(actions.hideWarning())
      dispatch(actions.hideSidebar())
      dispatch(actions.toggleAccountMenu())
    },
    showConfigPage: () => {
      dispatch(actions.showConfigPage())
      dispatch(actions.hideSidebar())
      dispatch(actions.toggleAccountMenu())
    },
    showInfoPage: () => {
      dispatch(actions.showInfoPage())
      dispatch(actions.hideSidebar())
      dispatch(actions.toggleAccountMenu())
    },
    showRemoveAccountConfirmationModal: identity => {
      return dispatch(
        actions.showModal({ name: 'CONFIRM_REMOVE_ACCOUNT', identity })
      )
    },
  }
}

AccountMenu.prototype.render = function () {
  const {
    isAccountMenuOpen,
    toggleAccountMenu,
    lockMetamask,
    history,
    isUnencrypted,
  } = this.props

  return (
    <Menu className="account-menu" isShowing={isAccountMenuOpen}>
      <CloseArea onClick={toggleAccountMenu} />
      <Item className="account-menu__header">
        {this.context.t('myAccounts')}

        {!isUnencrypted ? (
          <div
            style={{ cursor: 'pointer' }}
            className="account-menu__logout-button"
            onClick={() => {
              lockMetamask()
              history.push(DEFAULT_ROUTE)
            }}
          >
            {this.context.t('logout')}
          </div>
        ) : (
          ''
        )}
      </Item>
      <Divider />
      <div className="account-menu__accounts">{this.renderAccounts()}</div>
      <Divider />
      <Item
        onClick={() => {
          toggleAccountMenu()
          history.push(NEW_ACCOUNT_ROUTE)
        }}
        icon={
          <img
            className="account-menu__item-icon"
            src="images/plus-btn-white.svg"
          />
        }
        text={this.context.t('createAccount')}
      />
      <Item
        onClick={() => {
          toggleAccountMenu()
          history.push(REGISTER_CASHACCOUNT)
        }}
        icon={
          <img
            className="account-menu__item-icon"
            src="images/cashaccount.svg"
          />
        }
        text="Register Username"
      />
      <Divider />
      <Item
        onClick={() => {
          toggleAccountMenu()
          history.push(INFO_ROUTE)
        }}
        icon={<img src="images/mm-info-icon.svg" />}
        text={this.context.t('infoHelp')}
      />
      <Item
        onClick={() => {
          toggleAccountMenu()
          history.push(SETTINGS_ROUTE)
        }}
        icon={
          <img className="account-menu__item-icon" src="images/settings.svg" />
        }
        text={this.context.t('settings')}
      />
    </Menu>
  )
}

AccountMenu.prototype.renderAccounts = function () {
  const {
    identities,
    accounts,
    selectedAddress,
    keyrings,
    showAccountDetail,
  } = this.props

  const accountOrder = keyrings
    .slice(0, 1)
    .reduce((list, keyring) => list.concat(keyring.accounts), [])
  return accountOrder
    .filter(address => !!identities[address])
    .map(address => {
      const identity = identities[address]
      const isSelected = identity.address === selectedAddress

      const balanceValue = accounts[address] ? accounts[address].balance : ''
      const formattedBalance = balanceValue
        ? formatBalance(balanceValue, 8)
        : '0'
      const simpleAddress = identity.address.substring(2).toLowerCase()

      const keyring = keyrings.find(kr => {
        return (
          kr.accounts.includes(simpleAddress) ||
          kr.accounts.includes(identity.address)
        )
      })

      return (
        <div
          className="account-menu__account menu__item--clickable"
          onClick={() => showAccountDetail(identity.address)}
          key={address}
        >
          <div className="account-menu__check-mark">
            {isSelected ? (
              <div className="account-menu__check-mark-icon" />
            ) : null}
          </div>
          <Identicon address={identity.address} diameter={24} />
          <div className="account-menu__account-info">
            <div className="account-menu__name">{identity.name || ''}</div>
            <div className="account-menu__balance">{formattedBalance}</div>
          </div>
          {this.renderKeyringType(keyring)}
          {this.renderRemoveAccount(keyring, identity)}
        </div>
      )
    })
}

AccountMenu.prototype.renderRemoveAccount = function (keyring, identity) {
  // Any account that's not from the HD wallet Keyring can be removed
  const type = keyring.type
  const isRemovable = type !== 'HD Key Tree'
  if (isRemovable) {
    return (
      <Tooltip title={this.context.t('removeAccount')} position="bottom">
        <a
          className="remove-account-icon"
          onClick={e => this.removeAccount(e, identity)}
        />
      </Tooltip>
    )
  }
  return null
}

AccountMenu.prototype.removeAccount = function (e, identity) {
  e.preventDefault()
  e.stopPropagation()
  const { showRemoveAccountConfirmationModal } = this.props
  showRemoveAccountConfirmationModal(identity)
}

AccountMenu.prototype.renderKeyringType = function (keyring) {
  try {
    // Sometimes keyrings aren't loaded yet:
    const type = keyring.type
    let label
    switch (type) {
      case 'Trezor Hardware':
      case 'Ledger Hardware':
        label = this.context.t('hardware')
        break
      case 'Simple Key Pair':
        label = this.context.t('imported')
        break
      default:
        label = ''
    }

    return label !== '' ? (
      <div className="keyring-label allcaps">{label}</div>
    ) : null
  } catch (e) {
    return
  }
}
