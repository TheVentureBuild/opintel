import type { ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

import { ICREATE_BRIDGE_SEARCH_PATH } from './contract'
import type { IcreateBridgeSearchRequest } from './contract'
import { dispatchBridgeRequest, BRIDGE_JSON_CONTENT_TYPE } from '../http-boundary'
import { handleIcreateBridge } from './handler'

function send(res: ServerResponse, httpStatus: number, body: unknown): void {
  res.statusCode = httpStatus
  res.setHeader('Content-Type', BRIDGE_JSON_CONTENT_TYPE)
  res.end(JSON.stringify(body))
}

const ROUTES = {
  [ICREATE_BRIDGE_SEARCH_PATH]: (value: unknown) =>
    handleIcreateBridge(value as IcreateBridgeSearchRequest | null),
}

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  void (async () => {
    const result = await dispatchBridgeRequest(req, { routes: ROUTES })
    if (result === null) {
      next()
      return
    }
    send(res, result.httpStatus, result.body)
  })().catch((error: unknown) => {
    send(res, 500, { ok: false, error: { code: 'bridge_failure', message: String(error) } })
  })
}

export function tvbIcreateBridge(): Plugin {
  return {
    name: 'tvb-icreate-bridge',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

