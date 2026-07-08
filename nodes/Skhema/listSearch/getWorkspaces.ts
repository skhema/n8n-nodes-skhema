import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the workspace dropdown. Lists the connected organization's workspaces
 * via GET /v1/workspaces (org scoped by the connection token). Mirrors the
 * Zapier hidden `get_all_workspaces` trigger.
 */
export async function getWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await skhemaApiRequest.call(this, 'GET', '/workspaces')) as IDataObject;
	const workspaces = (response.workspaces as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = workspaces.map((w) => ({
		name: String(w.name ?? w.id),
		value: String(w.id),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
