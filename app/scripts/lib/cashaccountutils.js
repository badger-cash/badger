import localStorage from 'store'
const cashaccount = require('cashaccounts')
const accounts = localStorage.get('cashaccounts')
const registrations = localStorage.get('cashaccount-registrations')

class CashAccountUtils {
  static async upsertAccounts () {
    for (const each of registrations) {
      const account = await this.getIdentity(each.txid)

      account.txid = each.txid

      const exists = this.checkExistsInStorageByTxid(each.txid)
      if (!exists) {
        this.saveAccount(account)
      }
    }
  }

  static async getIdentity (txid) {
    const parsed = await cashaccount.accountLookupViaTxid(txid)
    const account = await cashaccount.parseBitdbObject(parsed)
    return account
  }
  static saveAccount (obj) {
    const array = accounts === undefined ? [] : accounts

    array.push(obj)

    localStorage.set('cashaccounts', array)
  }
  static saveRegistration (obj) {
    const array = accounts === undefined ? [] : accounts

    array.push(obj)

    localStorage.set('cashaccount-registrations', array)
  }

  static async checkRegistrations (selectedAddress) {
    for (const x of registrations) {
      const { txid } = x
      const account = await this.getIdentity(txid)
      const bchRegistration = account.information.payment[0].address
      if (bchRegistration === selectedAddress) {
        return true
      } else {
        return false
      }
    }
  }
  static checkExistsInStorageByTxid (txid) {
    if (accounts !== undefined) {
      const match = accounts.find(x => x.txid === txid)
      return match
    }
    return false
  }
  static checkExistsInStorageByAddr (bchAddr, slpAddr) {
    if (slpAddr) {
      slpAddr = cashaccount.toSlpAddress(slpAddr)
    }

    if (accounts === undefined) {
      return false
    }
    for (const x of accounts) {
      const { payment } = x.information
      const bchRegistration = payment[0].address
      const slpRegistration = payment[1].address

      if (bchRegistration === bchAddr) {
        return true
      }

      // if (bchRegistration === bchAddr && slpRegistration === slpAddr) {
      //   return true
      // }
      return false
    }
  }
  static getAccountByAddr (bchAddr, slpAddr) {
    if (slpAddr) {
      slpAddr = cashaccount.toSlpAddress(slpAddr)
    }

    for (const x of accounts) {
      const { payment } = x.information
      const bchRegistration = payment[0].address
      const slpRegistration = payment[1].address

      if (bchRegistration === bchAddr) {
        return x
      }
      // if (bchRegistration === bchAddr && slpRegistration === slpAddr) {
      //   return x
      // }
    }
  }
}

module.exports = CashAccountUtils
