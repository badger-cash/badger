import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import { createNewVaultAndKeychain } from '../../../../ui/app/actions'
import Breadcrumbs from './breadcrumbs'
import EventEmitter from 'events'
import classnames from 'classnames'
import {
  INITIALIZE_UNIQUE_IMAGE_ROUTE,
  INITIALIZE_IMPORT_WITH_SEED_PHRASE_ROUTE,
  INITIALIZE_NOTICE_ROUTE,
} from '../../../../ui/app/routes'
import TextField from '../../../../ui/app/components/text-field'
import Toggle from '../../../../ui/app/components/toggle/toggle.component'

class CreatePasswordScreen extends Component {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    isLoading: PropTypes.bool.isRequired,
    createAccount: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    isInitialized: PropTypes.bool,
    isUnlocked: PropTypes.bool,
    isMascara: PropTypes.bool.isRequired,
  }

  state = {
    skipPassword: true,
    password: '',
    confirmPassword: '',
    passwordError: null,
    confirmPasswordError: null,
  }

  constructor (props) {
    super(props)
    this.animationEventEmitter = new EventEmitter()
  }

  componentWillMount () {
    const { isInitialized, history } = this.props

    if (isInitialized) {
      history.push(INITIALIZE_NOTICE_ROUTE)
    }
  }

  componentDidMount () {
    // skip
    this.byPassPassword()
  }

  isValid () {
    const { password, confirmPassword } = this.state

    if (!password || !confirmPassword) {
      return false
    }

    if (password.length < 8) {
      return false
    }

    return password === confirmPassword
  }

  createAccount = event => {
    event.preventDefault()

    if (!this.isValid()) {
      return
    }

    const { password } = this.state
    const { createAccount, history } = this.props

    this.setState({ isLoading: true })
    createAccount(password).then(() =>
      history.push(INITIALIZE_UNIQUE_IMAGE_ROUTE)
    )
  }

  byPassPassword = () => {
    const { createAccount, history } = this.props
    createAccount('').then(() => history.push(INITIALIZE_NOTICE_ROUTE))
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

  toggleState = () => {
    this.setState({ skipPassword: !this.state.skipPassword })
  }

  render () {
    const { history, isMascara } = this.props
    const {
      passwordError,
      confirmPasswordError,
      password,
      confirmPassword,
      skipPassword,
    } = this.state
    const { t } = this.context

    return (
      <div className={classnames({ 'first-view-main-wrapper': !isMascara })}>
        <div
          className={classnames({
            'first-view-main': !isMascara,
            'first-view-main__mascara': isMascara,
          })}
        >
          {isMascara && (
            <div className="mascara-info first-view-phone-invisible">
              <img
                className="app-header__metafox-logo app-header__metafox-logo--icon"
                src="/images/bch_logo.svg"
                height={225}
                width={225}
              />
              <div className="info">
                Badger is a secure identity vault for Bitcoin Cash.
              </div>
              <div className="info">
                It allows you to hold bitcoin cash & tokens, and interact with
                decentralized applications.
              </div>
            </div>
          )}

          <div className="password">
            <h2> Do you want to protect this wallet with a Password?</h2>
            <div className="encrypt">
              <p>Encrypt</p>
              <Toggle toggleState={this.toggleState} />
            </div>
          </div>

          <form className="create-password">
            {!skipPassword && (
              <div>
                <TextField
                  id="create-password"
                  label={t('newPassword')}
                  type="password"
                  className="first-time-flow__input"
                  value={password}
                  onChange={event =>
                    this.handlePasswordChange(event.target.value)
                  }
                  error={passwordError}
                  autoFocus
                  autoComplete="new-password"
                  margin="normal"
                  fullWidth
                  largeLabel
                />
                <TextField
                  id="confirm-password"
                  label={t('confirmPassword')}
                  type="password"
                  className="first-time-flow__input"
                  value={confirmPassword}
                  onChange={event =>
                    this.handleConfirmPasswordChange(event.target.value)
                  }
                  error={confirmPasswordError}
                  autoComplete="confirm-password"
                  margin="normal"
                  fullWidth
                  largeLabel
                />
                <button
                  className="first-time-flow__button"
                  disabled={!this.isValid()}
                  onClick={this.createAccount}
                >
                  Create
                </button>
              </div>
            )}

            {skipPassword && (
              <div className="proceed">
                <p>
                  Without encryption, there is one less layer of security if you
                  choose to proceed.
                </p>
                <button
                  className="first-time-flow__button"
                  onClick={this.byPassPassword}
                >
                  Proceed
                </button>
              </div>
            )}

            <div className="info">
              Advanced
              <hr />
              <a
                href=""
                className="first-time-flow__link create-password__import-link"
                onClick={e => {
                  e.preventDefault()
                  history.push(INITIALIZE_IMPORT_WITH_SEED_PHRASE_ROUTE)
                }}
              >
                Import with seed phrase
              </a>
            </div>
            {/* }
            <a
              href=""
              className="first-time-flow__link create-password__import-link"
              onClick={e => {
                e.preventDefault()
                history.push(INITIALIZE_IMPORT_ACCOUNT_ROUTE)
              }}
            >
              Import an account
            </a>
            { */}
            <Breadcrumbs total={3} currentIndex={0} />
          </form>
        </div>
      </div>
    )
  }
}

const mapStateToProps = ({ metamask, appState }) => {
  const { isInitialized, isUnlocked, isMascara, noActiveNotices } = metamask
  const { isLoading } = appState

  return {
    isLoading,
    isInitialized,
    isUnlocked,
    isMascara,
    noActiveNotices,
  }
}

export default compose(
  withRouter,
  connect(
    mapStateToProps,
    dispatch => ({
      createAccount: password => dispatch(createNewVaultAndKeychain(password)),
    })
  )
)(CreatePasswordScreen)
