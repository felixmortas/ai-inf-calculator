import { describe, expect, it } from 'vitest';
import { hasConversationBlockContent } from './conversationContent';

const emptyBlock = { message: '', finalResponse: '', visibleReasoning: '', artifact: '' };

describe('hasConversationBlockContent', () => {
  it('ignore les champs et sources vides ou blancs', () => {
    expect(hasConversationBlockContent({ ...emptyBlock, message: '  ', sources: [{ text: '\n' }] })).toBe(false);
  });

  it('reconnaît chaque champ et une source non blanche comme contenu', () => {
    for (const block of [
      { ...emptyBlock, message: 'question' },
      { ...emptyBlock, finalResponse: 'réponse' },
      { ...emptyBlock, visibleReasoning: 'trace' },
      { ...emptyBlock, artifact: 'fichier.csv' },
      { ...emptyBlock, sources: [{ text: 'note locale' }] },
    ]) expect(hasConversationBlockContent(block)).toBe(true);
  });
});
