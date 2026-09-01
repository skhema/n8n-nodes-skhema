import type { INodeProperties } from 'n8n-workflow';
import { projectLocator } from '../../shared/descriptions';
import {
	presendOrganizationId,
	presendProjectLookup,
	unwrapProjectCreate,
	unwrapProjectFind,
} from '../../shared/helpers';

const showForProject = { resource: ['project'] };

export const projectDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showForProject },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a project',
				description: 'Create a project in Skhema',
				routing: {
					request: { method: 'POST', url: '/projects' },
					send: { preSend: [presendOrganizationId] },
					output: { postReceive: [unwrapProjectCreate] },
				},
			},
			{
				name: 'Find',
				value: 'find',
				action: 'Find a project',
				description: 'Find a project by name or ID',
				routing: {
					request: { method: 'GET', url: '/projects' },
					send: { preSend: [presendProjectLookup] },
					output: { postReceive: [unwrapProjectFind] },
				},
			},
		],
		default: 'create',
	},

	// ─── Create ──────────────────────────────────────────────────────────────
	{
		displayName: 'Project Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { ...showForProject, operation: ['create'] } },
		description: 'Name of the project to create',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		// Values are the /v1 enum; names are the product-facing labels.
		options: [
			{ name: 'Global', value: 'global' },
			{ name: 'Team Restrictions', value: 'restricted' },
		],
		default: 'restricted',
		required: true,
		displayOptions: { show: { ...showForProject, operation: ['create'] } },
		description: 'Who can see the project',
		routing: { send: { type: 'body', property: 'visibility' } },
	},

	// ─── Find ────────────────────────────────────────────────────────────────
	{
		displayName: 'Project Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: { show: { ...showForProject, operation: ['find'] } },
		description: 'Filter projects whose name contains this text',
	},
	{
		...projectLocator,
		required: false,
		description: 'Optionally pick an exact project to look up by id',
		displayOptions: { show: { ...showForProject, operation: ['find'] } },
	},
];
