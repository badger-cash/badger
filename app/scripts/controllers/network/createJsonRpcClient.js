const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createFetchMiddleware = require('bch-json-rpc-middleware/fetch')
const createInflightMiddleware = require('bch-json-rpc-middleware/inflight-cache')
const providerFromMiddleware = require('bch-json-rpc-middleware/providerFromMiddleware')
const BlockTracker = require('eth-block-tracker')

module.exports = createJsonRpcClient

function createJsonRpcClient ({ rpcUrl }) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl })
  const blockProvider = providerFromMiddleware(fetchMiddleware)
  const blockTracker = new BlockTracker({ provider: blockProvider })

  const networkMiddleware = mergeMiddleware([
    // createBlockRefMiddleware({ blockTracker }),
    // createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    // createBlockTrackerInspectorMiddleware({ blockTracker }),
    fetchMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}
