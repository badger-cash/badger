import { validateMnemonic } from 'bip39'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  createNewVaultAndRestore,
  unMarkPasswordForgotten,
} from '../../../actions'
import { DEFAULT_ROUTE } from '../../../routes'
import TextField from '../../text-field'
const BITBOX = require('bitbox-sdk').BITBOX
const bitbox = new BITBOX()

import Toggle from '../../../../../ui/app/components/toggle/toggle.component'

class RestoreVaultPage extends Component {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    warning: PropTypes.string,
    createNewVaultAndRestore: PropTypes.func.isRequired,
    leaveImportSeedScreenState: PropTypes.func,
    history: PropTypes.object,
    isLoading: PropTypes.bool,
  }

  state = {
    skipPassword: true,
    seedPhrase: '',
    password: '',
    confirmPassword: '',
    seedPhraseError: null,
    passwordError: null,
    confirmPasswordError: null,
  }

  toggleState = () => {
    this.setState({ skipPassword: !this.state.skipPassword })
  }

  parseSeedPhrase = seedPhrase => {
    return seedPhrase.match(/\w+/g).join(' ')
  }

  validateSeedPhrase = (seedPhrase, lang = 'english') => {
    const validated = bitbox.Mnemonic.validate(
      seedPhrase,
      bitbox.Mnemonic.wordLists()[lang]
    )
    return validated
  }

  handleSeedPhraseChange (seedPhrase) {
    let seedPhraseError = null

    if (seedPhrase) {
      if (!validateMnemonic(seedPhrase)) {
        seedPhraseError = this.validateSeedPhrase(seedPhrase)
      }
    }

    this.setState({ seedPhrase, seedPhraseError })
  }

  handlePasswordChange (password) {
    const { confirmPassword } = this.state
    let confirmPasswordError = null
    let passwordError = null

    if (password && password.length < 8) {
      passwordError = this.context.t('passwordNotLongEnough')
    }

    if (confirmPassword && password !== confirmPassword) {
      confirmPasswordError = this.context.t('passwordsDontMatch')
    }

    this.setState({ password, passwordError, confirmPasswordError })
  }

  handleConfirmPasswordChange (confirmPassword) {
    const { password } = this.state
    let confirmPasswordError = null

    if (password !== confirmPassword) {
      confirmPasswordError = this.context.t('passwordsDontMatch')
    }

    this.setState({ confirmPassword, confirmPasswordError })
  }

  onClick = disabled => {
    const { password, seedPhrase, skipPassword } = this.state

    if (!disabled || skipPassword) {
      const {
        createNewVaultAndRestore,
        leaveImportSeedScreenState,
        history,
      } = this.props

      leaveImportSeedScreenState()
      createNewVaultAndRestore(password, this.parseSeedPhrase(seedPhrase)).then(
        () => history.push(DEFAULT_ROUTE)
      )
    }
  }

  hasError () {
    const { passwordError, confirmPasswordError, seedPhraseError } = this.state
    return passwordError || confirmPasswordError || seedPhraseError
  }

  render () {
    const {
      seedPhrase,
      password,
      confirmPassword,
      seedPhraseError,
      passwordError,
      confirmPasswordError,
      skipPassword,
    } = this.state
    const { t } = this.context
    const { isLoading } = this.props
    const disabled =
      !seedPhrase ||
      !password ||
      !confirmPassword ||
      isLoading ||
      this.hasError()

    return (
      <div className="first-view-main-wrapper">
        <div className="first-view-main">
          <div className="import-account">
            <a
              className="import-account__back-button"
              onClick={e => {
                e.preventDefault()
                this.props.history.goBack()
              }}
              href="#"
            >
              {`< Back`}
            </a>
            <div className="import-account__title">
              {this.context.t('restoreAccountWithSeed')}
            </div>
            <div className="import-account__selector-label">
              {this.context.t('secretPhrase')}
            </div>
            <div className="import-account__input-wrapper">
              <label className="import-account__input-label">Wallet Seed</label>
              <textarea
                className="import-account__secret-phrase"
                onChange={e => this.handleSeedPhraseChange(e.target.value)}
                value={this.state.seedPhrase}
                placeholder={this.context.t('separateEachWord')}
              />
            </div>
            <span className="error">{seedPhraseError}</span>

            <div className="password">
              <h2> Do you want to protect this wallet with a Password?</h2>
              <div className="encrypt">
                <p>Encrypt</p>
                <Toggle toggleState={this.toggleState} />
              </div>
            </div>

            {!skipPassword && (
              <TextField
                id="password"
                label={t('newPassword')}
                type="password"
                className="first-time-flow__input"
                value={this.state.password}
                onChange={event =>
                  this.handlePasswordChange(event.target.value)
                }
                error={passwordError}
                autoComplete="new-password"
                margin="normal"
                largeLabel
              />
            )}

            {!skipPassword && (
              <TextField
                id="confirm-password"
                label={t('confirmPassword')}
                type="password"
                className="first-time-flow__input"
                value={this.state.confirmPassword}
                onChange={event =>
                  this.handleConfirmPasswordChange(event.target.value)
                }
                error={confirmPasswordError}
                autoComplete="confirm-password"
                margin="normal"
                largeLabel
              />
            )}
            <button
              className="first-time-flow__button"
              onClick={() => this.onClick(disabled)}
              disabled={
                skipPassword && seedPhraseError === null ? !disabled : disabled
              }
            >
              {this.context.t('restore')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

RestoreVaultPage.contextTypes = {
  t: PropTypes.func,
}

export default connect(
  ({ appState: { warning, isLoading } }) => ({ warning, isLoading }),
  dispatch => ({
    leaveImportSeedScreenState: () => {
      dispatch(unMarkPasswordForgotten())
    },
    createNewVaultAndRestore: (pw, seed) =>
      dispatch(createNewVaultAndRestore(pw, seed)),
  })
)(RestoreVaultPage)
