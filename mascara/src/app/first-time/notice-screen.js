import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Markdown from 'react-markdown'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import debounce from 'lodash.debounce'
import { markNoticeRead, checkUnencrypted } from '../../../../ui/app/actions'
import Identicon from '../../../../ui/app/components/identicon'
import Breadcrumbs from './breadcrumbs'
import { DEFAULT_ROUTE } from '../../../../ui/app/routes'
import LoadingScreen from './loading-screen'

class NoticeScreen extends Component {
  static propTypes = {
    address: PropTypes.string.isRequired,
    nextUnreadNotice: PropTypes.shape({
      title: PropTypes.string,
      date: PropTypes.string,
      body: PropTypes.string,
    }),
    location: PropTypes.shape({
      state: PropTypes.shape({
        next: PropTypes.func.isRequired,
      }),
    }),
    markNoticeRead: PropTypes.func,
    history: PropTypes.object,
    isLoading: PropTypes.bool,
    noActiveNotices: PropTypes.bool,
    checkUnencrypted: PropTypes.func,
  }

  static defaultProps = {
    nextUnreadNotice: {},
  }

  state = {
    atBottom: false,
  }

  componentDidMount () {
    this.props.checkUnencrypted()
    if (this.props.noActiveNotices) {
      this.props.history.push(DEFAULT_ROUTE)
    }
    // skip
    // this.onScroll()
    this.acceptTerms()
  }

  acceptTerms = () => {
    const { markNoticeRead, nextUnreadNotice, history } = this.props
    markNoticeRead(nextUnreadNotice).then(hasActiveNotices => {
      history.push(DEFAULT_ROUTE)
      // skip seed notice page
      // if (!hasActiveNotices) {
      //   alert('case 1')
      //   history.push(DEFAULT_ROUTE)
      // } else {
      //   alert('case 2')
      //   this.setState({ atBottom: false })
      //   this.onScroll()
      // }
    })
  }

  onScroll = debounce(() => {
    if (this.state.atBottom) return

    const target = document.querySelector('.tou__body')
    const { scrollTop, offsetHeight, scrollHeight } = target
    const atBottom = scrollTop + offsetHeight >= scrollHeight

    this.setState({ atBottom: atBottom })
  }, 25)

  render () {
    const {
      address,
      nextUnreadNotice: { title, body },
      isLoading,
    } = this.props
    const { atBottom } = this.state

    return isLoading ? (
      <LoadingScreen />
    ) : (
      <div className="first-time-flow">
        <div className="first-view-main-wrapper">
          <div className="first-view-main">
            <div className="tou" onScroll={this.onScroll}>
              <Identicon address={address} diameter={70} />
              <div className="tou__title">{title}</div>
              <Markdown className="tou__body markdown" source={body} skipHtml />
              <button
                className="first-time-flow__button"
                onClick={atBottom && this.acceptTerms}
                disabled={!atBottom}
              >
                Accept
              </button>
              <Breadcrumbs total={2} currentIndex={2} />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = ({ metamask, appState }) => {
  const { selectedAddress, nextUnreadNotice, noActiveNotices } = metamask
  const { isLoading } = appState

  return {
    address: selectedAddress,
    nextUnreadNotice,
    noActiveNotices,
    isLoading,
  }
}

export default compose(
  withRouter,
  connect(
    mapStateToProps,
    dispatch => ({
      markNoticeRead: notice => dispatch(markNoticeRead(notice)),
      checkUnencrypted: () => dispatch(checkUnencrypted()),
    })
  )
)(NoticeScreen)
