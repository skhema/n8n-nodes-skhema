import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * OAuth2 credential for the Skhema public API (api.skhema.com/v1).
 *
 * Mirrors the Zapier integration's authentication (integrations/zapier/authentication.js):
 * an org admin authorizes a Skhema OAuth client, producing a service-account
 * token that represents the organization. Service-account tokens are already
 * BetterAuth JWTs, so n8n injects the access token directly as the bearer on
 * every /v1 request (no jwt-bridge exchange needed for the service-account path).
 *
 * Uses the Authorization Code + PKCE grant, which n8n's base `oAuth2Api`
 * credential supports via `grantType: 'pkce'` — matching the Zapier app's
 * `enablePkce: true`.
 *
 * The clientId and clientSecret fields are inherited (visible) from `oAuth2Api`;
 * the connecting org supplies its Skhema OAuth client credentials there.
 */
export class SkhemaOAuth2Api implements ICredentialType {
	name = 'skhemaOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Skhema OAuth2 API';

	icon: Icon = { light: 'file:../icons/skhema.svg', dark: 'file:../icons/skhema.dark.svg' };

	documentationUrl = 'https://skhema.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			// Authorization Code with PKCE — matches the Zapier app's enablePkce.
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.skhema.com/api/auth/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.skhema.com/api/auth/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			// Identical to integrations/zapier/authentication.js oauth2Config scope.
			default:
				'openid profile email organizations organizations:read organizations:write offline_access',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
