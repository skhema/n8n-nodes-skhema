import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../shared/transport';

/**
 * Backs the compliance-requirement dropdown on Complete Member Compliance.
 * Reads the sibling `project` locator, then lists that project's compliance
 * requirements via GET /v1/projects/{id}/compliance. Mirrors the Zapier hidden
 * `get_compliance_requirements` trigger.
 */
export async function getComplianceRequirements(
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
		`/projects/${projectId}/compliance`,
	)) as IDataObject;
	const compliance = (response.compliance as IDataObject[]) ?? [];

	let results: INodeListSearchItems[] = compliance.map((c) => ({
		name: String(c.name ?? c.id),
		value: String(c.id),
	}));

	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}

	return { results };
}
