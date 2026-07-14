#!/usr/bin/env node
/**
 * Offline verification for @skhema/n8n-nodes-skhema. Run after `npm run build`:
 *
 *   npm run verify
 *
 * 1. Smoke-loads the compiled node/trigger/credential classes and asserts the
 *    surface (resources, operations, element-type validity matrix, listSearch
 *    loaders, webhookMethods, credential grant/scopes).
 * 2. Evaluates every declarative routing URL that interpolates a
 *    resource-locator parameter through the REAL n8n-workflow expression
 *    engine (the same path n8n-core's RoutingNode uses), with `__rl` locator
 *    objects in BOTH "From List" and manual "By ID" modes, asserting the
 *    extracted id lands in the URL. Guards against the
 *    /workspaces/[object Object]/... class of bug.
 *
 * No n8n server involved; uses only the installed n8n-workflow peer dep.
 */

'use strict';

const assert = require('node:assert');

const { Workflow } = require('n8n-workflow');
const { Skhema } = require('../dist/nodes/Skhema/Skhema.node.js');
const { SkhemaTrigger } = require('../dist/nodes/SkhemaTrigger/SkhemaTrigger.node.js');
const { SkhemaOAuth2Api } = require('../dist/credentials/SkhemaOAuth2Api.credentials.js');
const { presendPruneEmpty } = require('../dist/nodes/Skhema/shared/helpers.js');

let failures = 0;
const check = (label, fn) => {
	try {
		fn();
		console.log(`  ok    ${label}`);
	} catch (error) {
		failures += 1;
		console.error(`  FAIL  ${label}: ${error.message}`);
	}
};

const skhema = new Skhema();
const trigger = new SkhemaTrigger();
const credential = new SkhemaOAuth2Api();

// ─── 1. Surface smoke ────────────────────────────────────────────────────────
console.log('surface smoke:');

check('action node resources', () => {
	const resource = skhema.description.properties.find((p) => p.name === 'resource');
	assert.deepStrictEqual(
		resource.options.map((o) => o.value).sort(),
		['compliance', 'element', 'workspace'],
	);
});

check('operations per resource', () => {
	const actions = {};
	for (const p of skhema.description.properties) {
		if (p.name !== 'operation') continue;
		const res = p.displayOptions.show.resource[0];
		actions[res] = p.options.map((o) => o.value).sort();
	}
	assert.deepStrictEqual(actions, {
		workspace: ['create', 'find'],
		element: ['create'],
		compliance: ['complete', 'find'],
	});
});

