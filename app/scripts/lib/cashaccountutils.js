import localStorage from 'store'
const CashaccountClass = require('cashaccounts')
const cashaccount = new CashaccountClass()
const accounts = localStorage.get('cashaccounts')
const registrations = localStorage.get('cashaccount-registrations')

class CashAccountUtils {
  // persist identifer data to localstorage when registration is confirmed
  static async upsertAccounts () {
    if (registrations === undefined) {
      return
    }

    for (const each of registrations) {
      const account = await this.getIdentity(each.txid)

      if (account !== undefined) {
        account.txid = each.txid
        const exists = this.checkExistsAlready(each.txid)
        if (!exists) {
          this.saveAccount(account)
        }
      }
    }
  }

  // search cashaccounts by handle, and see if payment addresses belong to badger wallet
  static async getMatchingRegistration (
    username,
    selectedAddress,
    selectedSlpAddress
  ) {
    selectedSlpAddress = cashaccount.toSlpAddress(selectedSlpAddress)
    const results = await cashaccount.trustedSearch(username)

    for (const each of results) {
      const { payment } = each.information

      // can't import cashaccounts w/o token registration
      if (payment.length < 2) {
        return
      }

      const bchRegistration = payment[0].address
      const slpRegistration = payment[1].address

      if (
        selectedAddress === bchRegistration &&
        selectedSlpAddress === slpRegistration
      ) {
        return each
      }
    }
    return
  }

  // get identifier data for confirmed cashaccounts
  static async getIdentity (txid) {
    const parsed = await cashaccount.accountLookupViaTxid(txid)
    if (parsed === undefined) {
      return
    }
    const account = await cashaccount.parseBitdbObject(parsed)
    return account
  }

  // get identifier data for unconfirmed registration
  static async getPendingIdentity (txid) {
    const parsed = await cashaccount.registrationLookupViaTxid(txid)
    if (parsed === undefined) {
      return
    }

    const account = await cashaccount.parseBitdbObject(parsed)
    return account
  }

  // persist identity to localstorage
  static saveAccount (obj) {
    const array = accounts === undefined ? [] : accounts
    array.push(obj)
    localStorage.set('cashaccounts', array)
  }

  // persist registration txid
  static saveRegistration (obj) {
    const array = registrations === undefined ? [] : registrations
    array.push(obj)
    localStorage.set('cashaccount-registrations', array)
    return localStorage.get('cashaccount-registrations')
  }

  // used to limit to one registration per badger account
  static async checkIsRegistered (selectedAddress) {
    if (registrations === undefined) {
      return
    }

    for (const x of registrations) {
      const { txid } = x
      const account = await this.getPendingIdentity(txid)
      if (account === undefined) {
        return false
      }

      const bchRegistration = account.information.payment[0].address
      if (bchRegistration === selectedAddress) {
        return true
      } else {
        return false
      }
    }
  }

  static checkExistsAlready (txid) {
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

      return false
    }
  }

  // retrieve identifier object for associated wallet
  static getAccountByAddr (bchAddr, slpAddr) {
    if (slpAddr) {
      slpAddr = cashaccount.toSlpAddress(slpAddr)
    }
    if (accounts === undefined) {
      return
    }
    for (const x of accounts) {
      const { payment } = x.information
      const bchRegistration = payment[0].address
      const slpRegistration = payment[1].address

      if (bchRegistration === bchAddr) {
        return x
      }
    }
  }

  // used to get information on an unconfirmed account
  static async getRegistrationByAddr (bchAddr) {
    if (registrations === undefined) {
      return
    }
    for (const x of registrations) {
      const { txid } = x

      const account = await cashaccount.registrationLookupViaTxid(txid)

      if (account === undefined) {
        const confirmed = await this.getIdentity(txid)

        if (confirmed.information.payment[0].address === bchAddr) {
          return x
        } else {
          return
        }
      }

      const payment = await cashaccount.parsePaymentInfo(account.opreturn)

      const bchRegistration = payment[0].address
      if (bchRegistration === bchAddr) {
        return x
      }
    }
  }

  static upsertLocalStorage (key, value) {
    const existing = localStorage.get(key)
    const array = existing === undefined ? [] : existing
    array.push(value)
    return localStorage.set(key, array)
  }
}

module.exports = CashAccountUtils
