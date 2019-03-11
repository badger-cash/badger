import React, { Component } from 'react'
import PropTypes from 'prop-types'
import SendRowWrapper from '../send-row-wrapper/'
import EnsInput from '../../../ens-input'
import { getToErrorObject } from './send-to-row.utils.js'

const cashAccountRegex = /^([a-zA-Z0-9_]+)(#([0-9]+)(([0-9]+))).([0-9]+)?$/i
const cashAddrRegex = /^((bitcoincash:)?(q|p)[a-z0-9]{38,})$/gi
const slpRegex = /^((simpleledger:)?(q|p)[a-z0-9]{38,})$/gi

export default class SendToRow extends Component {
  static propTypes = {
    closeToDropdown: PropTypes.func,
    inError: PropTypes.bool,
    network: PropTypes.string,
    openToDropdown: PropTypes.func,
    to: PropTypes.string,
    toAccounts: PropTypes.array,
    toDropdownOpen: PropTypes.bool,
    updateSendTo: PropTypes.func,
    updateSendToError: PropTypes.func,
    scanQrCode: PropTypes.func,
    tokenContract: PropTypes.object,
    selectedToken: PropTypes.object,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  // immediate validation
  componentDidMount () {
    this.handleToChange('', '', '')
  }

  validateSLP (string) {
    return slpRegex.test(string)
  }

  validateBCH (string) {
    if (cashAccountRegex.test(string) || cashAddrRegex.test(string)) {
      return true
    }
    return false
  }

  handleToChange (to, nickname = '', toError) {

    const { updateSendTo, updateSendToError, selectedToken, tokenContract } = this.props
    let toErrorObject = getToErrorObject(to, toError)
    let valid

    if (selectedToken !== null && tokenContract !== null) {
      valid = this.validateSLP(to)
    } else {
      valid = this.validateBCH(to)
    }
    if (!valid) {
      toErrorObject = getToErrorObject(to, 'invalid')
    }

    updateSendTo(to, nickname)
    updateSendToError(toErrorObject)
    if (toErrorObject.to === null) {
      // updateGas({ to })
    }
  }

  render () {
    const {
      closeToDropdown,
      inError,
      network,
      openToDropdown,
      to,
      toAccounts,
      toDropdownOpen,
    } = this.props

    return (
      <SendRowWrapper
        errorType={'to'}
        label={`${this.context.t('to')}: `}
        showError={inError}
      >
        <EnsInput
          scanQrCode={_ => this.props.scanQrCode()}
          accounts={toAccounts}
          closeDropdown={() => closeToDropdown()}
          dropdownOpen={toDropdownOpen}
          inError={inError}
          name={'address'}
          network={network}
          onChange={({ toAddress, nickname, toError }) =>
            this.handleToChange(toAddress, nickname, toError)
          }
          openDropdown={() => openToDropdown()}
          placeholder={this.context.t('recipientAddress')}
          to={to}
        />
      </SendRowWrapper>
    )
  }
}
