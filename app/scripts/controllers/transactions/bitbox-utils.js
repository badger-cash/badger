const SLPSDK = require('slp-sdk')
const SLP = new SLPSDK()
const BITBOX = require('bitbox-sdk').BITBOX
const bitbox = new BITBOX()
const BigNumber = require('slpjs/node_modules/bignumber.js')
const slpjs = require('slpjs')
const SLPJS = new slpjs.Slp(SLP)
const PaymentProtocol = require('bitcore-payment-protocol')
const axios = require('axios')
const toBuffer = require('blob-to-buffer')

class BitboxUtils {
  static async getLargestUtxo (address) {
    return new Promise((resolve, reject) => {
      SLP.Address.utxo(address).then(
        result => {
          try {
            const utxo = result.utxos.sort((a, b) => {
              return a.satoshis - b.satoshis
            })[result.utxos.length - 1]
            resolve(utxo)
          } catch (ex) {
            reject(ex)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static async getAllUtxo (address) {
    return new Promise((resolve, reject) => {
      SLP.Address.utxo(address).then(
        result => {
          if (result && result.utxos && result.utxos.length) {
            const utxos = result.utxos.map(utxo => {
              utxo.scriptPubKey = result.scriptPubKey
              return utxo
            })
            resolve(utxos)
          } else {
            resolve(result.utxos)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static async getTransactionDetails (txid) {
    return new Promise((resolve, reject) => {
      SLP.Transaction.details(txid).then(
        result => {
          if (result) {
            resolve(result)
          } else {
            reject('Undefined transaction details for', txid)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static encodeOpReturn (dataArray) {
    const script = [SLP.Script.opcodes.OP_RETURN]
    dataArray.forEach(data => {
      if (typeof data === 'string' && data.substring(0, 2) === '0x') {
        script.push(Buffer.from(data.substring(2), 'hex'))
      } else {
        script.push(Buffer.from(data))
      }
    })
    return SLP.Script.encode(script)
  }

  static async publishTx (hex) {
    return new Promise((resolve, reject) => {
      SLP.RawTransactions.sendRawTransaction(hex).then(
        result => {
          try {
            if (result.length !== 64) {
              reject(result)
            } else {
              resolve(result)
            }
          } catch (ex) {
            reject(ex)
          }
        },
        err => {
          if (err.error) {
            reject(err.error)
          } else {
            reject(err)
          }
        }
      )
    })
  }

  static signAndPublishBchTransaction (txParams, spendableUtxos) {
    return new Promise(async (resolve, reject) => {
      try {
        const from = txParams.from
        const to = txParams.to
        const satoshisToSend = parseInt(txParams.value)

        if (!spendableUtxos || spendableUtxos.length === 0) {
          throw new Error('Insufficient funds')
        }

        // Calculate fee
        let byteCount = 0
        const sortedSpendableUtxos = spendableUtxos.sort((a, b) => {
          return b.satoshis - a.satoshis
        })
        const inputUtxos = []
        let totalUtxoAmount = 0
        const transactionBuilder = new bitbox.TransactionBuilder('mainnet')
        for (const utxo of sortedSpendableUtxos) {
          if (utxo.spendable !== true) {
            throw new Error('Cannot spend unspendable utxo')
          }
          transactionBuilder.addInput(utxo.txid, utxo.vout)
          totalUtxoAmount += utxo.satoshis
          inputUtxos.push(utxo)

          byteCount = bitbox.BitcoinCash.getByteCount(
            { P2PKH: inputUtxos.length },
            { P2PKH: 2 }
          )
          if (txParams.opReturn) {
            byteCount +=
              this.encodeOpReturn(txParams.opReturn.data).byteLength + 10
          }

          if (totalUtxoAmount >= byteCount + satoshisToSend) {
            break
          }
        }

        const satoshisRemaining = totalUtxoAmount - byteCount - satoshisToSend

        // Verify sufficient fee
        if (satoshisRemaining < 0) {
          throw new Error(
            'Not enough Bitcoin Cash for fee. Deposit a small amount and try again.'
          )
        }

        const isCashAccountRegistration =
          txParams.isCashAccountRegistration !== undefined &&
          txParams.isCashAccountRegistration

        if (isCashAccountRegistration) {
          // Op Return
          // TODO: Allow dev to pass in "position" property for vout of opReturn
          if (txParams.opReturn) {
            const encodedOpReturn = this.encodeOpReturn(txParams.opReturn.data)
            transactionBuilder.addOutput(encodedOpReturn, 0)
          }
        }

        // Destination output
        transactionBuilder.addOutput(to, satoshisToSend)

        if (!isCashAccountRegistration) {
          // Op Return
          // TODO: Allow dev to pass in "position" property for vout of opReturn
          if (txParams.opReturn) {
            const encodedOpReturn = this.encodeOpReturn(txParams.opReturn.data)
            transactionBuilder.addOutput(encodedOpReturn, 0)
          }
        }

        // Return remaining balance output
        if (satoshisRemaining >= 546) {
          transactionBuilder.addOutput(from, satoshisRemaining)
        }

        let redeemScript
        inputUtxos.forEach((utxo, index) => {
          transactionBuilder.sign(
            index,
            utxo.keyPair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            utxo.satoshis
          )
        })

        const hex = transactionBuilder.build().toHex()

        // TODO: Handle failures: transaction already in blockchain, mempool length, networking
        const txid = await this.publishTx(hex)
        resolve(txid)
      } catch (err) {
        reject(err)
      }
    })
  }

  static txidFromHex (hex) {
    const buffer = Buffer.from(hex, 'hex')
    const hash = SLP.Crypto.hash256(buffer).toString('hex')
    const txid = hash
      .match(/[a-fA-F0-9]{2}/g)
      .reverse()
      .join('')
    return txid
  }

  // TODO: Payment requests
  static decodePaymentResponse(responseData) {
    return new Promise((resolve, reject) => {
      toBuffer(responseData, function(err, buffer) {
        if (err) reject(err)

        try {
          const responseBody = PaymentProtocol.PaymentACK.decode(buffer)
          const responseAck = new PaymentProtocol().makePaymentACK(responseBody)
          const responseSerializedPayment = responseAck.get('payment')
          const responseDecodedPayment = PaymentProtocol.Payment.decode(
            responseSerializedPayment
          )
          const responsePayment = new PaymentProtocol().makePayment(
            responseDecodedPayment
          )
          const txHex = responsePayment.message.transactions[0].toHex()
          resolve(txHex)
        } catch (ex) {
          reject(ex)
        }
      })
    })
  }

  static signAndPublishPaymentRequestTransaction(
    txParams,
    keyPair,
    spendableUtxos
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const from = txParams.from
        const satoshisToSend = parseInt(txParams.value)

        if (!spendableUtxos || spendableUtxos.length === 0) {
          throw new Error('Insufficient funds')
        }

        // Calculate fee
        let byteCount = 0
        const sortedSpendableUtxos = spendableUtxos.sort((a, b) => {
          return b.satoshis - a.satoshis
        })
        const inputUtxos = []
        let totalUtxoAmount = 0
        const transactionBuilder = new SLP.TransactionBuilder('mainnet')
        for (const utxo of sortedSpendableUtxos) {
          if (utxo.spendable !== true) {
            throw new Error('Cannot spend unspendable utxo')
          }
          transactionBuilder.addInput(utxo.txid, utxo.vout)
          totalUtxoAmount += utxo.satoshis
          inputUtxos.push(utxo)

          byteCount = SLP.BitcoinCash.getByteCount(
            { P2PKH: inputUtxos.length },
            { P2PKH: txParams.paymentData.outputs.length + 1 }
          )

          if (totalUtxoAmount >= byteCount + satoshisToSend) {
            break
          }
        }

        const satoshisRemaining = totalUtxoAmount - byteCount - satoshisToSend

        // Verify sufficient fee
        if (satoshisRemaining < 0) {
          throw new Error(
            'Not enough Bitcoin Cash for fee. Deposit a small amount and try again.'
          )
        }

        // Destination outputs
        for (const output of txParams.paymentData.outputs) {
          transactionBuilder.addOutput(
            Buffer.from(output.script, 'hex'),
            output.amount
          )
        }

        // Return remaining balance output
        if (satoshisRemaining >= 546) {
          transactionBuilder.addOutput(from, satoshisRemaining)
        }

        let redeemScript
        inputUtxos.forEach((utxo, index) => {
          transactionBuilder.sign(
            index,
            utxo.keyPair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            utxo.satoshis
          )
        })

        const hex = transactionBuilder.build().toHex()

        // send the payment transaction
        var payment = new PaymentProtocol().makePayment()
        payment.set(
          'merchant_data',
          Buffer.from(txParams.paymentData.merchantData, 'utf-8')
        )
        payment.set('transactions', [Buffer.from(hex, 'hex')])

        // calculate refund script pubkey
        const refundPubkey = SLP.ECPair.toPublicKey(keyPair)
        const refundHash160 = SLP.Crypto.hash160(Buffer.from(refundPubkey))
        const refundScriptPubkey = SLP.Script.pubKeyHash.output.encode(
          Buffer.from(refundHash160, 'hex')
        )

        // define the refund outputs
        var refundOutputs = []
        var refundOutput = new PaymentProtocol().makeOutput()
        refundOutput.set('amount', 0)
        refundOutput.set('script', refundScriptPubkey)
        refundOutputs.push(refundOutput.message)
        payment.set('refund_to', refundOutputs)
        payment.set('memo', '')

        // serialize and send
        const rawbody = payment.serialize()
        const headers = {
          Accept:
            'application/bitcoincash-paymentrequest, application/bitcoincash-paymentack',
          'Content-Type': 'application/bitcoincash-payment',
          'Content-Transfer-Encoding': 'binary',
        }
        const response = await axios.post(
          txParams.paymentData.paymentUrl,
          rawbody,
          {
            headers,
            responseType: 'blob',
          }
        )

        const responseTxHex = await this.decodePaymentResponse(response.data)
        const txid = this.txidFromHex(responseTxHex)

        resolve(txid)
      } catch (err) {
        reject(err)
      }
    })
  }

  static signAndPublishSlpTransaction (
    txParams,
    spendableUtxos,
    tokenMetadata,
    spendableTokenUtxos,
    tokenChangeAddress
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const from = txParams.from
        // Get to addresses from payment request
        if(!txParams.to && txParams.paymentRequestUrl) {
          txParams.to = []
          let outputs = txParams.paymentData.outputs
          for(let i = 1; i < outputs.length; i++) {
            txParams.to.push(bitbox.Address.fromOutputScript(Buffer.from(outputs[i].script, 'hex')))
          }
        }
        const to = txParams.to
        const tokenDecimals = tokenMetadata.decimals
        const scaledTokenSendAmount = new BigNumber(
          txParams.value
        ).decimalPlaces(tokenDecimals)
        const tokenSendAmount = scaledTokenSendAmount.times(10 ** tokenDecimals)

        if (tokenSendAmount.lt(1)) {
          throw new Error(
            'Amount below minimum for this token. Increase the send amount and try again.'
          )
        }
        
        const sortedSpendableTokenUtxos = spendableTokenUtxos.sort((a, b) => {
          const aQuantity = new BigNumber(a.slp.quantity)
          const bQuantity = new BigNumber(b.slp.quantity)
          if (aQuantity.eq(bQuantity)) return 0
          else if (bQuantity.gt(aQuantity)) return 1
          else return -1
        })

        let tokenBalance = new BigNumber(0)
        const tokenUtxosToSpend = []
        for (const tokenUtxo of sortedSpendableTokenUtxos) {
          const utxoBalance = tokenUtxo.slp.quantity
          tokenBalance = tokenBalance.plus(utxoBalance)
          tokenUtxosToSpend.push(tokenUtxo)

          if (tokenBalance.gte(tokenSendAmount)) {
            break
          }
        }
        
        if (!tokenBalance.gte(tokenSendAmount)) {
          throw new Error('Insufficient tokens')
        }

        const tokenChangeAmount = tokenBalance.minus(tokenSendAmount)

        let sendOpReturn
        // Handle multi-output SLP
        let tokenSendArray = txParams.valueArray ? 
          txParams.valueArray.map(num => new BigNumber(num)) : [tokenSendAmount]

        if (tokenChangeAmount.isGreaterThan(0)) {
          tokenSendArray.push(tokenChangeAmount)
          sendOpReturn = SLPJS.buildSendOpReturn({
            tokenIdHex: txParams.sendTokenData.tokenId,
            outputQtyArray: tokenSendArray,
          })
        } else {
          sendOpReturn = SLPJS.buildSendOpReturn({
            tokenIdHex: txParams.sendTokenData.tokenId,
            outputQtyArray: tokenSendArray,
          })
        }

        const tokenReceiverAddressArray = Array.isArray(to) ? to.slice(0) : [to]
        if (tokenChangeAmount.isGreaterThan(0)) {
          tokenReceiverAddressArray.push(tokenChangeAddress)
        }

        const sortedSpendableUtxos = spendableUtxos.sort((a, b) => {
          return b.satoshis - a.satoshis
        })

        let byteCount = 0
        let inputSatoshis = 0
        const inputUtxos = tokenUtxosToSpend
        for (const utxo of sortedSpendableUtxos) {
          inputSatoshis = inputSatoshis + utxo.satoshis
          inputUtxos.push(utxo)

          byteCount = SLPJS.calculateSendCost(
            sendOpReturn.length,
            inputUtxos.length,
            tokenReceiverAddressArray.length + 1, // +1 to receive remaining BCH
            from
          )

          if (inputSatoshis >= byteCount) {
            break
          }
        }
        
        const transactionBuilder = new bitbox.TransactionBuilder('mainnet')
        let totalUtxoAmount = 0
        inputUtxos.forEach(utxo => {
          transactionBuilder.addInput(utxo.txid, utxo.vout)
          totalUtxoAmount += utxo.satoshis
        })

        const satoshisRemaining = totalUtxoAmount - byteCount

        // Verify sufficient fee
        if (satoshisRemaining < 0) {
          throw new Error(
            'Not enough Bitcoin Cash for fee. Deposit a small amount and try again.'
          )
        }
        
        // SLP data output
        transactionBuilder.addOutput(sendOpReturn, 0)
        
        // Token destination output
        if(to) {
          if(Array.isArray(to)) {
            for(const addr of to) {
              transactionBuilder.addOutput(addr, 546)
            }
          } else {
            transactionBuilder.addOutput(to, 546)
          }
        }

        // Return remaining token balance output
        if (tokenChangeAmount.isGreaterThan(0)) {
          transactionBuilder.addOutput(tokenChangeAddress, 546)
        }
        
        // Return remaining bch balance output
        transactionBuilder.addOutput(from, satoshisRemaining + 546)

        let redeemScript
        inputUtxos.forEach((utxo, index) => {
          transactionBuilder.sign(
            index,
            utxo.keyPair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            utxo.satoshis
          )
        })

        const hex = transactionBuilder.build().toHex()
        // Define txid
        var txid
        
        // Begin BIP70 SLP
        if (txParams.paymentRequestUrl) {
          // send the payment transaction
          var payment = new PaymentProtocol().makePayment()
          payment.set(
            'merchant_data',
            Buffer.from(txParams.paymentData.merchantData, 'utf-8')
          )
          payment.set('transactions', [Buffer.from(hex, 'hex')])

          // calculate refund script pubkey from change address
          //const refundPubkey = SLP.ECPair.toPublicKey(keyPair)
          //const refundHash160 = SLP.Crypto.hash160(Buffer.from(refundPubkey))
          const addressType = SLP.Address.detectAddressType(tokenChangeAddress)
          const addressFormat = SLP.Address.detectAddressFormat(tokenChangeAddress)
          var refundHash160 = SLP.Address.cashToHash160(tokenChangeAddress)
          var encodingFunc = SLP.Script.pubKeyHash.output.encode
          if (addressType == 'p2sh')
            encodingFunc = SLP.Script.scriptHash.output.encode
          if (addressFormat == 'legacy')
            refundHash160 = SLP.Address.legacyToHash160(tokenChangeAddress)
          const refundScriptPubkey = encodingFunc(
            Buffer.from(refundHash160, 'hex')
          )

          // define the refund outputs
          var refundOutputs = []
          var refundOutput = new PaymentProtocol().makeOutput()
          refundOutput.set('amount', 0)
          refundOutput.set('script', refundScriptPubkey)
          refundOutputs.push(refundOutput.message)
          payment.set('refund_to', refundOutputs)
          payment.set('memo', '')

          // serialize and send
          const rawbody = payment.serialize()
          const headers = {
            Accept:
              'application/simpleledger-paymentrequest, application/simpleledger-paymentack',
            'Content-Type': 'application/simpleledger-payment',
            'Content-Transfer-Encoding': 'binary',
          }
          const response = await axios.post(
            txParams.paymentData.paymentUrl,
            rawbody,
            {
              headers,
              responseType: 'blob',
            }
          )

          const responseTxHex = await this.decodePaymentResponse(response.data)
          txid = this.txidFromHex(responseTxHex)
        } else {
          // Standard SLP
          txid = await this.publishTx(hex)
        }

        resolve(txid)
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
  }
}

module.exports = BitboxUtils
