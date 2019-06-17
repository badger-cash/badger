import React from 'react'
const { Component } = require('react')
const { connect } = require('react-redux')
const PropTypes = require('prop-types')
const ReactMarkdown = require('react-markdown')
const linker = require('extension-link-enabler')
const generateTermsOfService = require('../../../lib/termsofservice')
const findDOMNode = require('react-dom').findDOMNode
const actions = require('../../actions')
const { DEFAULT_ROUTE } = require('../../routes')

class Notice extends Component {
  constructor(props) {
    super(props)

    this.state = {
      disclaimerDisabled: true,
    }
  }

  componentWillMount() {
    // if (!this.props.notice) {
    //   this.props.history.push(DEFAULT_ROUTE)
    // }
  }

  componentDidMount() {
    // skip seed notice page
    // this.handleAccept()

    // eslint-disable-next-line react/no-find-dom-node
    var node = findDOMNode(this)
    linker.setupListener(node)
    if (document.getElementsByClassName('notice-box')[0].clientHeight < 310) {
      this.setState({
        disclaimerDisabled: false,
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.notice) {
      this.props.history.push(DEFAULT_ROUTE)
    }
  }

  componentWillUnmount() {
    // eslint-disable-next-line react/no-find-dom-node
    var node = findDOMNode(this)
    linker.teardownListener(node)
  }

  handleAccept() {
    this.props.history.push(DEFAULT_ROUTE)

    // this.setState({ disclaimerDisabled: true })
    // this.props.onConfirm()
  }

  render() {
    const { notice = {} } = this.props
    const { title, body } = notice
    const { disclaimerDisabled } = this.state

    return (
      <div
        className="flex-column flex-center flex-grow"
        style={{
          width: '100%',
        }}
      >
        <h3
          className="flex-center text-transform-uppercase terms-header"
          style={{
            background: '#EBEBEB',
            color: '#AEAEAE',
            width: '100%',
            fontSize: '20px',
            textAlign: 'center',
            padding: 6,
          }}
        >
          {title}
        </h3>
        <h5
          className="flex-center text-transform-uppercase terms-header"
          style={{
            background: '#EBEBEB',
            color: '#AEAEAE',
            marginBottom: 24,
            width: '100%',
            fontSize: '20px',
            textAlign: 'center',
            padding: 6,
          }}
        />
        <style>{`

          .markdown {
            overflow-x: hidden;
          }

          .markdown h1, .markdown h2, .markdown h3 {
            margin: 10px 0;
            font-weight: bold;
          }

          .markdown strong {
            font-weight: bold;
          }
          .markdown em {
            font-style: italic;
          }

          .markdown p {
            margin: 10px 0;
          }

          .markdown a {
            color: #2d7cc2;
          }

        `}</style>
        <div
          className="markdown"
          onScroll={e => {
            var object = e.currentTarget
            if (
              object.offsetHeight + object.scrollTop + 100 >=
              object.scrollHeight
            ) {
              this.setState({ disclaimerDisabled: false })
            }
          }}
          style={{
            background: 'rgb(235, 235, 235)',
            height: '310px',
            padding: '6px',
            width: '90%',
            overflowY: 'scroll',
            scroll: 'auto',
          }}
        >
          <ReactMarkdown className="notice-box" source={body} skipHtml={true} />
        </div>
        <button
          className="primary"
          disabled={disclaimerDisabled}
          onClick={() => this.handleAccept()}
          style={{
            marginTop: '18px',
          }}
        >
          Accept
        </button>
      </div>
    )
  }
}

const mapStateToProps = state => {
  const { metamask } = state
  const { noActiveNotices, nextUnreadNotice } = metamask

  return {
    noActiveNotices,
    nextUnreadNotice,
  }
}

Notice.propTypes = {
  notice: PropTypes.object,
  onConfirm: PropTypes.func,
  history: PropTypes.object,
}

const mapDispatchToProps = dispatch => {
  return {
    markNoticeRead: nextUnreadNotice =>
      dispatch(actions.markNoticeRead(nextUnreadNotice)),
    markAccountsFound: () => dispatch(actions.markAccountsFound()),
  }
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { noActiveNotices, nextUnreadNotice } = stateProps
  const { markNoticeRead, markAccountsFound } = dispatchProps

  let notice
  let onConfirm

  if (!noActiveNotices) {
    notice = nextUnreadNotice
    onConfirm = () => markNoticeRead(nextUnreadNotice)
  } else {
    notice = generateTermsOfService()
    onConfirm = () => markAccountsFound()
  }

  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    notice,
    onConfirm,
  }
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Notice)
