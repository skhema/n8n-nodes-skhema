import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { skhemaApiRequest } from '../Skhema/shared/transport';
import { workspaceLocator } from '../Skhema/shared/descriptions';
import { getWorkspaces } from '../Skhema/listSearch/getWorkspaces';

const EVENT_MEMBER_ADDED = 'member.added';
const EVENT_WORKSPACE_MEMBER_ADDED = 'workspace.member_added';

/**
 * Best-effort hydration of the joiner's name/email from the org or workspace
 * member list, mirroring the Zapier triggers on main. Non-auth failures return
 * `{}` so the trigger still fires; only auth failures (surfaced by n8n's request
 * helper) propagate. The raw event envelope is preserved and friendly
 * `user_name` / `user_email` / `role` / `joined_at` fields are added on top.
 */
async function hydrate(context: IWebhookFunctions, envelope: IDataObject): Promise<IDataObject> {
	const type = envelope.type as string | undefined;
	const newState = (envelope.newState as IDataObject) ?? {};

	let member: IDataObject | undefined;
	try {
		if (type === EVENT_MEMBER_ADDED) {
			const res = (await skhemaApiRequest.call(context, 'GET', '/members')) as IDataObject;
			const members = (res.members as IDataObject[]) ?? [];
			member = members.find((m) => m.userId === newState.userId);
		} else if (type === EVENT_WORKSPACE_MEMBER_ADDED) {
			const workspaceId =
				(envelope.workspaceId as string) ??
				((envelope.metadata as IDataObject)?.workspaceId as string);
			if (workspaceId) {
				const res = (await skhemaApiRequest.call(
					context,
					'GET',
					`/workspaces/${workspaceId}/members`,
				)) as IDataObject;
				const members = (res.members as IDataObject[]) ?? [];
				member = members.find((m) => m.workspaceMemberId === newState.workspaceMemberId);
			}
		}
	} catch {
		// Hydration is additive, never blocking. Auth errors from the request
		// helper still throw (they are not caught here as they escape the helper),
		// so n8n reconnects rather than silently emitting blank user fields.
		member = undefined;
	}

	const output: IDataObject = {
		...envelope,
		user_name: (member?.name as string) ?? '',
		user_email: (member?.email as string) ?? '',
		role: newState.role ?? null,
		joined_at: member?.joinedAt ?? null,
	};

	// Flattened, filterable pending-compliance summaries for the workspace event.
	// n8n IF/Filter nodes can't do boolean logic over an array of objects, and a
	// real record with an empty array leaves the line-item shape unlearnable.
	if (type === EVENT_WORKSPACE_MEMBER_ADDED) {
		const pending = ((envelope.metadata as IDataObject)?.pendingCompliance as IDataObject[]) ?? [];
		output.has_pending_compliance = pending.length > 0;
		output.pending_compliance_count = pending.length;
		output.pending_compliance_names = pending.map((c) => (c.name as string) ?? '').join(', ');
	}

	return output;
}

export class SkhemaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Skhema Trigger',
		name: 'skhemaTrigger',
		icon: { light: 'file:../../icons/skhema.svg', dark: 'file:../../icons/skhema.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when a member joins the organization or a workspace',
		defaults: {
			name: 'Skhema Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'skhemaOAuth2Api',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [EVENT_MEMBER_ADDED],
				description: 'The Skhema events to subscribe to',
				options: [
					{
						name: 'New User',
						value: EVENT_MEMBER_ADDED,
						description: 'A new member joins your Skhema organization',
					},
					{
						name: 'New Workspace Member',
						value: EVENT_WORKSPACE_MEMBER_ADDED,
						description:
							'A new member joins a workspace (payload carries pendingCompliance for the member)',
					},
				],
			},
			{
				...workspaceLocator,
				displayName: 'Workspace',
				name: 'workspaceFilter',
				required: false,
				description:
					'Optional. Restrict New Workspace Member events to a single workspace; leave blank to fire for every workspace in the organization.',
				displayOptions: { show: { events: [EVENT_WORKSPACE_MEMBER_ADDED] } },
			},
		],
		usableAsTool: true,
	};

	methods = {
		listSearch: {
			// Backs the optional Workspace filter's "From List" mode (the shared
			// workspaceLocator references searchListMethod 'getWorkspaces', which
			// must be registered on every node that uses the locator).
			getWorkspaces,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpointId = webhookData.webhookId as string | undefined;
				if (!endpointId) {
					return false;
				}
				try {
					const res = (await skhemaApiRequest.call(this, 'GET', '/webhooks')) as IDataObject;
					const endpoints = (res.endpoints as IDataObject[]) ?? [];
					const exists = endpoints.some((e) => e.id === endpointId);
					if (!exists) {
						delete webhookData.webhookId;
					}
					return exists;
				} catch {
					// If the list call fails, assume the stored subscription is still
					// valid rather than creating a duplicate.
					return true;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];
				const res = (await skhemaApiRequest.call(this, 'POST', '/webhooks', {
					url: webhookUrl,
					subscribedEvents: events,
				})) as IDataObject;
				const endpoint = ((res.endpoint as IDataObject) ?? res) as IDataObject;
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = endpoint.id as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpointId = webhookData.webhookId as string | undefined;
				if (!endpointId) {
					return true;
				}
				try {
					await skhemaApiRequest.call(this, 'DELETE', `/webhooks/${endpointId}`);
				} catch {
					// DELETE is idempotent; treat a missing endpoint as already gone.
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const envelope = this.getBodyData() as IDataObject;
		const type = envelope.type as string | undefined;

		// Client-side workspace scoping for New Workspace Member (the subscription
		// is org-wide). Drop events for other workspaces without triggering.
		if (type === EVENT_WORKSPACE_MEMBER_ADDED) {
			const wanted = this.getNodeParameter('workspaceFilter', '', {
				extractValue: true,
			}) as string;
			const eventWorkspaceId =
				(envelope.workspaceId as string) ??
				((envelope.metadata as IDataObject)?.workspaceId as string);
			if (wanted && eventWorkspaceId !== wanted) {
				return {};
			}
		}

		const output = await hydrate(this, envelope);
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
