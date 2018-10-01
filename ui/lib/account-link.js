module.exports = function (address, network) {
  const net = parseInt(network)
  let link
  switch (net) {
    case 1: // main net
      link = `https://explorer.bitcoin.com/bch/address/${address}`
      break
    case 2: // test net
      // TODO: Create testnet explorer
      link = `https://explorer.bitcoin.com/bch/address/${address}`
      break
    case 3: // test net
      link = `https://explorer.bitcoin.com/bch/address/${address}`
      break
    case 4: // test net
      link = `https://explorer.bitcoin.com/bch/address/${address}`
      break
    case 42: // test net
      link = `https://explorer.bitcoin.com/bch/address/${address}`
      break
    default:
      link = ''
      break
  }

  return link
}
