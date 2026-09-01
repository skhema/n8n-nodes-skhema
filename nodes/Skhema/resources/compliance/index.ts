import type { INodeProperties } from 'n8n-workflow';
import { complianceLocator, projectLocator, projectMemberLocator } from '../../shared/descriptions';
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
				description: "List a project's compliance requirements",
				routing: {
					request: {
						method: 'GET',
						// See element/index.ts: extract the resource-locator id in URL
						// expressions (`.value ?? param` is safe whether or not the
						// engine pre-extracts `__rl` values).
						url: '=/projects/{{ $parameter["project"].value ?? $parameter["project"] }}/compliance',
					},
					output: { postReceive: [unwrapCompliance] },
				},
			},
			{
				name: 'Complete Member Compliance',
				value: 'complete',
				action: 'Complete member compliance',
				description:
					'Mark a project member as having completed a compliance requirement (release the access gate for requirements completed via your own process, e.g. DocuSign)',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ $parameter["project"].value ?? $parameter["project"] }}/compliance/members/{{ $parameter["projectMemberId"].value ?? $parameter["projectMemberId"] }}/complete',
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
		...projectLocator,
		description: 'The project to list compliance requirements for',
		displayOptions: { show: { ...showForCompliance, operation: ['find'] } },
	},

	// ─── Complete Member Compliance ────────────────────────────────────────────
	{
		...projectLocator,
		description: 'The project this compliance requirement belongs to',
		displayOptions: { show: { ...showForCompliance, operation: ['complete'] } },
	},
	{
		...projectMemberLocator,
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
