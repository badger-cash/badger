import EmojiList from './emoji_names.json'
import crypto from 'crypto'
const bchaddr = require('bchaddrjs-slp')
const axios = require('axios')
const bitcore = require('bitcore-lib-cash')

const genesis = 563620
// #15874 is first tokenaware registration

const baseUrl = 'https://api.cashaccount.info'

class CashAccount {
  /**
   * get the address for user's handle
   *
   * @static
   * @param {string} string - ie: jonathan#100
   * @returns {obj}
   * @memberof CashAccount
   */
  static async getAddressByCashAccount (string) {
    const split = string.split('#')

    const name = split[0]

    const number = split[1]
    const csplit = number.split('.')
    const url = `${baseUrl}/account/${csplit[0]}/${name}/${
      csplit.length === 2 ? csplit[1] : ''
    }`

    const data = await axios
      .get(url)
      .then(x => {
        return x.data
      })
      .catch(err => {
        console.log(err.response)
      })

    // console.log('data cashacount', data)
    return data
  }

  // in progress
  /**
   * register a cashAccount
   *
   * @static
   * @param {string} username - ie: jonathan
   * @param {string} bchAddress - ie: bitcoincash:qqqqqqq
   * @param {string} tokenAddress - ie: simpleledger:qqqqqqq
   * @returns {obj} hex and txid
   * @memberof CashAccount
   */
  static async registerCashAccount (username, bchAddress, tokenAddress) {
    const url = `${baseUrl}/register`
    const payments = [bchAddress]
    if (tokenAddress) {
      payments.push(tokenAddress)
    }
    // console.log('payments', payments)

    const data = {
      name: username,
      payments,
    }

    const resp = await axios
      .post(url, data)
      .then(x => {
        console.log('posted', x.data)
        return x.data
      })
      .catch(err => {
        console.log(err.response)
        return err
      })

    // console.log('resp cashacount', resp)
    return resp
  }

  static async getAccountInfo (string) {
    const split = string.split('#')
    const username = split[0]
    const number = split[1]

    let data = await this.accountLookupViaBitDB(username, number)

    if (!data.c.length && !data.u.length) {
      return {}
    }
    // take first confirmed
    data = data.c[0]

    const { opreturn, transactionhash, blockhash } = data
    const payment = await this.parsePaymentInfo(opreturn)

    const emoji = this.calculateEmoji(transactionhash, blockhash)

    const object = {
      identifier: `${username}#${number}`,
      information: {
        emoji: emoji,
        name: username,
        number: number,
        collision: { hash: '', count: 0, length: 0 },
        payment: payment,
      },
    }
    return object
  }

  static async test (txid) {
    let data = await this.accountLookupViaBitDBTxid(txid)
    console.log('data', data)
    return data

    data = data.c[0]

    const { opreturn, transactionhash, blockhash } = data
    const payment = await this.parsePaymentInfo(opreturn)
    return payment
  }

  /**
   * Parse cashaccount OPRETURN
   *
   * @static
   * @param {string} opreturn
   * @returns {object} match the output of cashaccount lookup server
   * @memberof CashAccount
   */
  static async parsePaymentInfo (opreturn) {
    // split[0] // OPRETURN
    // split[1] // protocol spec
    // split[2] // username
    // split[3] // first 2 chars = type, followed by BCH pubkey
    // split[4] // first 2 chars = type, followed by Token pubkey

    const split = opreturn.split(' ')
    const payment = []

    const bchPayment = this.determinePayment(split[3])
    payment.push(bchPayment)
    if (split.length >= 5) {
      const tokenPayment = this.determinePayment(split[4])
      tokenPayment.address = bchaddr.toSlpAddress(tokenPayment.address)
      payment.push(tokenPayment)
    }
    return payment
  }

