import React from 'react'

const Component = require('react').Component
const inherits = require('util').inherits
const {
  conversionUtil,
  multiplyCurrencies,
} = require('../../../conversion-util')
const { removeLeadingZeroes } = require('../send.utils')
const currencyFormatter = require('currency-formatter')
const currencies = require('currency-formatter/currencies')
const PropTypes = require('prop-types')
// import { formatTokenAmount } from '../../../helpers/formatter-numbers.util'
import TokenList from '../../pages/add-token/token-list/token-list.container'

export default class CurrencyDisplay extends Component {
  static propTypes = {
    calculateTxFee: PropTypes.func,
    updateSendAmount: PropTypes.func,
    setMaxModeTo: PropTypes.func,
  }

  static contextTypes = { t: PropTypes.func }

  state = {
    swapCurrency: false,
    valueToRender: '',
    swappedValueToRender: '',
    inputValue: '',
  }

  componentWillMount = () => {
    this.setState({
      valueToRender: this.getValueToRender(this.props),
    })
  }

  componentWillReceiveProps = nextProps => {
    const currentValueToRender = this.getValueToRender(this.props)
    const newValueToRender = this.getValueToRender(nextProps)
    const { swapCurrency } = this.state

    if (swapCurrency) {
      const usdValue = conversionUtil(newValueToRender, {
        fromNumericBase: 'dec',
        fromCurrency: this.props.primaryCurrency,
        toCurrency: this.props.convertedCurrency,
        numberOfDecimals: 2,
        conversionRate: this.props.conversionRate,
      })

      this.handleChangeSwap(usdValue)
    }

    if (currentValueToRender !== newValueToRender) {
      this.setState({
        valueToRender: newValueToRender,
      })
    }
  }

  getAmount = value => {
    const { selectedToken } = this.props
    if (selectedToken) return value

    const { decimals } = selectedToken || {}
    const multiplier = Math.pow(10, Number(decimals || 8))

    const sendAmount = multiplyCurrencies(value || '0', multiplier)

    return sendAmount.toString()
  }

  getValueToRender = ({ selectedToken, conversionRate, value, readOnly }) => {
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

  getConvertedValueToRender = nonFormattedValue => {
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

  getBCHValue = value => {
    const { conversionRate } = this.props
    const swappedValue = value / conversionRate

    return Number(swappedValue).toFixed(8)
  }

  handleChange = newVal => {
    this.setState({
      valueToRender: removeLeadingZeroes(newVal),
    })

    this.props.onChange(this.getAmount(newVal))
  }

  handleChangeSwap = newVal => {
    const {
      primaryCurrency,
      convertedCurrency,
      conversionRate,
      updateSendAmount,
    } = this.props

    const bchValue = this.getBCHValue(newVal)
    updateSendAmount(this.getAmount(bchValue))

    if (
      conversionRate === 0 ||
      conversionRate === null ||
      conversionRate === undefined
    ) {
      if (newVal !== 0) {
        return null
      }
    }

    let usdValue = conversionUtil(bchValue, {
      fromNumericBase: 'dec',
      fromCurrency: primaryCurrency,
      toCurrency: convertedCurrency,
      numberOfDecimals: 2,
      conversionRate,
    })
    usdValue = Number(usdValue).toFixed(2)

    const formattedValue = currencies.find(
      currency => currency.code === convertedCurrency.toUpperCase()
    )
      ? currencyFormatter.format(Number(usdValue), {
          code: convertedCurrency.toUpperCase(),
        })
      : usdValue

    this.setState({
      swappedValueToRender: bchValue,
      formattedValue,
      inputValue: newVal,
    })
  }

  onlyRenderConversions = convertedValueToRender => {
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

  getInputWidth = (valueToRender, readOnly) => {
    const valueString = String(valueToRender)
    const valueLength = valueString.length || 1
    const decimalPointDeficit = valueString.match(/\./) ? -0.5 : 0
    return valueLength + decimalPointDeficit + 0.75 + 'ch'
  }

  handleSwap = () => {
    const { swapCurrency } = this.state
    const { setMaxModeTo } = this.props

    setMaxModeTo(false)

    // prevent accident values
    this.handleChange('0')

    this.setState({
      swapCurrency: !swapCurrency,
      swappedValueToRender: '',
      formattedValue: '',
      inputValue: '',
    })
  }

  bchInput = () => {
    const {
      primaryBalanceClassName = 'currency-display__input',
      primaryCurrency,
      readOnly = false,
      onBlur,
      step,
    } = this.props
    const { valueToRender } = this.state

    return (
      <div>
        <input
          className={primaryBalanceClassName}
          value={`${valueToRender}`}
          placeholder="0"
          readOnly={readOnly}
          {...(!readOnly
            ? {
                onChange: e => {
                  this.handleChange(e.target.value)
                },
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
    )
  }

  swapInput = () => {
    const {
      primaryBalanceClassName = 'currency-display__input',
      convertedCurrency,
      updateSendAmount,
    } = this.props

    const upperCaseCurrencyCode = convertedCurrency.toUpperCase()

    const { inputValue, formattedValue, swappedValueToRender } = this.state

    return (
      <div>
        <input
          className={primaryBalanceClassName}
          onChange={e => {
            this.handleChangeSwap(e.target.value)
          }}
          onBlur={() => {
            updateSendAmount(this.getAmount(swappedValueToRender))
          }}
          placeholder={`0 ${upperCaseCurrencyCode}`}
          value={inputValue}
          style={{ maxWidth: '80px' }}
        />
        {inputValue && (
          <span>
            {formattedValue} {upperCaseCurrencyCode}
          </span>
        )}
      </div>
    )
  }
  render() {
    const {
      className = 'currency-display',
      inError = false,
      convertedCurrency,
    } = this.props

    let { primaryCurrency, swap } = this.props

    const { valueToRender, swapCurrency, swappedValueToRender } = this.state

    let convertedValueToRender = this.getConvertedValueToRender(valueToRender)

    const { selectedToken } = this.props
    if (selectedToken) {
      primaryCurrency = selectedToken.symbol
      convertedValueToRender = null
      swap = false
    }

    return (
      <div>
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
              {!swapCurrency ? this.bchInput() : this.swapInput()}
            </div>
          </div>

          {!swapCurrency
            ? this.onlyRenderConversions(convertedValueToRender)
            : `${swappedValueToRender} ${primaryCurrency}`}
        </div>
        {swap && (
          <div
            className="swap-currency"
            onClick={() => {
              this.handleSwap()
            }}
          >
            <img src="/images/swap-currency.svg" />
            <p className="swap">
              {!swapCurrency ? convertedCurrency : primaryCurrency}
            </p>
          </div>
        )}
      </div>
    )
  }
}
