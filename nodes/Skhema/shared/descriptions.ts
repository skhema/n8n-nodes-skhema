import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * The five Skhema strategy components. Values are the /v1 `componentType` enum;
 * names are the product-facing labels (copied from
 * integrations/zapier/creates/create_element.js COMPONENT_CHOICES).
 */
export const COMPONENT_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Diagnosis', value: 'diagnosis' },
	{ name: 'Method & Positioning', value: 'method' },
	{ name: 'Portfolio of Initiatives', value: 'initiatives' },
	{ name: 'Measures', value: 'measures' },
	{ name: 'Support Structures', value: 'support' },
];

/** Human labels for every element type (mirrors ELEMENT_LABELS in Zapier). */
export const ELEMENT_LABELS: Record<string, string> = {
	key_challenge: 'Key Challenge',
	fact: 'Fact',
	impact: 'Impact',
	guiding_policy: 'Guiding Policy',
	competitor_move: 'Competitor Move',
	scope: 'Scope',
	constraint: 'Constraint',
	solution: 'Solution',
	assumption_hypothesis: 'Assumption / Hypothesis',
	experiment: 'Experiment',
	action: 'Action',
	investment: 'Investment',
	estimate: 'Estimate',
	baseline: 'Baseline',
	outcome: 'Outcome',
	performance_variable: 'Performance Variable',
	capability: 'Capability',
	system: 'System',
	principle: 'Principle',
};

/**
 * Which element types are valid inside each component. Copied verbatim from the
 * Zapier `create_element` ELEMENT_FLOW map, which mirrors the backend
 * ELEMENT_FLOW (supabase/functions/_shared/elements.ts). The API validates the
 * pair server-side; this only scopes the dropdown per selected component.
 */
export const ELEMENT_FLOW: Record<string, string[]> = {
	diagnosis: ['key_challenge', 'fact', 'impact'],
	method: ['guiding_policy', 'competitor_move', 'scope', 'constraint'],
	initiatives: [
		'solution',
		'assumption_hypothesis',
		'experiment',
		'action',
		'estimate',
		'investment',
	],
	measures: ['baseline', 'outcome', 'performance_variable'],
	support: ['capability', 'system', 'principle'],
};

/**
 * One `elementType` property per component, each shown only for its component
 * and offering exactly that component's valid element types. This encodes the
 * componentType -> elementType validity matrix declaratively (n8n allows
 * repeated parameter `name`s with mutually exclusive displayOptions). The
 * option lists are derived from ELEMENT_FLOW; the literal `default` per property
 * is that component's first element type (the lint requires a literal default).
 */
const elementTypeOptions = (component: string) =>
	ELEMENT_FLOW[component].map((t) => ({ name: ELEMENT_LABELS[t], value: t }));

const showForComponent = (component: string) => ({
	show: {
		resource: ['element'],
		operation: ['create'],
		componentType: [component],
	},
});

const elementTypeRouting = { send: { type: 'body' as const, property: 'elementType' } };

export const elementTypeProperties: INodeProperties[] = [
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: 'key_challenge',
		required: true,
		description: 'The element type. Options depend on the chosen component.',
		options: elementTypeOptions('diagnosis'),
		displayOptions: showForComponent('diagnosis'),
		routing: elementTypeRouting,
	},
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: 'guiding_policy',
		required: true,
		description: 'The element type. Options depend on the chosen component.',
		options: elementTypeOptions('method'),
		displayOptions: showForComponent('method'),
		routing: elementTypeRouting,
	},
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: 'solution',
		required: true,
		description: 'The element type. Options depend on the chosen component.',
		options: elementTypeOptions('initiatives'),
		displayOptions: showForComponent('initiatives'),
		routing: elementTypeRouting,
	},
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: 'baseline',
		required: true,
		description: 'The element type. Options depend on the chosen component.',
		options: elementTypeOptions('measures'),
		displayOptions: showForComponent('measures'),
		routing: elementTypeRouting,
	},
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: 'capability',
		required: true,
		description: 'The element type. Options depend on the chosen component.',
		options: elementTypeOptions('support'),
		displayOptions: showForComponent('support'),
		routing: elementTypeRouting,
	},
];

/** Project resource locator backed by the `getProjects` list-search loader. */
export const projectLocator: INodeProperties = {
	displayName: 'Project',
	name: 'project',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description:
		'The project to act on. In the New Project Member flow this is usually mapped from the trigger rather than selected.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a project...',
			typeOptions: {
				searchListMethod: 'getProjects',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'By ID accepts an expression, e.g. {{ $json.projectId }}',
			placeholder: 'e.g. c562f038-0406-4d40-9c9a-b73c84e82de7',
		},
	],
};

/**
 * Optional component-instance resource locator backed by `getProjectComponents`.
 * The loader reads the sibling `project` parameter, so any node using this
 * locator must declare a `project` locator too. Omitted (blank) keeps the
 * default behaviour; see the description on the element-create usage.
 */
export const componentLocator: INodeProperties = {
	displayName: 'Component Instance',
	name: 'componentId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description:
		'Optional. A project can hold multiple instances of one component type. Pick the instance to add this element to. Leave blank to use the default: the element lands in the first instance of the chosen component type by position, auto-created if none exists. Pick a project first to browse the list.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a component instance...',
			typeOptions: {
				searchListMethod: 'getProjectComponents',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'By ID accepts an expression, e.g. {{ $json.componentId }}',
			placeholder: 'e.g. b1c2d3e4-0000-4000-8000-000000000001',
		},
	],
};

/**
 * Project-member resource locator backed by `getProjectMembers`. The loader
 * reads the sibling `project` parameter, so any node using this locator must
 * declare a `project` locator too.
 */
export const projectMemberLocator: INodeProperties = {
	displayName: 'Project Member',
	name: 'projectMemberId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description:
		"The member's projectMember ID (not their user ID). Usually mapped from the New Project Member trigger rather than selected. Pick a project first to browse the list instead.",
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a member...',
			typeOptions: {
				searchListMethod: 'getProjectMembers',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'By ID accepts an expression, e.g. {{ $json.newState.projectMemberId }}',
			placeholder: 'e.g. a1b2c3d4-0000-4000-8000-000000000021',
		},
	],
};

/** Compliance-requirement resource locator backed by `getComplianceRequirements`. */
export const complianceLocator: INodeProperties = {
	displayName: 'Requirement',
	name: 'complianceId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description:
		'The compliance requirement to mark complete. Usually mapped from the trigger (one of the Pending Compliance IDs) rather than selected.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a requirement...',
			typeOptions: {
				searchListMethod: 'getComplianceRequirements',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'By ID accepts an expression, e.g. {{ $json.metadata.pendingCompliance[0].id }}',
			placeholder: 'e.g. c1d2e3f4-0000-4000-8000-000000000003',
		},
	],
};
