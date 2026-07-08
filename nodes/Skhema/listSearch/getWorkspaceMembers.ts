import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the workspace-member dropdown on Complete Member Compliance. Reads the
 * sibling `workspace` locator, then lists that workspace's members via
 * GET /v1/workspaces/{id}/members. `value` is the workspaceMemberId (the id the
 * compliance action needs). Mirrors the Zapier hidden `get_workspace_members`
 * trigger.
 */
export async function getWorkspaceMembers(
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
		`/workspaces/${workspaceId}/members`,
	)) as IDataObject;
	const members = (response.members as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = members.map((m) => ({
		name: String(m.name ?? m.email ?? m.userId),
		value: String(m.workspaceMemberId),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
