# @skhema/n8n-nodes-skhema

An [n8n](https://n8n.io) community node for [Skhema](https://skhema.com) — the
strategy platform. Trigger workflows when people join your organization or
projects, and create projects, strategy elements, and compliance
completions from any n8n workflow.

The node mirrors Skhema's Zapier and Make integrations exactly (same triggers,
actions, field semantics, and output shapes), so an automation recipe built on
one platform replicates on the others.

[Installation](#installation) · [Credentials](#credentials) · [Triggers](#trigger-node--skhema-trigger) · [Actions](#action-node--skhema) · [Example](#example-compliance-hand-off) · [Resources](#resources)

---

## Installation

Follow the n8n [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/):
in your n8n instance, go to **Settings → Community Nodes → Install** and enter
`@skhema/n8n-nodes-skhema`.

Self-hosted n8n requires **Node.js 20.19–24**.

## Credentials

The node authenticates with **Skhema OAuth2** (Authorization Code + PKCE, as a
public client — no client secret). A connection represents your Skhema
**organization**.

1. In Skhema, have an organization **owner or admin** register your n8n
   instance's OAuth callback URL under **Connections**:
   `https://<your-instance>/rest/oauth2-credential/callback`
   (for n8n Cloud: `https://<workspace>.app.n8n.cloud/rest/oauth2-credential/callback`).
   Skhema refuses OAuth flows targeting unregistered callbacks — this is what
   ties a connection to _your_ instance.
2. Add a new **Skhema OAuth2 API** credential in n8n. The Client ID is
   prefilled (Skhema's shared public client) and there is no secret to enter;
   the endpoints and scopes are pre-configured.
3. Click **Connect** and authorize as an organization admin or owner, selecting
   the organization the connection should act for.

> **Upgrading to 0.3.0:** delete and re-create your Skhema credential. Saved
> credentials keep the previous authorization endpoints, which no longer exist,
> and tokens issued by them can no longer be refreshed.

> **Upgrading to 0.4.0 (breaking, SK-415):** the _workspace_ concept is renamed
> to _project_ ecosystem-wide, with no compatibility aliases. The resource
> dropdown value `Workspace` is now `Project`; parameter names change from
> `workspace`/`workspaceMemberId`/`workspaceFilter` to
> `project`/`projectMemberId`/`projectFilter`; the trigger event moves from
> `workspace.member_added` to `project.member_added`; and every REST call moves
> from `/v1/workspaces…` to `/v1/projects…`. These parameter names are
> serialised into your saved workflow JSON, so **existing workflows will show
> the old parameters as unresolved after upgrading** — open each Skhema node
> and re-select its resource/operation; on the Skhema Trigger node, its saved
> **Events** value `workspace.member_added` must be re-selected as
> `project.member_added`. Re-map any expression that referenced `workspaceId`,
> `workspaceMemberId`, or `workspaceFilter` (e.g.
> `{{ $json.newState.workspaceMemberId }}` →
> `{{ $json.newState.projectMemberId }}`) to the new field names before
> reactivating the workflow.

## Trigger node — Skhema Trigger

Instant, webhook-backed trigger — no polling. Subscriptions are registered
automatically when the workflow is activated and removed when it is
deactivated. Pick one or both events:

| Event                  | Fires when                       | Payload highlights                                                                       |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| **New User**           | a member joins your organization | `user_name`, `user_email`, `role`, `joined_at`                                           |
| **New Project Member** | a member joins a project         | the above plus `projectName`, membership `source`, and `pendingCompliance` (see example) |

The New Project Member event also carries `has_pending_compliance`,
`pending_compliance_count`, and `pending_compliance_names` — flat fields that
are easy to filter on. An optional Project parameter restricts the trigger to
a single project; leave it empty to fire for every project in the
organization.

## Action node — Skhema

| Resource   | Operation                      | What it does                                        |
| ---------- | ------------------------------ | --------------------------------------------------- |
| Project    | **Create**                     | Create a project (name, visibility)                 |
| Project    | **Find**                       | Find a project by name or ID                        |
| Element    | **Create**                     | Create a strategy element in a project              |
| Compliance | **Find Requirement**           | List a project's compliance requirements            |
| Compliance | **Complete Member Compliance** | Mark a member's compliance requirement as satisfied |

**Create Element** understands Skhema's component → element-type structure: the
element-type options scope to the chosen component. Project, member, and
requirement fields accept values from dropdowns or — the common pattern —
mapped expressions from a trigger, e.g.
`{{ $json.newState.projectMemberId }}`.

## Example: compliance hand-off

Automate project compliance (e.g. NDAs) end to end:

1. **Skhema Trigger — New Project Member**, filtered on
   `has_pending_compliance` being true.
2. Your e-signature node (PandaDoc, DocuSign, …) sends the document to
   `user_email`.
3. On completion, **Skhema — Complete Member Compliance** marks the requirement
   satisfied — mapping `projectId`, `newState.projectMemberId`, and
   `metadata.pendingCompliance[0].id` straight from the trigger.

The trigger payload carries everything the completion action needs, so the
Skhema side of the workflow is exactly two nodes.

## Compatibility

- n8n on Node.js 20.19–24 (self-hosted)
- Tested against n8n 2.x

## Resources

- [Skhema](https://skhema.com) · [Skhema API documentation](https://skhema.com/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://opensource.org/licenses/MIT)
