import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';

/** Bouton de langue de l’accueil : le libellé visible est la langue courante. */
export function LanguageMenu() {
  const { language, languages, messages, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingFocus = useRef(0);
  const menuId = useId();
  const current = languages.find((entry) => entry.code === language) ?? languages[0];

  function openMenu(focusIndex?: number) {
    pendingFocus.current = focusIndex ?? Math.max(0, languages.findIndex((entry) => entry.code === language));
    setOpen(true);
  }
  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  useEffect(() => { if (open) items.current[pendingFocus.current]?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('touchstart', onPointerDown); };
  }, [open]);

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); openMenu(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); openMenu(languages.length - 1); }
    else if (event.key === 'Escape' && open) { event.preventDefault(); close(true); }
  }
  function onMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const count = languages.length;
    const index = items.current.findIndex((item) => item === document.activeElement);
    const move = (next: number) => { event.preventDefault(); items.current[(next + count) % count]?.focus(); };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(count - 1);
    else if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div className="language-menu" ref={root}>
      <button
        ref={button}
        type="button"
        className="language-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${messages.languageMenuLabel} : ${current.label}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
      ><span aria-hidden="true">🌐</span> <span lang={current.code}>{current.label}</span></button>
      {open ? <ul id={menuId} role="menu" className="language-list" aria-label={messages.languageMenuLabel} onKeyDown={onMenuKeyDown}>
        {languages.map((entry, index) => (
          <li key={entry.code} role="none">
            <button
              ref={(node) => { items.current[index] = node; }}
              type="button"
              role="menuitemradio"
              aria-checked={entry.code === language}
              lang={entry.code}
              tabIndex={-1}
              onClick={() => { setLanguage(entry.code); close(true); }}
            >{entry.label}</button>
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
