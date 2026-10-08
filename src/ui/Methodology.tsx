import type { RefObject } from 'react';
import methodologyHtml from 'virtual:methodology-content';
import { useI18n } from '../i18n/I18nProvider';
import { Icon } from './Icons';

export function Methodology({ titleRef, onReturn }: {
  readonly titleRef: RefObject<HTMLHeadingElement | null>;
  readonly onReturn: () => void;
}) {
  const { messages, language } = useI18n();
  const html = methodologyHtml[language] ?? methodologyHtml.fr;
  return (
    <section className="methodology" aria-labelledby="methodology-title">
      <button className="back-button" type="button" onClick={onReturn}><Icon name="back" /> {messages.backAction}</button>
      <h1 id="methodology-title" ref={titleRef} tabIndex={-1}>{messages.methodologyTitle}</h1>
      <article className="methodology-content" lang={methodologyHtml[language] ? undefined : 'fr'} dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
