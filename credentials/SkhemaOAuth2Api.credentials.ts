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
 * Skhema registers n8n as a PUBLIC (native) OAuth client: PKCE is the proof
 * of possession and there is no client secret to distribute. The shared
 * client ID is prefilled below; the secret field is hidden and sent empty
 * (the Skhema auth server skips the secret check for public clients).
 *
 * Because the OAuth callback lives on each n8n instance's own host, an org
 * owner/admin must first register the instance's callback URL
 * (https://<instance>/rest/oauth2-credential/callback) in Skhema under
 * Connections — the authorization server refuses unregistered callbacks.
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
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			// Skhema's shared public OAuth client for n8n. Visible so it can be
			// overridden if Skhema ever rotates the client, but correct as-is.
			default: '0df56f93-67d8-43b1-bc08-6a5d353a118e',
			required: true,
			description:
				'Skhema public OAuth client for n8n — leave the default unless Skhema documentation says otherwise',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'hidden',
			typeOptions: {
				password: true,
			},
			// Public client + PKCE: no secret exists. Sent empty in the token
			// request body; the Skhema auth server ignores it for public clients.
			default: '',
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
