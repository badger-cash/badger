import { connect } from 'react-redux'
import CurrencyDisplay from './currency-display.component'
import {
  getValueFromSatoshis,
  formatCurrency,
} from '../../helpers/confirm-transaction/util'

const mapStateToProps = (state, ownProps) => {
  const {
    value,
    numberOfDecimals = 8,
    currency,
    denomination,
    hideLabel,
    fromDenomination = 'SAT',
  } = ownProps
  const {
    metamask: { currentCurrency, conversionRate },
  } = state

  const toCurrency = currency || currentCurrency
  const convertedValue = getValueFromSatoshis({
    value,
    toCurrency,
    conversionRate,
    numberOfDecimals,
    toDenomination: denomination,
    fromDenomination: fromDenomination,
  })
  const formattedValue = formatCurrency(convertedValue, toCurrency)
  const displayValue = hideLabel
    ? formattedValue
    : `${formattedValue} ${toCurrency.toUpperCase()}`

  return {
    displayValue,
  }
}

export default connect(mapStateToProps)(CurrencyDisplay)
