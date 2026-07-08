import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { skhemaApiRequest, SKHEMA_API_BASE, SKHEMA_AUTH_BASE } from './transport';

const toItems = (data: IDataObject | IDataObject[]): INodeExecutionData[] =>
	(Array.isArray(data) ? data : [data]).map((json) => ({ json }));

/**
 * preSend for Create Workspace: resolves the connected organization id from the
 * OAuth userinfo endpoint and injects it into the request body, mirroring the
 * Zapier create_workspace which sends `organizationId: bundle.authData.organizationId`.
 */
export async function presendOrganizationId(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const info = (await skhemaApiRequest.call(
		this,
		'GET',
		`${SKHEMA_AUTH_BASE}/oauth/userinfo`,
	)) as IDataObject;
	const organizationId = (info?.organization as IDataObject)?.id;
	if (organizationId) {
		requestOptions.body = {
			...((requestOptions.body as IDataObject) ?? {}),
			organizationId,
		};
	}
	return requestOptions;
}

/**
 * preSend for Find Workspace: when an exact workspace is selected, repoint the
 * request from the list endpoint to the by-id endpoint (mirrors the Zapier
 * find_workspace direct-lookup branch).
 */
export async function presendWorkspaceLookup(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const workspaceId = this.getNodeParameter('workspace', '', { extractValue: true }) as string;
	if (workspaceId) {
		requestOptions.url = `${SKHEMA_API_BASE}/workspaces/${workspaceId}`;
	}
	return requestOptions;
}

/**
 * preSend that drops empty-string / undefined body properties so optional
 * fields left blank are omitted rather than sent as "" (mirrors the Zapier
 * `reasoning || undefined` pattern).
 */
export async function presendPruneEmpty(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as IDataObject | undefined;
	if (body && typeof body === 'object') {
		for (const key of Object.keys(body)) {
			if (body[key] === '' || body[key] === undefined) {
				delete body[key];
			}
		}
	}
	return requestOptions;
}

/**
 * preSend for Complete Member Compliance: builds the body exactly like the
 * Zapier complete_member_compliance ({ complianceId, storagePath? }) from the
 * resource-locator + optional string parameters.
 */
export async function presendComplete(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const complianceId = this.getNodeParameter('complianceId', '', { extractValue: true }) as string;
	const storagePath = this.getNodeParameter('storagePath', '') as string;
	const body: IDataObject = { complianceId };
	if (storagePath) {
		body.storagePath = storagePath;
	}
	requestOptions.body = body;
	return requestOptions;
}

/** postReceive for Create Workspace: unwrap `{ workspace }` -> the workspace. */
export async function unwrapWorkspaceCreate(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	return toItems((body.workspace as IDataObject) ?? body);
}

/**
 * postReceive for Find Workspace: handles both the by-id (`{ workspace }`) and
 * the list (`{ workspaces }`) responses, then filters by the `name` substring
 * client-side (the /v1 list endpoint has no server-side name filter).
 */
export async function unwrapWorkspaceFind(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	if (body.workspace) {
		return toItems(body.workspace as IDataObject);
	}
	const workspaces = (body.workspaces as IDataObject[]) ?? [];
	const name = (this.getNodeParameter('name', '') as string) ?? '';
	if (!name) {
		return toItems(workspaces);
	}
	const needle = name.toLowerCase();
	return toItems(
		workspaces.filter((w) =>
			String(w.name ?? '')
				.toLowerCase()
				.includes(needle),
		),
	);
}

/**
 * postReceive for Create Element: unwrap `{ element }` and surface the resolved
 * `componentId` alongside it (mirrors Zapier create_element output shape).
 */
export async function unwrapElementCreate(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	const element = ((body.element as IDataObject) ?? body) as IDataObject;
	return toItems({ ...element, componentId: body.componentId });
}

/** postReceive for Find Compliance Requirement: unwrap `{ compliance }` array. */
export async function unwrapCompliance(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	return toItems((body.compliance as IDataObject[]) ?? []);
}

/** postReceive for Complete Member Compliance: unwrap `{ memberCompliance }`. */
export async function unwrapMemberCompliance(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;
	return toItems((body.memberCompliance as IDataObject) ?? body);
}
