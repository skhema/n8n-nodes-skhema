import type { INodeProperties } from 'n8n-workflow';
import {
	COMPONENT_OPTIONS,
	componentLocator,
	elementTypeProperties,
	workspaceLocator,
} from '../../shared/descriptions';
import { presendPruneEmpty, unwrapElementCreate } from '../../shared/helpers';

const showForElement = { resource: ['element'] };
const showForElementCreate = { ...showForElement, operation: ['create'] };

export const elementDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showForElement },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an element',
				description: 'Create an element (a strategy building block) in a workspace component',
				routing: {
					request: {
						method: 'POST',
						// Resource locators must be reduced to their extracted id in URL
						// expressions. `.value ?? param` is safe under both proxy
						// behaviors: if the expression engine already extracted the
						// locator (`__rl`) to a string, `.value` is undefined and the
						// fallback returns the string; otherwise `.value` is the id.
						url: '=/workspaces/{{ $parameter["workspace"].value ?? $parameter["workspace"] }}/elements',
					},
					send: { preSend: [presendPruneEmpty] },
					output: { postReceive: [unwrapElementCreate] },
				},
			},
		],
		default: 'create',
	},
	{
		...workspaceLocator,
		displayOptions: { show: showForElementCreate },
	},
	{
		displayName: 'Component',
		name: 'componentType',
		type: 'options',
		options: COMPONENT_OPTIONS,
		default: 'diagnosis',
		required: true,
		displayOptions: { show: showForElementCreate },
		description: 'The strategy component to add the element to',
		routing: { send: { type: 'body', property: 'componentType' } },
	},
	// One elementType property per component (encodes the validity matrix).
	...elementTypeProperties,
	{
		...componentLocator,
		displayOptions: { show: showForElementCreate },
		// Extract the resource-locator id into the body. Left blank it resolves to
		// '' and presendPruneEmpty drops it, preserving the default first-instance
		// behaviour (`.value ?? param` is safe whether or not the engine
		// pre-extracts the `__rl` value).
		routing: {
			send: {
				type: 'body',
				property: 'componentId',
				value: '={{ $parameter["componentId"].value ?? $parameter["componentId"] }}',
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: showForElementCreate },
		description: 'The element text (e.g. the challenge, fact, or policy)',
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'Reasoning',
		name: 'reasoning',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: showForElementCreate },
		description: 'Optional supporting reasoning for this element',
		routing: { send: { type: 'body', property: 'reasoning' } },
	},
];
