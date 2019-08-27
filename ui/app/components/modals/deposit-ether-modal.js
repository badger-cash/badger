const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../actions')
const {
  getNetworkDisplayName,
} = require('../../../../app/scripts/controllers/network/util')
const ShapeshiftForm = require('../shapeshift-form')

import Button from '../button'

let DIRECT_DEPOSIT_ROW_TITLE
let DIRECT_DEPOSIT_ROW_TEXT
let BUY_ROW_TITLE
let BUY_ROW_TEXT
let FAUCET_ROW_TITLE

function mapStateToProps(state) {
  return {
    network: state.metamask.network,
    address: state.metamask.selectedAddress,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    toBuyBch: address => {
      dispatch(actions.buyEth({ network: '1', address, amount: 0 }))
    },
    hideModal: () => {
      dispatch(actions.hideModal())
    },
    hideWarning: () => {
      dispatch(actions.hideWarning())
    },
    showAccountDetailModal: () => {
      dispatch(actions.showModal({ name: 'ACCOUNT_DETAILS' }))
    },
    toFaucet: network => dispatch(actions.buyEth({ network: '3' })),
  }
}

inherits(DepositEtherModal, Component)
function DepositEtherModal(props, context) {
  Component.call(this)

  // need to set after i18n locale has loaded
  DIRECT_DEPOSIT_ROW_TITLE = context.t('directDepositEther')
  DIRECT_DEPOSIT_ROW_TEXT = context.t('directDepositEtherExplainer')
  BUY_ROW_TITLE = 'Buy on Bitcoin.com'
  BUY_ROW_TEXT = 'Start buying Bitcoin Cash (BCH) with your credit card today!'
  FAUCET_ROW_TITLE = context.t('testFaucet')

  this.state = {
    buyingWithShapeshift: false,
  }
}

DepositEtherModal.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(DepositEtherModal)

DepositEtherModal.prototype.facuetRowText = function(networkName) {
  return this.context.t('getEtherFromFaucet', [networkName])
}

DepositEtherModal.prototype.renderRow = function({
  logo,
  title,
  text,
  buttonLabel,
  onButtonClick,
  hide,
  className,
  hideButton,
  hideTitle,
  onBackClick,
  showBackButton,
}) {
  if (hide) {
    return null
  }

  return h(
    'div',
    {
      className: className || 'deposit-ether-modal__buy-row',
    },
    [
      onBackClick &&
        showBackButton &&
        h(
          'div.deposit-ether-modal__buy-row__back',
          {
            onClick: onBackClick,
          },
          [h('i.fa.fa-arrow-left.cursor-pointer')]
        ),

      h('div.deposit-ether-modal__buy-row__logo-container', [logo]),

      h('div.deposit-ether-modal__buy-row__description', [
        !hideTitle &&
          h('div.deposit-ether-modal__buy-row__description__title', [title]),

        h('div.deposit-ether-modal__buy-row__description__text', [text]),
      ]),

      !hideButton &&
        h('div.deposit-ether-modal__buy-row__button', [
          h(
            Button,
            {
              type: 'primary',
              className: 'deposit-ether-modal__deposit-button',
              large: true,
              onClick: onButtonClick,
            },
            [buttonLabel]
          ),
        ]),
    ]
  )
}

DepositEtherModal.prototype.render = function() {
  const { network, toBuyBch, address, toFaucet } = this.props
  // const { buyingWithShapeshift } = this.state
  const buyingWithShapeshift = false

  const isTestNetwork = ['3', '4', '42'].find(n => n === network)
  const networkName = getNetworkDisplayName(network)

  return h(
    'div.page-container.page-container--full-width.page-container--full-height',
    {},
    [
      h('div.page-container__header', [
        h('div.page-container__title', [this.context.t('depositEther')]),

        h('div.page-container__subtitle', [
          this.context.t('needEtherInWallet'),
        ]),

        h('div.page-container__header-close', {
          onClick: () => {
            this.setState({ buyingWithShapeshift: false })
            this.props.hideWarning()
            this.props.hideModal()
          },
        }),
      ]),

      h('.page-container__content', {}, [
        h('div.deposit-ether-modal__buy-rows', [
          this.renderRow({
            logo: h('img.deposit-ether-modal__logo', {
              src: './images/bch_logo.svg',
            }),
            title: DIRECT_DEPOSIT_ROW_TITLE,
            text: DIRECT_DEPOSIT_ROW_TEXT,
            buttonLabel: this.context.t('viewAccount'),
            onButtonClick: () => this.goToAccountDetailsModal(),
            hide: buyingWithShapeshift,
          }),

          this.renderRow({
            logo: h('i.fa.fa-tint.fa-2x'),
            title: FAUCET_ROW_TITLE,
            text: this.facuetRowText(networkName),
            buttonLabel: this.context.t('getBitcoinCash'),
            onButtonClick: () => toFaucet(network),
            hide: buyingWithShapeshift,
          }),

          this.renderRow({
            logo: h('div.deposit-ether-modal__logo', {
              style: {
                backgroundImage: "url('./images/bitcoin-com-logo.png')",
                height: '40px',
              },
            }),
            title: BUY_ROW_TITLE,
            text: BUY_ROW_TEXT,
            buttonLabel: 'CONTINUE TO BUY.BITCOIN.COM',
            onButtonClick: () => toBuyBch(address),
            hide: isTestNetwork || buyingWithShapeshift,
          }),

          buyingWithShapeshift && h(ShapeshiftForm),
        ]),
      ]),
    ]
  )
}

DepositEtherModal.prototype.goToAccountDetailsModal = function() {
  this.props.hideWarning()
  this.props.hideModal()
  this.props.showAccountDetailModal()
}
