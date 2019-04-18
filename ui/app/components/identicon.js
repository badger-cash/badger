const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const isNode = require('detect-node')
const findDOMNode = require('react-dom').findDOMNode
const jazzicon = require('jazzicon')
const iconFactoryGen = require('../../lib/icon-factory')
const iconFactory = iconFactoryGen(jazzicon)
const { toDataUrl } = require('../../lib/blockies')

module.exports = connect(mapStateToProps)(IdenticonComponent)

inherits(IdenticonComponent, Component)
function IdenticonComponent () {
  Component.call(this)

  this.defaultDiameter = 46
}

function mapStateToProps (state) {
  return {
    useBlockie: state.metamask.useBlockie,
  }
}

IdenticonComponent.prototype.render = function () {
  var props = this.props
  const { className = '', address, image } = props
  var diameter = props.diameter || this.defaultDiameter
  const style = {
    height: diameter,
    width: diameter,
    borderRadius: diameter / 2,
  }
  const icons = [
    '49be89bbbe018bcfaebcb41cac8340bc555f022b47b922599e510b143603f4b6',
    '56ff58fd263736172f0b707c014ea8272d633cc0986b2ffb70e7e209bcc4adad',
    '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
    'fc7aa9a70b4ae86d30b93a98e853716a4217e77c60769f664da3c6189647d3ba',
    'f35007140e40c4b6ce4ecc9ad166101ad94562b3e4f650a30de10b8a80c0b987',
    'b5419ec4353979daba805cb897411a00b6ca81776d61a0d8c9b792e44a9821c1',
  ]
  let tmpImg
  if (icons.includes(address)) {
    tmpImg = `./images/${address}.png`
  } else {
    tmpImg = image
  }

  if (tmpImg) {
    return h('img', {
      className: `${className} identicon`,
      src: tmpImg,
      style: {
        ...style,
      },
    })
  } else if (address) {
    return h('div', {
      className: `${className} identicon`,
      key: 'identicon-' + address,
      style: {
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
        overflow: 'hidden',
      },
    })
  } else {
    return h('img.balance-icon', {
      className,
      // src: '../../../../node_modules/bch-token-icons/svg/icon/bch.svg',
      src: './images/bch_logo.svg',
      style: {
        ...style,
      },
    })
  }
}

IdenticonComponent.prototype.componentDidMount = function () {
  var props = this.props
  const { address, useBlockie } = props

  if (!address) return

  if (!isNode) {
    // eslint-disable-next-line react/no-find-dom-node
    var container = findDOMNode(this)

    const diameter = props.diameter || this.defaultDiameter

    if (useBlockie) {
      _generateBlockie(container, address, diameter)
    } else {
      _generateJazzicon(container, address, diameter)
    }
  }
}

IdenticonComponent.prototype.componentDidUpdate = function () {
  var props = this.props
  const { address, useBlockie } = props

  if (!address) return

  if (!isNode) {
    // eslint-disable-next-line react/no-find-dom-node
    var container = findDOMNode(this)

    var children = container.children
    for (var i = 0; i < children.length; i++) {
      container.removeChild(children[i])
    }

    const diameter = props.diameter || this.defaultDiameter

    if (useBlockie) {
      _generateBlockie(container, address, diameter)
    } else {
      _generateJazzicon(container, address, diameter)
    }
  }
}

function _generateBlockie (container, address, diameter) {
  const img = new Image()
  img.src = toDataUrl(address.slice(12))
  img.height = diameter
  img.width = diameter
  container.appendChild(img)
}

function _generateJazzicon (container, address, diameter) {
  const img = iconFactory.iconForAddress(address, diameter)
  container.appendChild(img)
}
