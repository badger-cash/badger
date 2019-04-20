const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createInflightMiddleware = require('bch-json-rpc-middleware/inflight-cache')

module.exports = createInfuraClient

function createInfuraClient ({ network }) {
  // const infuraMiddleware = createInfuraMiddleware({ network })
  // const blockProvider = providerFromMiddleware(infuraMiddleware)
  // const blockTracker = new BlockTracker({ provider: blockProvider })

  const networkMiddleware = mergeMiddleware([
    // createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    // createBlockTrackerInspectorMiddleware({ blockTracker }),
    // infuraMiddleware,
  ])
  return { networkMiddleware }
}
