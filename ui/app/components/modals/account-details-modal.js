import React from 'react'
const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../actions')
const AccountModalContainer = require('./account-modal-container')
const { getSelectedIdentity } = require('../../selectors')
const genAccountLink = require('../../../lib/account-link.js')
const QrView = require('../qr-code')
const EditableLabel = require('../editable-label')

import Button from '../button'

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
    selectedIdentity: getSelectedIdentity(state),
    keyrings: state.metamask.keyrings,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    // Is this supposed to be used somewhere?
    showQrView: (selected, identity) =>
      dispatch(actions.showQrView(selected, identity)),
    showExportPrivateKeyModal: () => {
      dispatch(actions.showModal({ name: 'EXPORT_PRIVATE_KEY' }))
    },
    hideModal: () => dispatch(actions.hideModal()),
    setAccountLabel: (address, label) =>
      dispatch(actions.setAccountLabel(address, label)),
  }
}

inherits(AccountDetailsModal, Component)
function AccountDetailsModal () {
  Component.call(this)

  this.state = {
    showSLP: false,
  }
}

AccountDetailsModal.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(AccountDetailsModal)

// Not yet pixel perfect todos:
// fonts of qr-header

AccountDetailsModal.prototype.render = function () {
  const {
    selectedIdentity,
    network,
    showExportPrivateKeyModal,
    setAccountLabel,
    keyrings,
  } = this.props

  const { name, address } = selectedIdentity

  const keyring = keyrings.find(kr => {
    return kr.accounts.includes(address)
  })

  let exportPrivateKeyFeatureEnabled = false
  // This feature is disabled for hardware wallets
  if (keyring && keyring.type.search('Hardware') !== -1) {
    exportPrivateKeyFeatureEnabled = false
  }

  return (
    <AccountModalContainer>
      <EditableLabel
        className="account-modal__name"
        defaultValue={name}
        onSubmit={label => setAccountLabel(address, label)}
      />
      <QrView
        Qr={{
          data: address,
        }}
      />
      <div className="account-modal-divider" />
      <Button
        type="primary"
        className="account-modal__button"
        onClick={() =>
          global.platform.openWindow({ url: genAccountLink(address, 1) })
        }
      >
        {this.context.t('etherscanView')}
      </Button>
    </AccountModalContainer>
  )
}
