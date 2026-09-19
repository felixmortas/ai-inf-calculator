import { describe, expect, it } from 'vitest';
import { previewConversationImport } from './conversationPreview';

describe('prévisualisation générique de conversation importée', () => {
  it('groupe le message, les traces ordonnées et la première réponse finale sans connaître le fournisseur', () => {
    const preview = previewConversationImport([
      { role: 'user', text: 'Question publique', order: 1 },
      { role: 'tool', text: 'The output of this plugin was redacted.', order: 2 },
      { role: 'assistant', text: 'bash -lc cat agent/SKILL.md', order: 3 },
      { role: 'assistant', text: '```ts\nconst value = 1\n```', order: 4 },
      { role: 'assistant', text: 'Réfléchi pendant 6s', order: 5 },
      { role: 'assistant', text: 'Chemin /mnt/data/export.csv', order: 6 },
      { role: 'assistant', text: 'Réponse finale fileciteturn0file0L1-L2 [artifact](sandbox:/mnt/data/x.csv)', order: 7 },
      { role: 'assistant', text: 'trop tard', order: 8 },
    ]);
    expect(preview.blocks).toEqual([{
      message: 'Question publique', artifact: '',
      visibleReasoning: 'The output of this plugin was redacted.\n\nbash -lc cat agent/SKILL.md\n\n```ts\nconst value = 1\n```\n\nRéfléchi pendant 6s\n\nChemin /mnt/data/export.csv',
      finalResponse: 'Réponse finale fileciteturn0file0L1-L2 [artifact](sandbox:/mnt/data/x.csv)',
      inaccessible: ['artifact', 'source-file'],
    }]);
    expect(preview.warnings.map(({ code }) => code)).toEqual(['unattributed-event', 'artifact-detected', 'source-file-detected']);
  });

  it('signale un événement avant utilisateur, une réponse après clôture et un utilisateur sans réponse', () => {
    const preview = previewConversationImport([
      { role: 'assistant', text: 'sans propriétaire', order: 1 },
      { role: 'user', text: 'un', order: 2 },
      { role: 'assistant', text: 'réponse', order: 3 },
      { role: 'tool', text: 'après', order: 4 },
      { role: 'user', text: 'deux', order: 5 },
    ]);
    expect(preview.blocks.map(({ message, finalResponse }) => [message, finalResponse])).toEqual([['un', 'réponse'], ['deux', '']]);
    expect(preview.warnings.map(({ code }) => code)).toEqual(['unattributed-event', 'unattributed-event', 'incomplete-user']);
  });

  it('utilise l’ordre normalisé plutôt que l’ordre du tableau et garde l’ordre de la réponse pour les avertissements', () => {
    const preview = previewConversationImport([
      { role: 'assistant', text: 'Réponse [artifact](sandbox:/mnt/data/export.csv)', order: 2 },
      { role: 'user', text: 'Question', order: 1 },
    ]);
    expect(preview.blocks[0]).toMatchObject({ message: 'Question', finalResponse: 'Réponse [artifact](sandbox:/mnt/data/export.csv)' });
    expect(preview.warnings).toContainEqual(expect.objectContaining({ code: 'artifact-detected', eventOrder: 2 }));
  });
});
