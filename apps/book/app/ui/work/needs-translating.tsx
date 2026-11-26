// A work follows its feature's What, but no agent has translated the current words, so no line can be proved yet.
import { Meta } from '../parts/text';

export function NeedsTranslating({ tests }: { tests: number }) {
  const stale = tests === 0 ? '' : ` ${tests} ${tests === 1 ? 'test was' : 'tests were'} written for it and ${tests === 1 ? 'is' : 'are'} out of date until then.`;
  return <Meta>This work follows its feature's What you'll get, which needs translating for agents before its lines can be proved.{stale}</Meta>;
}
