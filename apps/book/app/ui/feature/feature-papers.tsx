// A feature's three papers for the editor (Why, What you'll get, How it gets built), each with where it stands and
// opening its page. A list's items carry their own papers, so a list shows none here.
import { isPerItem } from '../../../lib/book/governing';
import { PAPER_NAMES } from '../../../lib/book/types';
import { type Current, papersOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { PaperCard, PaperCards } from '../paper-card';
import { Section } from '../parts/section';
import { Meta } from '../parts/text';

export function FeaturePapers({ book, now, featureId }: { book: string; now: Current; featureId: string }) {
  if (isPerItem(now, featureId)) return null;
  const papers = papersOf(now, featureId);
  return (
    <Section title="Its papers">
      {papers.every((p) => !p.editor) ? <Meta>No papers written for this feature yet.</Meta> : (
        <PaperCards across>
          {papers.map((p) => (
            <PaperCard key={p.kind} name={PAPER_NAMES[p.kind].name} paper={p.editor} state={p.state}
              to={href.featurePaper(book, featureId, p.kind)} absent="Not written yet" />
          ))}
        </PaperCards>
      )}
    </Section>
  );
}
