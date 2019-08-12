import React from 'react'
const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const {
  conversionUtil,
  multiplyCurrencies,
} = require('../../../conversion-util')
const { removeLeadingZeroes } = require('../send.utils')
const currencyFormatter = require('currency-formatter')
const currencies = require('currency-formatter/currencies')
const ethUtil = require('ethereumjs-util')
const PropTypes = require('prop-types')
// import { formatTokenAmount } from '../../../helpers/formatter-numbers.util'
import TokenList from '../../pages/add-token/token-list/token-list.container'

CurrencyDisplay.contextTypes = {
  t: PropTypes.func,
}

module.exports = CurrencyDisplay

inherits(CurrencyDisplay, Component)
function CurrencyDisplay () {
  Component.call(this)
}

function toHexWei (value) {
  return conversionUtil(value, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    toDenomination: 'WEI',
  })
}

CurrencyDisplay.prototype.componentWillMount = function () {
  this.setState({
    valueToRender: this.getValueToRender(this.props),
  })
}

CurrencyDisplay.prototype.componentWillReceiveProps = function (nextProps) {
  const currentValueToRender = this.getValueToRender(this.props)
  const newValueToRender = this.getValueToRender(nextProps)
  if (currentValueToRender !== newValueToRender) {
    this.setState({
      valueToRender: newValueToRender,
    })
  }
}

CurrencyDisplay.prototype.getAmount = function (value) {
  const { selectedToken } = this.props
  if (selectedToken) return value

  const { decimals } = selectedToken || {}
  const multiplier = Math.pow(10, Number(decimals || 8))

  const sendAmount = multiplyCurrencies(value || '0', multiplier)

  return sendAmount.toString()

  // return selectedToken
  //   ? sendAmount
  //   : value
  // : toHexWei(value)
}

CurrencyDisplay.prototype.getValueToRender = function ({
  selectedToken,
  conversionRate,
  value,
  readOnly,
}) {
  if (value === '0') return readOnly ? '0' : ''
  const { decimals, symbol } = selectedToken || {}
  const multiplier = Math.pow(10, Number(decimals || 8))

  return selectedToken
    ? value
    : // TODO: Convert token balances when required
      // ? conversionUtil(value, {
      //   fromNumericBase: 'dec',
      //   toNumericBase: 'dec',
      //   toCurrency: symbol,
      //   conversionRate: multiplier,
      //   invertConversionRate: true,
      // })
      conversionUtil(value, {
        fromNumericBase: 'dec',
        toNumericBase: 'dec',
        fromDenomination: 'SAT',
        numberOfDecimals: 8,
        conversionRate,
      })
}

CurrencyDisplay.prototype.getConvertedValueToRender = function (
  nonFormattedValue
) {
  const { primaryCurrency, convertedCurrency, conversionRate } = this.props

  if (
    conversionRate === 0 ||
    conversionRate === null ||
    conversionRate === undefined
  ) {
    if (nonFormattedValue !== 0) {
      return null
    }
  }

  let convertedValue = conversionUtil(nonFormattedValue, {
    fromNumericBase: 'dec',
    fromCurrency: primaryCurrency,
    toCurrency: convertedCurrency,
    numberOfDecimals: 2,
    conversionRate,
  })

  convertedValue = Number(convertedValue).toFixed(2)
  const upperCaseCurrencyCode = convertedCurrency.toUpperCase()
  return currencies.find(currency => currency.code === upperCaseCurrencyCode)
    ? currencyFormatter.format(Number(convertedValue), {
        code: upperCaseCurrencyCode,
      })
    : convertedValue
}

CurrencyDisplay.prototype.handleChange = function (newVal) {
  this.setState({
    valueToRender: removeLeadingZeroes(newVal),
  })
  this.props.onChange(this.getAmount(newVal))
}

CurrencyDisplay.prototype.getInputWidth = function (valueToRender, readOnly) {
  const valueString = String(valueToRender)
  const valueLength = valueString.length || 1
  const decimalPointDeficit = valueString.match(/\./) ? -0.5 : 0
  return valueLength + decimalPointDeficit + 0.75 + 'ch'
}

CurrencyDisplay.prototype.onlyRenderConversions = function (
  convertedValueToRender
) {
  const {
    convertedBalanceClassName = 'currency-display__converted-value',
    convertedCurrency,
  } = this.props
  return (
    <div className={convertedBalanceClassName}>
      {convertedValueToRender == null
        ? this.context.t('noConversionRateAvailable')
        : `${convertedValueToRender} ${convertedCurrency.toUpperCase()}`}
    </div>
  )
}

CurrencyDisplay.prototype.render = function () {
  let {
    className = 'currency-display',
    primaryBalanceClassName = 'currency-display__input',
    primaryCurrency,
    readOnly = false,
    inError = false,
    onBlur,
    step,
    swap,
  } = this.props
  const { valueToRender } = this.state

  let convertedValueToRender = this.getConvertedValueToRender(valueToRender)

  const { selectedToken } = this.props
  if (selectedToken) {
    primaryCurrency = selectedToken.symbol
    convertedValueToRender = null
  }

  return (
    <div className="currency-display-fl">
      <div
        className={className}
        style={{
          borderColor: inError ? 'red' : null,
        }}
        onClick={() => {
          this.currencyInput && this.currencyInput.focus()
        }}
      >
        <div className="currency-display__primary-row">
          <div className="currency-display__input-wrapper">
            <input
              className={primaryBalanceClassName}
              value={`${valueToRender}`}
              placeholder="0"
              type="number"
              readOnly={readOnly}
              {...(!readOnly
                ? {
                    onChange: e => this.handleChange(e.target.value),
                    onBlur: () => onBlur(this.getAmount(valueToRender)),
                  }
                : {})}
              ref={input => {
                this.currencyInput = input
              }}
              style={{
                width: this.getInputWidth(valueToRender, readOnly),
              }}
              min={0}
              step={step}
            />
            <span className="currency-display__currency-symbol">
              {primaryCurrency}
            </span>
          </div>
        </div>

        {this.onlyRenderConversions(convertedValueToRender)}
      </div>
      {swap && (
        <div className="swap-currency">
          <img src="/images/swap-currency.svg" />
        </div>
      )}
    </div>
  )
}
