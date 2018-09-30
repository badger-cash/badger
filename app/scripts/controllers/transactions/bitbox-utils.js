const log = require('loglevel')
const BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default
const BITBOX = new BITBOXCli()

class BitboxUtils {
  static async getUtxo(address) {
    return new Promise((resolve, reject) => {
        BITBOX.Address.utxo(address).then((result) => {
            try {
                const utxo = result.sort((a, b) => { return a.satoshis - b.satoshis })[result.length - 1]
                resolve(utxo)
            } catch (ex) { reject(ex) }
        }, (err) => {
            console.log(err)
            reject(err)
        })
    })
  }

  static async getAllUtxo(address) {
      return new Promise((resolve, reject) => {
          BITBOX.Address.utxo(address).then((result) => {
              resolve(result)
          }, (err) => {
              console.log(err)
              reject(err)
          })
      })
  }

  static async publishTx(hex) {
      return new Promise((resolve, reject) => {
          BITBOX.RawTransactions.sendRawTransaction(hex).then((result) => {
              try {
                  console.log("txid: ", result)
                  if (result.length !== 64) { // TODO: Validate result is a txid
                      reject("Transaction failed: " + result)
                  }
                  else {
                      resolve(result)
                  }
              } catch (ex) { reject(ex) }
          }, (err) => {
              console.log(err)
              reject(err)
          })
      })
  }

  static async signAndPublishTransaction (txParams, keyPair) {
    const from = txParams.from
    const to = txParams.to
    const satoshis = BITBOX.BitcoinCash.toSatoshi(txParams.value)

    const utxo = await this.getUtxo(from)

    const transactionBuilder = new BITBOX.TransactionBuilder('bitcoincash')
    transactionBuilder.addInput(utxo.txid, utxo.vout)

    // Calculate fee @ 1 sat/byte
    const byteCount = BITBOX.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2 })

    // Destination output    
    transactionBuilder.addOutput(to, satoshis)
    
    // Remaining balance output
    const satoshisRemaining = utxo.satoshis - satoshis - byteCount
    transactionBuilder.addOutput(from, satoshisRemaining)

    let redeemScript
    transactionBuilder.sign(0, keyPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, utxo.satoshis)

    const hex = transactionBuilder.build().toHex()

    // TODO: Handle failures: transaction already in blockchain, mempool length, networking
    return await this.publishTx(hex)
  }
}

module.exports = BitboxUtils
