import {
  createRouter,
  createAuthProviderIntegration,
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { stringifyEntityRef } from '@backstage/catalog-model';
import {
  AuthProviderRouteHandlers,
  AuthResolverContext,
  SignInResolver,
  prepareBackstageIdentityResponse,
} from '@backstage/plugin-auth-node';

// a "dummy" auth provider for the local demo site used with
// proxy sign in so that the user is always logged in as guest.
// https://backstage.io/docs/auth/#sign-in-with-proxy-providers
export class DummyAuthProvider implements AuthProviderRouteHandlers {
  private readonly resolverContext: AuthResolverContext;
  private readonly signInResolver: SignInResolver<{}>;

  constructor(options: {
    resolverContext: AuthResolverContext;
    signInResolver: SignInResolver<{}>;
  }) {
    this.resolverContext = options.resolverContext;
    this.signInResolver = options.signInResolver;
  }

  async frameHandler(): Promise<void> {
    return;
  }

  async refresh(_: any, res: any): Promise<void> {
    const profile = {};

    const backstageSignInResult = await this.signInResolver(
      {
        profile,
        result: {},
      },
      this.resolverContext,
    );

    res.json({
      providerInfo: {},
      backstageIdentity: prepareBackstageIdentityResponse(
        backstageSignInResult,
      ),
      profile,
    });
  }

  async start(): Promise<void> {
    return;
  }
}

// "dummy" auth provider integration that doesn't talk to
// any external auth providers and lets the provided signIn
// resolver do all the work
export const dummyAuth = createAuthProviderIntegration({
  create(options: {
    signIn: {
      resolver: SignInResolver<{}>;
    };
  }) {
    return ({ resolverContext }) => {
      const signInResolver = options.signIn.resolver;
      return new DummyAuthProvider({
        resolverContext,
        signInResolver,
      });
    };
  },
});

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      // "dummy" sign in resolver that always signs
      // into the user "guest"
      'dummy-auth': dummyAuth.create({
        signIn: {
          async resolver(_, ctx) {
            const user = await ctx.findCatalogUser({
              entityRef: 'user:default/guest',
            });
            return ctx.issueToken({
              claims: {
                sub: stringifyEntityRef(user.entity),
                ent: [stringifyEntityRef(user.entity)],
              },
            });
          },
        },
      }),
    },
  });
}
