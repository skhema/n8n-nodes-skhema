import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the project dropdown. Lists the connected organization's projects
 * via GET /v1/projects (org scoped by the connection token). Mirrors the
 * Zapier hidden `get_all_projects` trigger.
 */
export async function getProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await skhemaApiRequest.call(this, 'GET', '/projects')) as IDataObject;
	const projects = (response.projects as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = projects.map((w) => ({
		name: String(w.name ?? w.id),
		value: String(w.id),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
