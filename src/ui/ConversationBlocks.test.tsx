import { fr } from '../i18n/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { CalculationBar } from './CalculationBar';
import { impactTexts } from './App';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { acceptsLocalSource, ConversationBlocks, formatExchangeQuantity, localSourceMaxBytes, readLocalSource } from './ConversationBlocks';
import {
  conversationReducer,
  impactFingerprint,
  initialConversationState,
  equivalenceFingerprint,
  ledFingerprint,
  summaryFingerprint,
} from '../application/conversationReducer';

async function startThread(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await user.click(screen.getByRole('button', { name: 'Continuer' }));
  return view;
}

async function editReference(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Modifier' }));
}

async function returnToThread(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continuer' }));
}

describe('composition de la conversation', () => {
  it('accepte uniquement les sources texte UTF-8 limitées et refuse les contenus vides ou illisibles', async () => {
    expect(acceptsLocalSource(new File(['texte'], 'note.md', { type: 'text/markdown' }))).toBe(true);
    expect(acceptsLocalSource(new File(['x'], 'image.png', { type: 'image/png' }))).toBe(false);
    expect(acceptsLocalSource(new File(['x'], 'long.txt', { type: 'text/plain' }) as File)).toBe(true);
    await expect(readLocalSource(new File([], 'vide.txt', { type: 'text/plain' }))).rejects.toThrow('empty');
    await expect(readLocalSource(new File([new Uint8Array([0xff])], 'illisible.txt', { type: 'text/plain' }))).rejects.toThrow();
    await expect(readLocalSource(new File([new Uint8Array([0, 1])], 'binaire.txt', { type: 'text/plain' }))).rejects.toThrow('binary');
    expect(localSourceMaxBytes).toBe(5 * 1024 * 1024);
    expect(acceptsLocalSource({ name: 'limite.txt', type: 'text/plain', size: localSourceMaxBytes })).toBe(true);
    expect(acceptsLocalSource({ name: 'trop-grand.txt', type: 'text/plain', size: localSourceMaxBytes + 1 })).toBe(false);
  });
  it('importe via le champ fichier, annonce les refus et permet le retrait', async () => {
    const user = userEvent.setup({ applyAccept: false });
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.click(screen.getByText('Ajouter une réflexion, un fichier créé ou des fichiers joints (optionnel)'));
    const input = screen.getByLabelText('Fichiers que vous avez joints');
    await user.upload(input, [
      new File(['contenu'], 'note.md', { type: 'text/markdown' }),
      new File(['image'], 'image.png', { type: 'image/png' }),
    ]);
    expect(await screen.findByText(/note.md \(7 octets\) — compté/)).toBeVisible();
    expect(await screen.findByText(/Fichier refusé \(image.png\)/)).toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', { name: 'Retirer le fichier note.md' }));
    expect(screen.queryByText(/note.md \(7 octets\) — compté/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    expect(screen.getByText(/Fichier refusé \(image.png\)/)).toBeVisible();
  });
  it('ajoute un bloc avec quatre champs libellés accessibles', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    expect(screen.getByLabelText('Collez ici votre message')).toBeVisible();
    expect(screen.getByLabelText('Collez ici la réponse de l’IA')).toBeVisible();
    expect(screen.getByLabelText('Réflexion affichée par l’IA (optionnel)')).not.toBeVisible();
    await user.click(screen.getByText('Ajouter une réflexion, un fichier créé ou des fichiers joints (optionnel)'));
    expect(screen.getByLabelText('Réflexion affichée par l’IA (optionnel)')).toBeVisible();
    expect(screen.getByLabelText('Contenu du fichier créé par l’IA (optionnel)')).toBeVisible();
  });

  it('affiche un bloc vide sans avertissement et rend « Calculer » indisponible avec explication', async () => {
    const user = userEvent.setup();
    await startThread(user);
    expect(screen.getByRole('button', { name: 'Calculer' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    const calculate = screen.getByRole('button', { name: 'Calculer' });
    expect(calculate).toHaveAttribute('aria-disabled', 'true');
    expect(calculate).not.toHaveAccessibleDescription();
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).not.toHaveTextContent(/Vide|À calculer/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    calculate.focus();
    await user.click(calculate);
    expect(calculate).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Résultat' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Collez ici votre message'), ' Bonjour ');
    expect(screen.getByRole('button', { name: 'Calculer' })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue(' Bonjour ');
  });

  it('isole deux blocs, replie le précédent à l’ajout et gère la suppression par dialogue modal', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'à supprimer');
    const firstId = screen.getByLabelText('Collez ici votre message').id;
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    const currentQuestion = screen.getByRole('textbox', { name: 'Collez ici votre message' });
    expect(currentQuestion).toHaveFocus();
    expect(currentQuestion.id).not.toBe(firstId);
    await user.type(currentQuestion, 'à conserver');
    const toggle = screen.getByRole('button', { name: 'Déplier la question / réponse 1' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('Question : à supprimer');
    await user.click(toggle);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const remove = screen.getByRole('button', { name: 'Supprimer la question / réponse 1' });
    await user.click(remove);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelector('.app-shell')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('.app-shell')).not.toHaveAttribute('inert');
    expect(remove).toHaveFocus();
    expect(screen.getAllByLabelText('Collez ici votre message')).toHaveLength(2);

    await user.click(remove);
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    expect(screen.getAllByLabelText('Collez ici votre message')).toHaveLength(1);
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('à conserver');
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveFocus();
  });

  it('supprime directement une question / réponse vide et place le focus sur « + Ajouter »', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer la question / réponse 1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Collez ici votre message')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Ajouter une question / réponse' })).toHaveFocus();
  });

  it('reste utilisable au clavier et ne persiste pas les blocs au nouveau montage', async () => {
    const user = userEvent.setup();
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const historyPush = vi.spyOn(History.prototype, 'pushState');
    const historyReplace = vi.spyOn(History.prototype, 'replaceState');
    const first = await startThread(user);
    const addExchange = screen.getByRole('button', { name: '+ Ajouter une question / réponse' });
    addExchange.focus();
    expect(addExchange).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.type(screen.getByLabelText('Collez ici votre message'), 'éphémère');
    expect(storageSet).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(storageClear).not.toHaveBeenCalled();
    expect(historyPush).not.toHaveBeenCalled();
    expect(historyReplace).not.toHaveBeenCalled();
    first.unmount();
    await startThread(user);
    expect(screen.queryByLabelText('Collez ici votre message')).not.toBeInTheDocument();
  });

  it('calcule d’un seul clic et n’offre ni calcul par échange ni recalcul du total', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    expect(screen.queryByLabelText('Impact pour cette question / réponse')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByLabelText('Impact pour cette question / réponse')).toBeVisible();
    expect(screen.getByLabelText(/Carbone :/)).toBeVisible();
    expect(screen.getByLabelText(/Eau :/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('À jour');
    expect(screen.queryByText(/Calculer cet échange uniquement|Calculer l’impact de cet échange/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recalculer/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Calculer' })).toHaveLength(1);
  });

  it('marque la carte « à recalculer » après une modification, retire ses valeurs et l’annonce une seule fois sans calculer', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByLabelText('Impact pour cette question / réponse');
    await user.type(screen.getByLabelText('Collez ici votre message'), ' encore');
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('À recalculer');
    expect(screen.queryByLabelText('Impact pour cette question / réponse')).not.toBeInTheDocument();
    expect(screen.getByText(/pour afficher un résultat à jour/)).toBeVisible();
    expect(document.querySelector('.metric-hero')).not.toBeInTheDocument();
    expect(screen.getAllByText(/à recalculer\./)).toHaveLength(1);
  });

  it('applique une constante avancée validée au calcul suivant', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const initialCarbon = (await screen.findByLabelText(/Carbone :/)).textContent;

    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    const batchSize = screen.getByLabelText('Taille de batch (tokens)');
    await user.clear(batchSize);
    await user.type(batchSize, '32');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: 'Déplier la question / réponse 1' }));
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect((await screen.findByLabelText(/Carbone :/)).textContent).not.toBe(initialCarbon);
  });

  it('applique le pays d’hébergement choisi aux calculs et au risque du bilan', async () => {
    const user = userEvent.setup();
    const french = await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    await user.selectOptions(screen.getByLabelText('Où est hébergée l’IA (pays des serveurs)'), 'FR');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const frenchCarbon = (await screen.findByLabelText(/Carbone :/)).textContent;
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const summary = await screen.findByRole('heading', { name: 'Résultat' });
    expect(summary.parentElement).toHaveTextContent('Carbone');
    french.unmount();

    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect((await screen.findByLabelText(/Carbone :/)).textContent).not.toBe(frenchCarbon);
  });

  it('calcule les seuls échanges renseignés puis affiche leur bilan et le risque pays', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.click(screen.getByRole('button', { name: 'Déplier la question / réponse 1' }));
    await user.type(screen.getAllByLabelText('Collez ici votre message')[0], 'Premier échange');
    await user.type(screen.getAllByLabelText('Collez ici votre message')[1], 'Deuxième échange plus long');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const summaryHeading = await screen.findByRole('heading', { name: 'Résultat' });
    expect(summaryHeading.parentElement).toHaveTextContent('Électricité');
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(2);
    expect(document.querySelectorAll('.result-section')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Une bonne pratique' })).toBeVisible();
  });

  it('calcule ensemble tous les échanges renseignés et ignore le vide', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Premier');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getAllByLabelText('Collez ici votre message')[1], 'Second');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    expect(screen.queryByRole('heading', { name: 'Une bonne pratique' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByRole('heading', { name: 'Résultat' })).toBeVisible();
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Question / réponse 3' })).not.toHaveTextContent(/Vide|À calculer/);
  });

  it('prépare les catégories dérivées complètes pour un bloc avec historique et artifact', () => {
    const blocks = [
      { blockId: 'one', message: 'message avant', visibleReasoning: 'raisonnement avant', finalResponse: 'réponse avant', artifact: 'artifact v1' },
      { blockId: 'two', message: 'message courant', visibleReasoning: 'raisonnement courant', finalResponse: 'réponse courante', artifact: 'artifact v2' },
    ];
    expect(impactTexts(blocks[1], prepareConversationHistory(blocks, 'two', 12))).toEqual({
      newInput: 'message courant',
      cachedInput: ['message avant', 'raisonnement avant', 'réponse avant', 'artifact v1'],
      output: ['réponse courante', 'raisonnement courant', 'v2'],
    });
  });

  it('ajoute les sources du bloc courant une seule fois à la nouvelle entrée', () => {
    const blocks = [
      { blockId: 'one', message: 'avant', sources: [{ text: 'source avant' }], visibleReasoning: '', finalResponse: '', artifact: '' },
      { blockId: 'two', message: 'courant', sources: [{ text: 'source courante' }], visibleReasoning: '', finalResponse: '', artifact: '' },
    ];
    expect(impactTexts(blocks[1], prepareConversationHistory(blocks, 'two', 0))).toMatchObject({
      newInput: 'courant\nsource courante', cachedInput: ['avant', 'source avant', '', '', ''], output: ['', '', ''],
    });
  });

  it('rend « Calculer » indisponible avec explication quand un paramètre est invalide et pendant le calcul', async () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const onCalculate = vi.fn();
    const invalid = conversationReducer(state, { type: 'parametersValidationFailed' });
    const view = render(<CalculationBar state={invalid} onCalculate={onCalculate} />);
    const button = screen.getByRole('button', { name: 'Calculer' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(/Mode avancé ou du Mode expert est invalide/);
    await userEvent.setup().click(button);
    expect(onCalculate).not.toHaveBeenCalled();
    view.unmount();
    const pending = conversationReducer(state, { type: 'summaryRequested', fingerprint: summaryFingerprint(state) });
    render(<CalculationBar state={pending} onCalculate={onCalculate} />);
    expect(screen.getByRole('status')).toHaveTextContent('Calcul en cours…');
  });

  it('annonce un échec de calcul près de l’action, sans conseils ni déplacement de focus', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint });
    state = conversationReducer(state, { type: 'summaryUnavailable', fingerprint, code: 'invalid-results' });
    render(<><ConversationBlocks state={state} dispatch={() => undefined} /><CalculationBar state={state} onCalculate={() => undefined} /></>);
    expect(screen.getByRole('alert')).toHaveTextContent('Le calcul a échoué');
    expect(document.body).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Une bonne pratique' })).not.toBeInTheDocument();
  });

  it('adapte les unités sans modifier les valeurs calculées et développe leur nom accessible', () => {
    expect(formatExchangeQuantity(0, 'carbon', fr, 'fr-FR')).toEqual({ display: '0 gCO₂e', accessible: '0 grammes de dioxyde de carbone équivalent' });
    expect(formatExchangeQuantity(0.0000000001, 'carbon', fr, 'fr-FR').display).toBe('< 0,001 µgCO₂e');
    expect(formatExchangeQuantity(0.0012, 'carbon', fr, 'fr-FR')).toEqual({ display: '1,2 mgCO₂e', accessible: '1,2 milligrammes de dioxyde de carbone équivalent' });
    expect(formatExchangeQuantity(1, 'carbon', fr, 'fr-FR').display).toBe('1 gCO₂e');
    expect(formatExchangeQuantity(999.9, 'carbon', fr, 'fr-FR').display).toBe('1 kgCO₂e');
    expect(formatExchangeQuantity(0.002, 'water', fr, 'fr-FR')).toEqual({ display: '2 mL', accessible: '2 millilitres d’eau' });
  });

  it('réserve la mention de repli Monde au bilan, pas à la carte compacte', () => {
    const fingerprint = impactFingerprint(initialConversationState);
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const blockFingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: blockFingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'one', fingerprint: blockFingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
      factorSources: { pue: 'world', wue: 'country', carbonIntensity: 'country' },
    });
    render(<ConversationBlocks state={state} dispatch={() => undefined}  />);
    expect(screen.getByLabelText('Impact pour cette question / réponse')).toBeVisible();
    expect(screen.queryByText(/donnée de repli « Monde »/)).not.toBeInTheDocument();
    expect(fingerprint).toBeTypeOf('string');
  });

  it('montre carbone et eau sur une carte calculée repliée avec les unités développées accessibles', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'blockAdded', blockId: 'two' });
    render(<ConversationBlocks state={state} dispatch={() => undefined}  />);

    const first = within(screen.getByRole('region', { name: 'Question / réponse 1' }));
    expect(first.getByRole('button', { name: 'Déplier la question / réponse 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(first.getByLabelText('🪨 Carbone : 2 grammes de dioxyde de carbone équivalent')).toHaveTextContent('🪨 2 gCO₂e');
    expect(first.getByLabelText('💧 Eau : 3 litres d’eau')).toHaveTextContent('💧 3 L');
  });

  it('garde les deux aperçus et les avis d’import visibles sur une ancienne carte repliée', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Pourquoi ?' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'finalResponse', value: 'Voir sandbox:/mnt/data/rapport.csv et fileciteturn0file0' });
    state = conversationReducer(state, { type: 'blockAdded', blockId: 'two' });
    render(<ConversationBlocks state={state} dispatch={() => undefined}  />);
    const first = screen.getByRole('region', { name: 'Question / réponse 1' });
    expect(first).toHaveTextContent('Question : Pourquoi ?');
    expect(first).toHaveTextContent('Réponse : Voir sandbox:/mnt/data/rapport.csv');
    expect(first).toHaveTextContent('Fichier créé par l’IA cité');
    expect(first).toHaveTextContent('Fichier joint cité');
    expect(screen.getByRole('button', { name: 'Déplier la question / réponse 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(first.querySelector('.block-editor')).not.toBeVisible();
  });

  it('réserve la durée de douche au bilan même si une équivalence individuelle existe en mémoire', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'userCountrySelected', country: 'ID' });
    const shower = equivalenceFingerprint(state, 2);
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', blockId: 'one', fingerprint: shower, equivalence: { status: 'available', seconds: 1, factorSource: 'world' } });
    render(<ConversationBlocks state={state} dispatch={() => undefined}  />);
    expect(screen.queryByText(/🚿 Comparaison : environ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/facteur carbone de repli « Monde »/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Énergie:/)).not.toBeInTheDocument();
  });

  it('masque un impact périmé et marque la carte « à recalculer »', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
    });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonsoir' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} />);
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('↻ À recalculer');
    expect(screen.queryByText('Énergie: 1 Wh')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Impact pour cette question / réponse')).not.toBeInTheDocument();
  });

  it('affiche une seule bonne pratique stable dans le résultat à jour, jamais avant ce résultat', () => {
    const renderBlocks = (state = initialConversationState) => render(
      <ConversationBlocks state={state} dispatch={() => undefined}  />,
    );
    const empty = renderBlocks();
    expect(screen.queryByRole('heading', { name: 'Une bonne pratique' })).not.toBeInTheDocument();
    empty.unmount();

    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockAdded', blockId: 'two' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'two', field: 'message', value: 'Bonsoir' });
    const firstFingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: firstFingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'one', fingerprint: firstFingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
    });
    const secondFingerprint = impactFingerprint(state, 'two');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'two', fingerprint: secondFingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'two', fingerprint: secondFingerprint, impact: { energyWh: 4, carbonGco2e: 5, waterL: 6 },
    });
    const summaryCurrentFingerprint = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint: summaryCurrentFingerprint });
    state = conversationReducer(state, {
      type: 'summaryResolved', fingerprint: summaryCurrentFingerprint,
      total: { energyWh: 5, carbonGco2e: 7, waterL: 9 },
    });
    state = conversationReducer(state, { type: 'ledEquivalenceResolved', fingerprint: ledFingerprint(state, 5), equivalence: { status: 'available', seconds: 3600 } });
    const random = vi.fn(() => 0.5);
    const current = render(<ConversationBlocks state={state} dispatch={() => undefined} random={random} />);
    const practices = screen.getByRole('region', { name: 'Une bonne pratique' });
    expect(practices).toHaveTextContent('Créez des branches de conversation en modifiant un message. Cela maintient également un contexte propre.');
    expect(practices.querySelectorAll('li')).toHaveLength(0);
    current.rerender(<ConversationBlocks state={state} dispatch={() => undefined} random={random} />);
    expect(random).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'Une bonne pratique' })).toHaveTextContent('Créez des branches');
    expect(document.querySelector('.result-section')).toContainElement(practices);
    const link = screen.getByRole('link', { name: 'Voir les bonnes pratiques (s’ouvre dans un nouvel onglet)' });
    expect(link).toHaveAttribute('href', 'https://example.org/bonnes-pratiques-ia');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText(/En savoir plus/)).not.toBeInTheDocument();
    current.unmount();

    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Modifié' });
    renderBlocks(state);
    expect(screen.queryByRole('heading', { name: 'Une bonne pratique' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Résultat' })).toBeVisible();
    expect(screen.getByText(/pour afficher un résultat à jour/)).toBeVisible();
    expect(document.querySelector('.result-section')).not.toHaveTextContent(/\d+(,\d+)? (g|mg|Wh|L)/);
    expect(document.querySelectorAll('.exchange-status.impact-stale')).toHaveLength(2);
  });

  it('présente le résultat à jour dans l’ordre douche, carbone, eau, électricité, LED, phrase, périmètre, pratique, lien', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fp = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: fp });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint: fp, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    const sf = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint: sf });
    state = conversationReducer(state, { type: 'summaryResolved', fingerprint: sf, total: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', fingerprint: equivalenceFingerprint(state, 2), equivalence: { status: 'available', seconds: 90, factorSource: 'country' } });
    state = conversationReducer(state, { type: 'ledEquivalenceResolved', fingerprint: ledFingerprint(state, 1), equivalence: { status: 'available', seconds: 720 } });
    render(<ConversationBlocks state={state} dispatch={() => undefined} random={() => 0} />);
    const text = document.querySelector('.result-section')!.textContent!.replace(/\s/gu, ' ');
    const order = ['douche chaude', 'Carbone', 'Eau', 'Électricité', 'Ampoule LED allumée (5 W)', '12 min', 'Une conversation pèse peu', '100 conversations', 'Ne compte que l’électricité des serveurs', 'pas sur une mesure', 'Une bonne pratique', 'Voir les bonnes pratiques'];
    const positions = order.map((part) => text.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
    expect(document.querySelector('.metric-hero')).toHaveTextContent('1,5 min');
    expect(screen.queryByRole('link', { name: /méthodologie/i })).not.toBeInTheDocument();
  });

  it('indique « Comparaison non calculable » près de la LED sans toucher au reste du résultat', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fp = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: fp });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint: fp, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    const sf = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint: sf });
    state = conversationReducer(state, { type: 'summaryResolved', fingerprint: sf, total: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', fingerprint: equivalenceFingerprint(state, 2), equivalence: { status: 'available', seconds: 90, factorSource: 'country' } });
    state = conversationReducer(state, { type: 'ledEquivalenceResolved', fingerprint: ledFingerprint(state, 1), equivalence: { status: 'unavailable' } });
    render(<ConversationBlocks state={state} dispatch={() => undefined} />);
    expect(screen.getByText('Comparaison non calculable')).toBeVisible();
    expect(document.querySelector('.metric-hero')).toBeInTheDocument();
    expect(screen.getByText('⚡️ Électricité').closest('li')).toHaveTextContent('1 Wh');
  });

  it('ne périme que la ligne LED quand seule la puissance de l’ampoule change', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fp = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: fp });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint: fp, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    const sf = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint: sf });
    state = conversationReducer(state, { type: 'summaryResolved', fingerprint: sf, total: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', fingerprint: equivalenceFingerprint(state, 2), equivalence: { status: 'available', seconds: 90, factorSource: 'country' } });
    state = conversationReducer(state, { type: 'ledEquivalenceResolved', fingerprint: ledFingerprint(state, 1), equivalence: { status: 'available', seconds: 720 } });
    state = conversationReducer(state, { type: 'parametersApplied', overrides: { shower: { ledPowerW: 9 } } });
    render(<ConversationBlocks state={state} dispatch={() => undefined} />);
    expect(screen.getByText(/Ampoule LED allumée/).closest('li')).toHaveTextContent('À recalculer');
    expect(document.querySelector('.metric-hero')).toHaveTextContent('1,5 min');
    expect(screen.getByText('🪨 Carbone').closest('li')).toHaveTextContent('2 gCO₂e');
    expect(screen.queryByText(/pour afficher un résultat à jour/)).not.toBeInTheDocument();
  });

  it('affiche carte repliée à jour avec « ✓ » et sans action de calcul', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    render(<ConversationBlocks state={state} dispatch={() => undefined} />);
    const card = within(screen.getByRole('region', { name: 'Question / réponse 1' }));
    expect(card.getByText(/✓/)).toBeVisible();
    expect(card.getByText(/Question :/).closest('p')).toHaveTextContent('Bonjour');
    expect(card.getByRole('button', { name: 'Déplier la question / réponse 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(card.queryByRole('button', { name: /Calculer/ })).not.toBeInTheDocument();
  });

  it('calcule le bilan et les cartes ensemble depuis l’application', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Un échange déjà calculé');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const summary = await screen.findByRole('heading', { name: 'Résultat' });
    expect(summary.parentElement).toHaveTextContent('Électricité');
    expect(summary).toHaveFocus();
  });

  it('actualise l’équivalence du bilan après un changement de pays sans recalculer le bloc', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.selectOptions(screen.getByLabelText('Pays estimé : où vous vous trouvez'), 'US');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bilan conservé');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });
    const summaryEnergy = screen.getByText('⚡️ Électricité').closest('li')!.textContent;

    await editReference(user);
    await user.selectOptions(screen.getByLabelText('Pays estimé : où vous vous trouvez'), 'FR');
    await returnToThread(user);
    expect(screen.getByText(/comparaison avec la douche est à recalculer/i)).toBeVisible();
    expect(screen.getByText(/2 résultats dépendants sont à recalculer/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Résultat' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Calculer' }));

    expect(document.querySelector('.metric-hero')).toHaveTextContent(/Environ .* de douche chaude/);
    expect(screen.getByText('⚡️ Électricité').closest('li')!.textContent).toBe(summaryEnergy);
  });

  it('ouvre les hypothèses depuis le bilan, conserve la session et annonce leur péremption après application puis restauration', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Question conservée');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });

    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    expect(screen.getByLabelText('PUE (sans unité)')).toBeVisible();
    await user.clear(screen.getByLabelText('PUE (sans unité)'));
    await user.type(screen.getByLabelText('PUE (sans unité)'), '1.2');
    await returnToThread(user);
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('Question conservée');
    expect(screen.getAllByText(/résultats dépendants sont à recalculer/)).toHaveLength(1);
    expect(screen.getByText(/pour afficher un résultat à jour/)).toBeVisible();
    expect(document.querySelector('.metric-hero')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier' })).toHaveFocus();

    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveValue(1.2);
    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveValue(1.14);
    await returnToThread(user);
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('Question conservée');
    expect(screen.getByText(/pour afficher un résultat à jour/)).toBeVisible();
    expect(document.querySelector('.metric-hero')).not.toBeInTheDocument();
  });

  it('réserve le repli de la douche au bilan calculé', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.selectOptions(screen.getByLabelText('Pays estimé : où vous vous trouvez'), 'ID');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Repli mondial');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });

    expect(screen.getByText(/valeur « Monde » est une estimation, que vous pouvez corriger/)).toBeVisible();
  });
});
