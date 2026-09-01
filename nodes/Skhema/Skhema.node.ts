import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { projectDescription } from './resources/project';
import { elementDescription } from './resources/element';
import { complianceDescription } from './resources/compliance';
import { getProjects } from './listSearch/getProjects';
import { getProjectMembers } from './listSearch/getProjectMembers';
import { getProjectComponents } from './listSearch/getProjectComponents';
import { getComplianceRequirements } from './listSearch/getComplianceRequirements';
import { SKHEMA_API_BASE } from './shared/transport';

export class Skhema implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Skhema',
		name: 'skhema',
		icon: { light: 'file:../../icons/skhema.svg', dark: 'file:../../icons/skhema.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Create projects and elements, find projects, and complete member compliance in Skhema',
		defaults: {
			name: 'Skhema',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'skhemaOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: SKHEMA_API_BASE,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Compliance', value: 'compliance' },
					{ name: 'Element', value: 'element' },
					{ name: 'Project', value: 'project' },
				],
				default: 'project',
			},
			...projectDescription,
			...elementDescription,
			...complianceDescription,
		],
	};

	methods = {
		listSearch: {
			getProjects,
			getProjectMembers,
			getProjectComponents,
			getComplianceRequirements,
		},
	};
}
