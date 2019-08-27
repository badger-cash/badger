import React from 'react'
const { Component } = require('react')
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const { NOTICE_ROUTE } = require('../../../routes')

class Info extends Component {
  constructor (props) {
    super(props)

    this.state = {
      version: global.platform.getVersion(),
    }
  }

  renderLogo () {
    return (
      <div className="settings__info-logo-wrapper">
        <img className="settings__info-logo" src="images/icon-512.png" />
      </div>
    )
  }

  renderInfoLinks () {
    return (
      <div className="settings__content-item settings__content-item--without-height">
        <div className="settings__info-link-header">
          {this.context.t('links')}
        </div>
        <div className="settings__info-link-item">
          <a href="https://www.bitcoin.com/privacy-policy" target="_blank">
            <span className="settings__info-link">
              {this.context.t('privacyMsg')}
            </span>
          </a>
          <br />
          <br />
          <a>
            <span
              onClick={() => {
                this.props.history.push(NOTICE_ROUTE)
              }}
              className="settings__info-link"
            >
              Terms of Service
            </span>
          </a>
        </div>
        <hr className="settings__info-separator" />
        <div className="settings__info-link-item">
          <a href="https://badger.bitcoin.com/" target="_blank">
            <span className="settings__info-link">
              {this.context.t('visitWebSite')}
            </span>
          </a>
        </div>
        <div className="settings__info-link-item">
          <a target="_blank" href="mailto:badger@bitcoin.com?subject=Feedback">
            <span className="settings__info-link">
              {this.context.t('emailUs')}
            </span>
          </a>
        </div>
        <div className="settings__info-link-item">
          <a
            target="_blank"
            href="https://t.me/joinchat/IoTQ_hGflnfwd3YJSF8cRQ"
          >
            <span className="settings__info-link">Join our telegram</span>
          </a>
        </div>
      </div>
    )
  }

  render () {
    return (
      <div className="settings__content">
        <div className="settings__content-row">
          <div className="settings__content-item settings__content-item--without-height">
            {this.renderLogo()}
            <div className="settings__info-item">
              <div className="settings__info-version-header">
                Badger Version
              </div>
              <div className="settings__info-version-number">
                {this.state.version}
              </div>
            </div>
            <div className="settings__info-item">
              <div className="settings__info-about">
                {this.context.t('builtInCalifornia')}
              </div>
            </div>
          </div>
          {this.renderInfoLinks()}
        </div>
      </div>
    )
  }
}

Info.propTypes = {
  tab: PropTypes.string,
  metamask: PropTypes.object,
  setCurrentCurrency: PropTypes.func,
  setRpcTarget: PropTypes.func,
  displayWarning: PropTypes.func,
  revealSeedConfirmation: PropTypes.func,
  warning: PropTypes.string,
  location: PropTypes.object,
  history: PropTypes.object,
  t: PropTypes.func,
}

Info.contextTypes = {
  t: PropTypes.func,
}

module.exports = Info
