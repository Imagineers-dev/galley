// New versions of a feature and of a piece of work from their latest ones: the fields given replace the old ones and
// an empty field changes nothing. The id, slug and address never change. Pure, so the merges are tested apart from
// the MCP tools.
const given = (change: Record<string, unknown>) => Object.fromEntries(Object.entries(change).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** `view: null` takes the feature's view away; `approval: null` takes its list mark away, with the reply behind it. */
export function changedFeature(old: Record<string, unknown>, change: Record<string, unknown>): Record<string, unknown> {
  const kept = { ...old };
  if (change.view === null) delete kept.view;
  if (change.approval === null) {
    delete kept.approval;
    delete kept.perItemReply;
  }
  return { ...kept, ...given(change) };
}

/** Any record's new version: a piece of work, the book's own title and description. */
export const changed = (old: Record<string, unknown>, change: Record<string, unknown>): Record<string, unknown> => ({ ...old, ...given(change) });
