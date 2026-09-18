import { useReducer } from 'react';
import { conversationReducer, initialConversationState } from '../application/conversationReducer';
import { fr } from '../i18n/fr';
import { ConversationConfiguration } from './ConversationConfiguration';
import { ConversationBlocks } from './ConversationBlocks';
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
      <ConversationBlocks state={state} dispatch={dispatch} />
    </main>
  );
}
