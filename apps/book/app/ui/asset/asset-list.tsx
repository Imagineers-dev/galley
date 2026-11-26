// A list of assets, each a link to its page with what it is, its file and when it was attached.
import { type Asset, FORM_NAMES, formOf, sizeInWords } from '../../../lib/book/asset-types';
import { dayFull } from '../../../lib/book/format';
import type { Entry } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Card, CardTitle, Cards } from '../parts/card';
import styles from './asset-list.module.css';
import { AssetTags } from './asset-tags';

export function AssetList({ book, assets, tagged }: { book: string; assets: Entry<Asset>[]; tagged?: string }) {
  return (
    <Cards>
      {assets.map((a) => (
        <Card key={a.id} href={href.asset(book, a.id)}>
          <CardTitle>{a.body.title}</CardTitle>
          {a.body.about && <p className={styles.about}>{a.body.about}</p>}
          <p className={styles.meta}>
            {FORM_NAMES[formOf(a.body)]} · {sizeInWords(a.body.file.size)} · {dayFull(a.firstAt.slice(0, 10))}
            {a.body.folder ? ` · ${a.body.folder}` : ''}
          </p>
          {tagged !== undefined && <AssetTags book={book} tags={a.body.tags} on={tagged} />}
        </Card>
      ))}
    </Cards>
  );
}
