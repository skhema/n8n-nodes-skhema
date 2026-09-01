import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the project-member dropdown on Complete Member Compliance. Reads the
 * sibling `project` locator, then lists that project's members via
 * GET /v1/projects/{id}/members. `value` is the projectMemberId (the id the
 * compliance action needs). Mirrors the Zapier hidden `get_project_members`
 * trigger.
 */
export async function getProjectMembers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const projectId = this.getNodeParameter('project', '', { extractValue: true }) as string;
	if (!projectId) {
		return { results: [] };
	}

	const response = (await skhemaApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}/members`,
	)) as IDataObject;
	const members = (response.members as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = members.map((m) => ({
		name: String(m.name ?? m.email ?? m.userId),
		value: String(m.projectMemberId),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
