import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the component-instance dropdown on Create Element. A workspace can hold
 * multiple instances of one component type; this reads the sibling `workspace`
 * locator, then lists that workspace's component instances via
 * GET /v1/workspaces/{id}/components. `value` is the component instance id, the
 * `name` carries the element count for disambiguation. Mirrors the Zapier hidden
 * `get_workspace_components` trigger and the Make `GetWorkspaceComponents` RPC.
 */
export async function getWorkspaceComponents(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const workspaceId = this.getNodeParameter('workspace', '', { extractValue: true }) as string;
	if (!workspaceId) {
		return { results: [] };
	}

	const response = (await skhemaApiRequest.call(
		this,
		'GET',
		`/workspaces/${workspaceId}/components`,
	)) as IDataObject;
	const components = (response.components as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = components.map((c) => ({
		name:
			c.elementCount != null
				? `${String(c.name ?? c.id)} (${c.elementCount} elements)`
				: String(c.name ?? c.id),
		value: String(c.id),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
