import { Router, type RequestHandler } from 'express';
import {
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth,
} from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { OAuthError, OAuthErrorCode, type OAuthTokenVerifier } from '@modelcontextprotocol/server';
import { isAllowedUser } from '../../auth/middleware.ts';
import { InvalidTokenError, type TokenVerifier } from '../../auth/tokens.ts';
import { HttpError } from '../../lib/http-error.ts';
import { createMcpServer, type McpServices } from './mcp.tools.ts';

export interface McpOptions {
  verifier: TokenVerifier;
  services: McpServices;
  allowedUserIds: readonly string[];
  /** Public URL of the MCP endpoint (MCP_RESOURCE_URL). */
  resourceUrl: string;
}

/** How long a fetched copy of AuthKit's metadata is reused. */
const METADATA_CACHE_MS = 5 * 60 * 1000;

/**
 * OAuth discovery documents for MCP clients, mounted at the app root:
 *
 * - `/.well-known/oauth-protected-resource/<path>` (RFC 9728) names AuthKit as the
 *   authorization server for this MCP endpoint. This is what current clients, Claude included,
 *   read; they then fetch AuthKit's own metadata from AuthKit.
 * - `/.well-known/oauth-authorization-server` serves AuthKit's metadata for older clients that
 *   look for it here. It is fetched from AuthKit (and cached), never written by hand, so it
 *   always matches what AuthKit actually supports (e.g. whether registration is enabled).
 */
export function mcpMetadataRouter(
  resourceUrl: string,
  authkitDomain: string,
  fetchMetadata: (url: string) => Promise<Response> = fetch,
): Router {
  const issuer = authkitDomain.replace(/\/$/, '');
  const router = Router();

  router.get(
    new URL(getOAuthProtectedResourceMetadataUrl(new URL(resourceUrl))).pathname,
    (req, res) => {
      res.json({
        resource: resourceUrl,
        authorization_servers: [issuer],
        bearer_methods_supported: ['header'],
        resource_name: 'MCP server',
      });
    },
  );

  let cached: { body: unknown; expires: number } | undefined;
  router.get('/.well-known/oauth-authorization-server', async (req, res) => {
    if (!cached || cached.expires < Date.now()) {
      const unavailable = () =>
        new HttpError(502, 'bad_gateway', 'Authorization server metadata is unavailable');
      // A network failure (DNS, timeout) is the upstream's problem too: 502, not 500.
      const upstream = await fetchMetadata(
        `${issuer}/.well-known/oauth-authorization-server`,
      ).catch((cause: unknown) => {
        throw Object.assign(unavailable(), { cause });
      });
      if (!upstream.ok) throw unavailable();
      cached = { body: await upstream.json(), expires: Date.now() + METADATA_CACHE_MS };
    }
    res.json(cached.body);
  });

  return router;
}

/**
 * Handlers for POST /mcp (Streamable HTTP, stateless): bearer auth with an OAuth challenge that
 * points clients at the metadata above, the user allowlist, then one MCP server per request.
 */
export function mcpHandlers(options: McpOptions): RequestHandler[] {
  const resourceUrl = new URL(options.resourceUrl);

  const verifier: OAuthTokenVerifier = {
    async verifyAccessToken(token) {
      try {
        const verified = await options.verifier.verifyMcp(token);
        return {
          token,
          clientId: verified.clientId,
          scopes: [],
          expiresAt: verified.expiresAt,
          resource: resourceUrl,
          extra: { userId: verified.userId },
        };
      } catch (error) {
        if (error instanceof InvalidTokenError) {
          throw new OAuthError(OAuthErrorCode.InvalidToken, error.message);
        }
        throw error;
      }
    },
  };

  const authenticate = requireBearerAuth({
    verifier,
    expectedResource: resourceUrl,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceUrl),
  });

  const handle: RequestHandler = async (req, res) => {
    const userId = req.auth?.extra?.['userId'];
    if (typeof userId !== 'string') throw new HttpError(401, 'unauthorized', 'Sign in required');
    if (!isAllowedUser(options.allowedUserIds, userId)) {
      throw new HttpError(403, 'forbidden', 'This account does not have access');
    }

    const server = createMcpServer(options.services, userId);
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };

  return [authenticate, handle];
}
