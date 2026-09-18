import { useReducer } from 'react';
import { conversationReducer, initialConversationState } from '../application/conversationReducer';
import { fr } from '../i18n/fr';
import { ConversationConfiguration } from './ConversationConfiguration';
import './styles.css';

export function App() {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);

  return (
    <main className="app-shell">
      <header>
        <h1>{fr.title}</h1>
        <p>{fr.introduction}</p>
      </header>
      <ConversationConfiguration state={state} dispatch={dispatch} />
      <section aria-labelledby="conversation-title" className="conversation-placeholder">
        <h2 id="conversation-title">{fr.conversationLabel}</h2>
        <p>{fr.conversationPlaceholder}</p>
      </section>
    </main>
  );
}
