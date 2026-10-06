import type { RefObject } from 'react';
import methodologyHtml from 'virtual:methodology-content';
import { fr } from '../i18n/fr';

export function Methodology({ titleRef, onReturn }: {
  readonly titleRef: RefObject<HTMLHeadingElement | null>;
  readonly onReturn: () => void;
}) {
  return (
    <section className="methodology" aria-labelledby="methodology-title">
      <h2 id="methodology-title" ref={titleRef} tabIndex={-1}>{fr.methodologyTitle}</h2>
      <button className="icon-button below-title" type="button" aria-label={fr.methodologyReturnAction} onClick={onReturn}>←</button>
      <article className="methodology-content" dangerouslySetInnerHTML={{ __html: methodologyHtml }} />
    </section>
  );
}
