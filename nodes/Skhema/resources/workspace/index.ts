import type { INodeProperties } from 'n8n-workflow';
import { workspaceLocator } from '../../shared/descriptions';
import {
	presendOrganizationId,
	presendWorkspaceLookup,
	unwrapWorkspaceCreate,
	unwrapWorkspaceFind,
} from '../../shared/helpers';

const showForWorkspace = { resource: ['workspace'] };

export const workspaceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showForWorkspace },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a workspace',
				description: 'Create a workspace in Skhema',
				routing: {
					request: { method: 'POST', url: '/workspaces' },
					send: { preSend: [presendOrganizationId] },
					output: { postReceive: [unwrapWorkspaceCreate] },
				},
			},
			{
				name: 'Find',
				value: 'find',
				action: 'Find a workspace',
				description: 'Find a workspace by name or ID',
				routing: {
					request: { method: 'GET', url: '/workspaces' },
					send: { preSend: [presendWorkspaceLookup] },
					output: { postReceive: [unwrapWorkspaceFind] },
				},
			},
		],
		default: 'create',
	},

	// ─── Create ──────────────────────────────────────────────────────────────
	{
		displayName: 'Workspace Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { ...showForWorkspace, operation: ['create'] } },
		description: 'Name of the workspace to create',
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
		displayOptions: { show: { ...showForWorkspace, operation: ['create'] } },
		description: 'Who can see the workspace',
		routing: { send: { type: 'body', property: 'visibility' } },
	},

	// ─── Find ────────────────────────────────────────────────────────────────
	{
		displayName: 'Workspace Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: { show: { ...showForWorkspace, operation: ['find'] } },
		description: 'Filter workspaces whose name contains this text',
	},
	{
		...workspaceLocator,
		required: false,
		description: 'Optionally pick an exact workspace to look up by id',
		displayOptions: { show: { ...showForWorkspace, operation: ['find'] } },
	},
];
