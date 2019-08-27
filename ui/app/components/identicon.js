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
    '0b65cb8114afda4b29b6529563ba15520753a2c4b30601a612df3259c8c93f18',
    '497291b8a1dfe69c8daea50677a3d31a5ef0e9484d8bebb610dac64bbc202fb7',
    '4ac91a7245936cda41cfa616c342cbcd111a72a60bf37fdf8e556926cbaa7b28',
    '527a337f34e04b1974cb8a1edc7ca30b2e444bea111afc122259552243c1dbe3',
    '532fca8907107e199b89fa4b1691350edf595ee7d6fb3d053746e3b07cab568c',
    '805728012bc3349d1a05dc503aaf389c7a743917d7af6adfb844baff8ff2f89f',
    '8b1835b6c2efc7b60b354a084e3187e3ac9222e909c893510173810f18b7dcc8',
    '9bc6ac3f3df4511c9867beda788e92e1ca6d618e02d5cd96d36ecefff7c40e49',
    'adcf120f51d45056bc79353a2831ecd1843922b3d9fac5f109160bd2d49d3f4c',
    'd1b92f974f35051152627e5a3f23da527081f7c060c7b848899fcb0ea1f0957e',
    'd32b4191d3f78909f43a3f5853ba59e9f2d137925f28e7780e717f4b4bfd4a3f',
    'ec8d74d7d5793abb25b8c6391ca951e333523859bf2bbe6a4fd307a2385579d0',
    'f3680e0446d0b31a768a17a3182743a6582d03bcc975ba79282cad08f721b99d',
    '1074bafb678b85f90bca79fa201a26011e09bfc6f723b95c770c0850f8d44fe8',
    '631f98ea896e2001e1a77b34f7cf15ae50f844898223413937a95321205c',
    '7380843cd1089a1a01783f86af37734dc99667a1cdc577391b5f6ea42fc1bfb4',
    '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
    '918af9692eda8ea699d6938a7d87b1938bd9a2e421e2bafe41798b0915b2266a',
    '959a6818cba5af8aba391d3f7649f5f6a5ceb6cdcd2c2a3dcb5d2fbfc4b08e98.',
    'ad46c9d4db528865cef494e6a77ed5120df21d0a91f786aa0f41365568a444fb',
    'b4e1d771d1975528be616a5cdf23fccd9154981d0e231b52282952bb5d3521cd',
    'c1c5ad7c3d3871e4d584ea1e8cf8c4354a48c6cd374c78a80881b7ad635e6a21',
    'c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479',
    'f81e6d0a147006799597955e8bde1256f578436a9f55b1e475abd75ffb940a9d',
    'f8448bef6a4dd0d43272e69a795ba95d6198446b550de7120c35a9f4d5a80cc4',
    '6391445f8cdeca6f18dff1fa326b0ec40aba55c89864da27cc4645c4b44cfdb7',
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