  /**
   * Determine Payment info
   *
   * @static
   * @param {string} string chunk  of op return containing payment info
   * @returns {object}
   * {
   *   "type": "Key Hash",
   *   "address": "bitcoincash:qr4aadjrpu73d2wxwkxkcrt6gqxgu6a7usxfm96fst"
   * }
   * @memberof CashAccount
   */
  static determinePayment (string) {
    let type
    const identifier = string.substring(0, 2)
    switch (identifier) {
      case '01':
        type = 'Key Hash'
        break
      case '02':
        type = 'Script Hash'
        break
      case '03':
        type = 'Payment Code'
        break
      case '04':
        type = 'Stealth Keys'
        break
      case '81':
        type = 'Key Hash'
        break
      case '82':
        type = 'Script Hash'
        break
      case '83':
        type = 'Payment Code'
        break
      case '84':
        type = 'Stealth Keys'
        break
    }

    const hash = Buffer.from(string.substring(2), 'hex')
    const address = this.determineAddress(identifier, hash)

    return {
      type: type,
      address: address,
    }
  }

  static calculateEmoji (registrationtxid, blockhash) {
    blockhash = Buffer.from(blockhash, 'hex')
    registrationtxid = Buffer.from(registrationtxid, 'hex')

    const concat = Buffer.concat([blockhash, registrationtxid])
    const hash = crypto
      .createHash('sha256')
      .update(concat)
      .digest('hex')
    const last = hash.slice(-8)

    const decimalNotation = parseInt(last, 16)
    const modulus = decimalNotation % 100
    return EmojiList[modulus]
  }

  static determineAddress (identifier, hash) {
    let address

    switch (identifier) {
      case '01':
        address = new bitcore.Address(
          hash,
          'livenet',
          'pubkeyhash'
        ).toCashAddress()
        break

      case '02':
        address = new bitcore.Address(
          hash,
          'livenet',
          'scripthash'
        ).toCashAddress()
        break

      case '03':
        address = bitcore.encoding.Base58Check.encode(
          Buffer.concat([Buffer.from('47', 'hex'), hash])
        )
        break
      case '81':
        address = new bitcore.Address(
          hash,
          'livenet',
          'pubkeyhash'
        ).toCashAddress()
        break

      case '82':
        address = new bitcore.Address(
          hash,
          'livenet',
          'scripthash'
        ).toCashAddress()
        break

      case '83':
        address = bitcore.encoding.Base58Check.encode(
          Buffer.concat([Buffer.from('47', 'hex'), hash])
        )
        break
    }
    return address
  }

  static async accountLookupViaBitDB (username, number) {
    number = parseInt(number)
    const height = genesis + number

    const query = {
      v: 3,
      q: {
        find: {
          'out.h1': '01010101',
          'blk.i': height,
          'out.s2': { $regex: `^${username}`, $options: 'i' },
        },
        limit: 22,
      },
      r: {
        f:
          '[ .[] | { blockheight: .blk.i?, blockhash: .blk.h?, transactionhash: .tx.h?, opreturn: .out[0].str, name: .out[0].s2, data: .out[0].h3} ]',
      },
    }
    const urlString = this.bufferString(query)
    const response = await axios
      .get(`https://bitdb.bch.sx/q/${urlString}`)
      .catch(e => {
        console.error('err in getNumberofTxs', e)
      })
    console.log('bitdb response', response)
    return response.data
  }

  static async accountLookupViaBitDBTxid (txid) {
    const query = {
      v: 3,
      q: {
        find: {
          'tx.h': txid,
        },
        limit: 1,
      },
      r: {
        f:
          '[ .[] | { blockheight: .blk.i?, blockhash: .blk.h?, transactionhash: .tx.h?, opreturn: .out[0].str, name: .out[0].s2, data: .out[0].h3} ]',
      },
    }
    const urlString = this.bufferString(query)
    const response = await axios
      .get(`https://bitdb.bch.sx/q/${urlString}`)
      .catch(e => {
        console.error('err in getNumberofTxs', e)
      })
    console.log('bitdb response', response)
    return response.data.c
  }

  /**
   * check if cash account
   *
   * @static
   * @param {string} string - ie: jonathan#100
   * @returns {boolean}
   * @memberof CashAccount
   */
  static isCashAccount (string) {
    const cashAccountRegex = /^([a-zA-Z0-9_]+)(#([0-9]+)(([0-9]+))).([0-9]+)?$/i

    return cashAccountRegex.test(string)
  }

  /**
   * Buffer string for bitdb
   *
   * @param {object} query
   * @returns
   * @memberof CashAccount
   */
  static bufferString (query) {
    return Buffer.from(JSON.stringify(query)).toString('base64')
  }
}

module.exports = CashAccount
