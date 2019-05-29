const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../actions')
const copyToClipboard = require('copy-to-clipboard')
const { Menu, Item, CloseArea } = require('./components/menu')

TokenMenuDropdown.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(TokenMenuDropdown)

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    showHideTokenConfirmationModal: token => {
      dispatch(actions.showModal({ name: 'HIDE_TOKEN_CONFIRMATION', token }))
    },
  }
}

inherits(TokenMenuDropdown, Component)
function TokenMenuDropdown () {
  Component.call(this)

  this.onClose = this.onClose.bind(this)
}

TokenMenuDropdown.prototype.onClose = function (e) {
  e.stopPropagation()
  this.props.onClose()
}

TokenMenuDropdown.prototype.render = function () {
  const { showHideTokenConfirmationModal } = this.props
  const { address, protocol, protocolData } = this.props.token

  // Set protocol specific token data
  let explorerUrl, tokenId
  if (protocol === 'slp') {
    explorerUrl = `https://explorer.bitcoin.com/bch/tx/${address}`
    tokenId = address
  }

  return h(Menu, { className: 'token-menu-dropdown', isShowing: true }, [
    h(CloseArea, {
      onClick: this.onClose,
    }),
    // TODO: hide token
    // h(Item, {
    //   onClick: (e) => {
    //     e.stopPropagation()
    //     showHideTokenConfirmationModal(this.props.token)
    //     this.props.onClose()
    //   },
    //   text: this.context.t('hideToken'),
    // }),
    h(Item, {
      onClick: e => {
        e.stopPropagation()
        copyToClipboard(tokenId)
        this.props.onClose()
      },
      text: this.context.t('copyContractAddress'),
    }),
    h(Item, {
      onClick: e => {
        e.stopPropagation()
        global.platform.openWindow({ url: explorerUrl })
        this.props.onClose()
      },
      text: this.context.t('viewOnEtherscan'),
    }),
  ])
}
