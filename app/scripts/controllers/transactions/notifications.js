class Notifications {
  getNotification (txMeta) {
    const notification = {}
    if (txMeta.status === 'failed') {
      notification.title = 'Failed transaction'
      notification.message = `More details`
      notification.url = 'https://explorer.bitcoin.com/faq/'
    } else if (txMeta.status === 'confirmed') {
      notification.title = 'Confirmed transaction'
      notification.message = `Transaction confirmed! View on Explorer`
      notification.url = `https://explorer.bitcoin.com/bch/tx/${txMeta.hash}`
    }
    return notification
  }
}

module.exports = Notifications
