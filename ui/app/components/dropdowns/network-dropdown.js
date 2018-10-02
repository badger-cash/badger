const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const { withRouter } = require('react-router-dom')
const { compose } = require('recompose')
const actions = require('../../actions')
const Dropdown = require('./components/dropdown').Dropdown
const DropdownMenuItem = require('./components/dropdown').DropdownMenuItem
const NetworkDropdownIcon = require('./components/network-dropdown-icon')
const R = require('ramda')

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
]

function mapStateToProps (state) {
  return {
    provider: state.metamask.provider,
    frequentRpcList: state.metamask.frequentRpcList || [],
    networkDropdownOpen: state.appState.networkDropdownOpen,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    hideModal: () => {
      dispatch(actions.hideModal())
    },
    setProviderType: type => {
      dispatch(actions.setProviderType(type))
    },
    setDefaultRpcTarget: type => {
      dispatch(actions.setDefaultRpcTarget(type))
    },
    setRpcTarget: target => {
      dispatch(actions.setRpcTarget(target))
    },
    showNetworkDropdown: () => dispatch(actions.showNetworkDropdown()),
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
  }
}

inherits(NetworkDropdown, Component)
function NetworkDropdown () {
  Component.call(this)
}

NetworkDropdown.contextTypes = {
  t: PropTypes.func,
}

module.exports = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(NetworkDropdown)

// TODO: specify default props and proptypes
NetworkDropdown.prototype.render = function () {
  const props = this.props
  const {
    provider: { type: providerType, rpcTarget: activeNetwork },
  } = props
  const rpcList = props.frequentRpcList
  const isOpen = this.props.networkDropdownOpen
  const dropdownMenuItemStyle = {
    fontSize: '16px',
    lineHeight: '20px',
    padding: '12px 0',
  }

  return h(
    Dropdown,
    {
      isOpen,
      onClickOutside: event => {
        const { classList } = event.target
        const isInClassList = className => classList.contains(className)
        const notToggleElementIndex = R.findIndex(isInClassList)(
          notToggleElementClassnames
        )

        if (notToggleElementIndex === -1) {
          this.props.hideNetworkDropdown()
        }
      },
      containerClassName: 'network-droppo',
      zIndex: 55,
      style: {
        position: 'absolute',
        top: '58px',
        width: '309px',
        zIndex: '55px',
      },
      innerStyle: {
        padding: '18px 8px',
      },
    },
    [
      h('div.network-dropdown-header', {}, [
        h('div.network-dropdown-title', {}, this.context.t('networks')),

        h('div.network-dropdown-divider'),

        h('div.network-dropdown-content', {}, this.context.t('defaultNetwork')),
      ]),

      h(
        DropdownMenuItem,
        {
          key: 'main',
          closeMenu: () => this.props.hideNetworkDropdown(),
          onClick: () => props.setProviderType('mainnet'),
          style: { ...dropdownMenuItemStyle, borderColor: '#038789' },
        },
        [
          providerType === 'mainnet'
            ? h('i.fa.fa-check')
            : h('.network-check__transparent', '✓'),
          h(NetworkDropdownIcon, {
            backgroundColor: '#29B6AF', // $java
            isSelected: providerType === 'mainnet',
          }),
          h(
            'span.network-name-item',
            {
              style: {
                color: providerType === 'mainnet' ? '#ffffff' : '#9b9b9b',
              },
            },
            this.context.t('mainnet')
          ),
        ]
      ),
    ]
  )
}

NetworkDropdown.prototype.getNetworkName = function () {
  const { provider } = this.props
  const providerName = provider.type

  let name

  if (providerName === 'mainnet') {
    name = this.context.t('mainnet')
  }

  return name
}

NetworkDropdown.prototype.renderCommonRpc = function (rpcList, provider) {
  const props = this.props
  const reversedRpcList = rpcList.slice().reverse()

  return reversedRpcList.map(rpc => {
    const currentRpcTarget =
      provider.type === 'rpc' && rpc === provider.rpcTarget

    if (rpc === 'http://localhost:8545' || currentRpcTarget) {
      return null
    } else {
      return h(
        DropdownMenuItem,
        {
          key: `common${rpc}`,
          closeMenu: () => this.props.hideNetworkDropdown(),
          onClick: () => props.setRpcTarget(rpc),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          currentRpcTarget
            ? h('i.fa.fa-check')
            : h('.network-check__transparent', '✓'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h(
            'span.network-name-item',
            {
              style: {
                color: currentRpcTarget ? '#ffffff' : '#9b9b9b',
              },
            },
            rpc
          ),
        ]
      )
    }
  })
}

NetworkDropdown.prototype.renderCustomOption = function (provider) {
  const { rpcTarget, type } = provider
  const props = this.props

  if (type !== 'rpc') return null

  switch (rpcTarget) {
    case 'http://localhost:8545':
      return null

    default:
      return h(
        DropdownMenuItem,
        {
          key: rpcTarget,
          onClick: () => props.setRpcTarget(rpcTarget),
          closeMenu: () => this.props.hideNetworkDropdown(),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          h('i.fa.fa-check'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h(
            'span.network-name-item',
            {
              style: {
                color: '#ffffff',
              },
            },
            rpcTarget
          ),
        ]
      )
  }
}
