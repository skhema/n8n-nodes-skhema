import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const SKHEMA_API_BASE = 'https://api.skhema.com/v1';
export const SKHEMA_AUTH_BASE = 'https://auth.skhema.com/api/auth';

const CREDENTIAL_NAME = 'skhemaOAuth2Api';

/**
 * Authenticated request against the Skhema public API (or the auth server for
 * `resource` values that are already absolute URLs). The OAuth2 credential's
 * access token — a service-account BetterAuth JWT — is injected as the bearer
 * by n8n's request helper, mirroring the Zapier api-client's direct
 * service-account path (integrations/zapier/lib/api-client.js).
 */
export async function skhemaApiRequest(
	this:
		| IHookFunctions
		| IWebhookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	qs: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		method,
		url: resource.startsWith('http') ? resource : `${SKHEMA_API_BASE}${resource}`,
		qs,
		body,
		json: true,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	};

	if (body === undefined) {
		delete options.body;
	}

	return this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_NAME, options);
}