check('element-type validity matrix (mirrors Zapier ELEMENT_FLOW)', () => {
	const expected = {
		diagnosis: ['key_challenge', 'supporting_fact', 'impact'],
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
	const actual = {};
	for (const p of skhema.description.properties) {
		if (p.name !== 'elementType') continue;
		actual[p.displayOptions.show.componentType[0]] = p.options.map((o) => o.value);
	}
	assert.deepStrictEqual(actual, expected);
});

check('listSearch loaders', () => {
	assert.deepStrictEqual(Object.keys(skhema.methods.listSearch).sort(), [
		'getComplianceRequirements',
		'getWorkspaceComponents',
		'getWorkspaceMembers',
		'getWorkspaces',
	]);
});

check('trigger events + webhook lifecycle', () => {
	const events = trigger.description.properties.find((p) => p.name === 'events');
	assert.deepStrictEqual(
		events.options.map((o) => o.value).sort(),
		['member.added', 'workspace.member_added'],
	);
	assert.deepStrictEqual(Object.keys(trigger.webhookMethods.default).sort(), [
		'checkExists',
		'create',
		'delete',
	]);
	assert.strictEqual(typeof trigger.webhook, 'function');
});

// Every searchListMethod referenced by a node's properties (including
// resource-locator modes) must be registered in that node's methods.listSearch
// — otherwise the "From List" dropdown is broken at runtime.
const referencedSearchListMethods = (description) => {
	const found = new Set();
	const visit = (value) => {
		if (Array.isArray(value)) {
			value.forEach(visit);
		} else if (value && typeof value === 'object') {
			if (typeof value.searchListMethod === 'string') found.add(value.searchListMethod);
			Object.values(value).forEach(visit);
		}
	};
	visit(description.properties);
	return [...found].sort();
};

for (const [label, instance] of [
	['action node', skhema],
	['trigger node', trigger],
]) {
	check(`${label}: all referenced searchListMethods are registered`, () => {
		const referenced = referencedSearchListMethods(instance.description);
		const registered = Object.keys(instance.methods?.listSearch ?? {});
		const missing = referenced.filter((m) => !registered.includes(m));
		assert.deepStrictEqual(missing, [], `unregistered searchListMethods: ${missing.join(', ')}`);
	});
}

check('trigger registers the shared getWorkspaces loader', () => {
	assert.strictEqual(typeof trigger.methods.listSearch.getWorkspaces, 'function');
	// Same shared implementation as the action node, not a divergent copy.
	assert.strictEqual(trigger.methods.listSearch.getWorkspaces, skhema.methods.listSearch.getWorkspaces);
});

check('credential grant + scopes match the Zapier app', () => {
	assert.deepStrictEqual(credential.extends, ['oAuth2Api']);
	const prop = (name) => credential.properties.find((p) => p.name === name).default;
	assert.strictEqual(prop('grantType'), 'pkce');
	assert.strictEqual(
		prop('scope'),
		'openid profile email organizations organizations:read organizations:write offline_access',
	);
	assert.strictEqual(prop('authUrl'), 'https://auth.skhema.com/api/auth/oauth/authorize');
	assert.strictEqual(prop('accessTokenUrl'), 'https://auth.skhema.com/api/auth/oauth/token');
});

// ─── 2. Routing URL resolution with resource locators ───────────────────────
console.log('routing URL resolution (real n8n-workflow expression engine):');

// The Workflow constructor canonicalizes node parameters against the node
// type's properties, so the real description must be supplied — exactly what
// n8n does at runtime before RoutingNode resolves the request URL.
const nodeType = { description: skhema.description };
const nodeTypes = {
	getByName: () => nodeType,
	getByNameAndVersion: () => nodeType,
	getKnownTypes: () => ({}),
};

const resolveUrl = (expr, parameters) => {
	const wf = new Workflow({
		id: 'verify',
		name: 'verify',
		nodes: [
			{
				id: '1',
				name: 'SkhemaNode',
				type: '@skhema/n8n-nodes-skhema.skhema',
				typeVersion: 1,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});
	return wf.expression.getParameterValue(expr, null, 0, 0, 'SkhemaNode', [], 'manual', {});
};

const findRoutingUrl = (resource, operation) => {
	for (const p of skhema.description.properties) {
		if (p.name !== 'operation') continue;
		if (p.displayOptions.show.resource[0] !== resource) continue;
		const op = p.options.find((o) => o.value === operation);
		if (op?.routing?.request?.url) return op.routing.request.url;
	}
	throw new Error(`no routing url for ${resource}.${operation}`);
};

const rl = (mode, value) => ({ __rl: true, mode, value, cachedResultName: 'X' });

const cases = [
	{
		label: 'element.create',
		url: findRoutingUrl('element', 'create'),
		params: (mode) => ({
			resource: 'element',
			operation: 'create',
			workspace: rl(mode, 'ws-11111111-aaaa-4bbb-8ccc-000000000001'),
			componentType: 'diagnosis',
			elementType: 'key_challenge',
			content: 'x',
		}),
		expect: '/workspaces/ws-11111111-aaaa-4bbb-8ccc-000000000001/elements',
	},
	{
		label: 'compliance.find',
		url: findRoutingUrl('compliance', 'find'),
		params: (mode) => ({
			resource: 'compliance',
			operation: 'find',
			workspace: rl(mode, 'ws-11111111-aaaa-4bbb-8ccc-000000000001'),
		}),
		expect: '/workspaces/ws-11111111-aaaa-4bbb-8ccc-000000000001/compliance',
	},
	{
		label: 'compliance.complete',
		url: findRoutingUrl('compliance', 'complete'),
		params: (mode) => ({
			resource: 'compliance',
			operation: 'complete',
			workspace: rl(mode, 'ws-11111111-aaaa-4bbb-8ccc-000000000001'),
			workspaceMemberId: rl(mode, 'wsm-22222222-bbbb-4ccc-8ddd-000000000002'),
			complianceId: rl(mode, 'c-33333333-cccc-4ddd-8eee-000000000003'),
		}),
		expect:
			'/workspaces/ws-11111111-aaaa-4bbb-8ccc-000000000001/compliance/members/wsm-22222222-bbbb-4ccc-8ddd-000000000002/complete',
	},
];

for (const c of cases) {
	for (const mode of ['list', 'id']) {
		check(`${c.label} url (${mode === 'list' ? 'From List' : 'By ID'} mode)`, () => {
			const resolved = resolveUrl(c.url, c.params(mode));
			assert.strictEqual(resolved, c.expect);
			assert.ok(!String(resolved).includes('[object'), 'URL contains [object Object]');
			assert.ok(!/\/\//.test(String(resolved)), 'URL contains an empty path segment');
		});
	}
}

// ─── 3. element.create componentId body contract ────────────────────────────
// The optional Component Instance locator routes to the request body via a
// send.value expression, then presendPruneEmpty drops it when blank. Assert the
// full contract through the real expression engine + the real preSend helper:
// an unselected/blank locator (any mode) must produce a body with NO componentId
// key (byte-identical to today's behaviour), and a populated locator must route
// the plain string id.
console.log('element.create componentId body contract:');

const componentSend = (() => {
	for (const p of skhema.description.properties) {
		if (p.name === 'componentId' && p.routing?.send?.property === 'componentId') {
			return p.routing.send;
		}
	}
	throw new Error('element.create has no componentId body routing');
})();

// Reproduce how RoutingNode assembles the body: resolve each send.value through
// the expression engine, set body[property], then run the node's preSend chain.
const elementCreateBody = (componentIdParam) => {
	const parameters = {
		resource: 'element',
		operation: 'create',
		workspace: rl('list', 'ws-11111111-aaaa-4bbb-8ccc-000000000001'),
		componentType: 'diagnosis',
		elementType: 'key_challenge',
		content: 'x',
	};
	if (componentIdParam !== undefined) parameters.componentId = componentIdParam;

	const body = { componentType: 'diagnosis', elementType: 'key_challenge', content: 'x' };
	body[componentSend.property] = resolveUrl(componentSend.value, parameters);
	presendPruneEmpty.call({}, { body });
	return body;
};

const noComponentIdCases = [
	['blank locator, From List mode', rl('list', '')],
	['blank locator, By ID mode', rl('id', '')],
	['locator omitted (schema default)', undefined],
];
for (const [label, param] of noComponentIdCases) {
	check(`${label} → body has no componentId key`, () => {
		const body = elementCreateBody(param);
		assert.ok(
			!Object.prototype.hasOwnProperty.call(body, 'componentId'),
			`expected no componentId key, got ${JSON.stringify(body)}`,
		);
	});
}

const populatedCases = [
	['populated From List mode', rl('list', 'c-44444444-dddd-4eee-8fff-000000000004')],
	['populated By ID mode', rl('id', 'c-44444444-dddd-4eee-8fff-000000000004')],
];
for (const [label, param] of populatedCases) {
	check(`${label} → body.componentId is the plain string id`, () => {
		const body = elementCreateBody(param);
		assert.strictEqual(body.componentId, 'c-44444444-dddd-4eee-8fff-000000000004');
		assert.strictEqual(typeof body.componentId, 'string');
	});
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures > 0) {
	console.error(`\n${failures} verification failure(s)`);
	process.exit(1);
}
console.log('\nall offline verifications passed');
