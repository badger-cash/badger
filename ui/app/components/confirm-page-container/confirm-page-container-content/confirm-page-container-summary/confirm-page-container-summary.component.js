import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import Identicon from '../../../identicon'

const commaFormat = (text, subtitle) => {
  if (subtitle !== 'Simple Ledger Protocol') {
    return text
  }
  const split = text.split(' ')

  let decimalCount = split[0].split('.')

  decimalCount = decimalCount.length > 1 ? decimalCount[1].length : 0
  const number = parseFloat(split[0])
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimalCount,
  }).format(number)

  return `${formatted} ${split[1]}`
}

const ConfirmPageContainerSummary = props => {
  const {
    action,
    title,
    subtitle,
    hideSubtitle,
    className,
    identiconAddress,
    assetImage,
  } = props

  return (
    <div className={classnames('confirm-page-container-summary', className)}>
      <div className="confirm-page-container-summary__action-row">
        <div className="confirm-page-container-summary__action">{action}</div>
      </div>
      <div className="confirm-page-container-summary__title">
        {identiconAddress && (
          <Identicon
            className="confirm-page-container-summary__identicon"
            diameter={36}
            address={identiconAddress}
            image={assetImage}
          />
        )}
        <div className="confirm-page-container-summary__title-text">
          {commaFormat(title, subtitle)}
        </div>
      </div>
      {hideSubtitle || (
        <div className="confirm-page-container-summary__subtitle">
          {subtitle}
        </div>
      )}
    </div>
  )
}

ConfirmPageContainerSummary.propTypes = {
  action: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hideSubtitle: PropTypes.bool,
  className: PropTypes.string,
  identiconAddress: PropTypes.string,
  nonce: PropTypes.string,
  assetImage: PropTypes.string,
}

export default ConfirmPageContainerSummary
