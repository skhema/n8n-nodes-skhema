import type { INodeProperties } from 'n8n-workflow';
import {
	complianceLocator,
	workspaceLocator,
	workspaceMemberLocator,
} from '../../shared/descriptions';
import { presendComplete, unwrapCompliance, unwrapMemberCompliance } from '../../shared/helpers';

const showForCompliance = { resource: ['compliance'] };

export const complianceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showForCompliance },
		options: [
			{
				name: 'Find Requirement',
				value: 'find',
				action: 'Find a compliance requirement',
				description: "List a workspace's compliance requirements",
				routing: {
					request: {
						method: 'GET',
						// See element/index.ts: extract the resource-locator id in URL
						// expressions (`.value ?? param` is safe whether or not the
						// engine pre-extracts `__rl` values).
						url: '=/workspaces/{{ $parameter["workspace"].value ?? $parameter["workspace"] }}/compliance',
					},
					output: { postReceive: [unwrapCompliance] },
				},
			},
			{
				name: 'Complete Member Compliance',
				value: 'complete',
				action: 'Complete member compliance',
				description:
					'Mark a workspace member as having completed a compliance requirement (release the access gate for requirements completed via your own process, e.g. DocuSign)',
				routing: {
					request: {
						method: 'POST',
						url: '=/workspaces/{{ $parameter["workspace"].value ?? $parameter["workspace"] }}/compliance/members/{{ $parameter["workspaceMemberId"].value ?? $parameter["workspaceMemberId"] }}/complete',
					},
					send: { preSend: [presendComplete] },
					output: { postReceive: [unwrapMemberCompliance] },
				},
			},
		],
		default: 'find',
	},

	// ─── Find Requirement ──────────────────────────────────────────────────────
	{
		...workspaceLocator,
		description: 'The workspace to list compliance requirements for',
		displayOptions: { show: { ...showForCompliance, operation: ['find'] } },
	},

	// ─── Complete Member Compliance ────────────────────────────────────────────
	{
		...workspaceLocator,
		description: 'The workspace this compliance requirement belongs to',
		displayOptions: { show: { ...showForCompliance, operation: ['complete'] } },
	},
	{
		...workspaceMemberLocator,
		displayOptions: { show: { ...showForCompliance, operation: ['complete'] } },
	},
	{
		...complianceLocator,
		displayOptions: { show: { ...showForCompliance, operation: ['complete'] } },
	},
	{
		displayName: 'Proof Storage Path',
		name: 'storagePath',
		type: 'string',
		default: '',
		displayOptions: { show: { ...showForCompliance, operation: ['complete'] } },
		description: 'Optional path to an uploaded proof document',
	},
];
