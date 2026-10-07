import type { RefObject } from 'react';
import methodologyHtml from 'virtual:methodology-content';
import { fr } from '../i18n/fr';

export function Methodology({ titleRef, onReturn }: {
  readonly titleRef: RefObject<HTMLHeadingElement | null>;
  readonly onReturn: () => void;
}) {
  return (
    <section className="methodology" aria-labelledby="methodology-title">
      <button className="back-button" type="button" onClick={onReturn}><span aria-hidden="true">←</span> {fr.backAction}</button>
      <h1 id="methodology-title" ref={titleRef} tabIndex={-1}>{fr.methodologyTitle}</h1>
      <article className="methodology-content" dangerouslySetInnerHTML={{ __html: methodologyHtml }} />
    </section>
  );
}
