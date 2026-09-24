import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { impactTexts } from './App';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { acceptsLocalSource, ConversationBlocks, formatExchangeQuantity, formatImpact, localSourceMaxBytes, readLocalSource } from './ConversationBlocks';
import {
  conversationReducer,
  impactFingerprint,
  initialConversationState,
  showerFingerprint,
  summaryFingerprint,
} from '../application/conversationReducer';

async function startThread(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
  await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
  return view;
}

async function editReference(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
}

async function returnToThread(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
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
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByText('Ajouter des contenus facultatifs'));
    const input = screen.getByLabelText('Fichiers source locaux');
    await user.upload(input, [
      new File(['contenu'], 'note.md', { type: 'text/markdown' }),
      new File(['image'], 'image.png', { type: 'image/png' }),
    ]);
    expect(await screen.findByText(/note.md \(7 octets\) — compté/)).toBeVisible();
    expect(await screen.findByText(/Fichier refusé \(image.png\)/)).toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', { name: 'Retirer le fichier note.md' }));
    expect(screen.queryByText(/note.md \(7 octets\) — compté/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByText(/Fichier refusé \(image.png\)/)).toBeVisible();
  });
  it('ajoute un bloc avec quatre champs libellés accessibles', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByLabelText('Question de la personne')).toBeVisible();
    expect(screen.getByLabelText('Réponse du chatbot')).toBeVisible();
    expect(screen.getByLabelText('Raisonnement visible')).not.toBeVisible();
    await user.click(screen.getByText('Ajouter des contenus facultatifs'));
    expect(screen.getByLabelText('Raisonnement visible')).toBeVisible();
    expect(screen.getByLabelText('Document ou code généré (facultatif)')).toBeVisible();
  });

  it('importe via le registre, conserve les avis de contenus inaccessibles, puis ajoute un échange manuel', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue(new Response('<html><script data-mistral-share>{"messages":[{"role":"user","content":"Question"},{"role":"assistant","content":"Réponse","attachments":[{"name":"a.csv"}]}]}</script></html>', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetch);

    try {
      render(<App />);
      await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
      fireEvent.change(screen.getByLabelText('Lien de partage'), { target: { value: 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000' } });
      await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
      await user.click(await screen.findByRole('button', { name: 'Continuer avec le Worker' }));
      await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });
      expect(screen.getByText('Événement public non attribué après la réponse finale.')).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
      expect(screen.getByRole('heading', { name: 'Choisir le chatbot et le modèle' })).toHaveFocus();
      await user.selectOptions(screen.getByLabelText('Mode Mistral'), 'fast');
      await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
      expect(screen.getByLabelText('Question de la personne')).toHaveValue('Question');
      await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
      expect(screen.getAllByLabelText('Question de la personne')).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });

  it('signale un bloc vide comme ignoré et conserve le texte renseigné durant la session', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByText('Ce bloc sera ignoré pour les calculs futurs.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Calculer cet échange' })).toBeDisabled();
    expect(screen.getByText('Saisissez un échange avant de lancer un calcul.')).toBeVisible();
    await user.type(screen.getByLabelText('Question de la personne'), ' Bonjour ');
    expect(screen.queryByText('Ce bloc sera ignoré pour les calculs futurs.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Question de la personne')).toHaveValue(' Bonjour ');
  });

  it('isole deux blocs, génère des identifiants distincts et déplace le focus après une suppression ciblée', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'à supprimer');
    const firstId = screen.getByLabelText('Question de la personne').id;
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    const currentQuestion = screen.getByRole('textbox', { name: 'Question de la personne' });
    expect(currentQuestion).toHaveFocus();
    expect(currentQuestion.id).not.toBe(firstId);
    await user.type(currentQuestion, 'à conserver');
    const toggle = screen.getByRole('button', { name: 'Déplier l’échange 1' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: 'Échange 1' })).toHaveTextContent('Question : à supprimer');
    expect(screen.queryByRole('button', { name: 'Supprimer l’échange 1' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Supprimer l’échange 1' }));
    expect(screen.getByText('Supprimer l’échange 1 et ses textes ?')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('button', { name: 'Supprimer l’échange 1' })).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Échange 1' }).querySelector('.conversation-preview')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer l’échange 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    expect(screen.getAllByLabelText('Question de la personne')).toHaveLength(1);
    expect(screen.getByLabelText('Question de la personne')).toHaveValue('à conserver');
    expect(screen.getByRole('button', { name: 'Ajouter un échange' })).toHaveFocus();
  });

  it('reste utilisable au clavier et ne persiste pas les blocs au nouveau montage', async () => {
    const user = userEvent.setup();
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const historyPush = vi.spyOn(History.prototype, 'pushState');
    const historyReplace = vi.spyOn(History.prototype, 'replaceState');
    const first = await startThread(user);
    const addExchange = screen.getByRole('button', { name: 'Ajouter un échange' });
    addExchange.focus();
    expect(addExchange).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.type(screen.getByLabelText('Question de la personne'), 'éphémère');
    expect(storageSet).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(storageClear).not.toHaveBeenCalled();
    expect(historyPush).not.toHaveBeenCalled();
    expect(historyReplace).not.toHaveBeenCalled();
    first.unmount();
    await startThread(user);
    expect(screen.queryByLabelText('Question de la personne')).not.toBeInTheDocument();
  });

  it('calcule explicitement un seul échange et affiche ses impacts avec leurs limites', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    expect(await screen.findByText('Estimation pour cet échange')).toBeVisible();
    expect(screen.getByText(/Carbone :/)).toBeVisible();
    expect(screen.getByText(/Eau :/)).toBeVisible();
    expect(screen.queryByText(/Énergie:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Estimation incertaine/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Calculer cet échange' })).toHaveLength(1);
  });

  it('applique une constante avancée validée au calcul suivant', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    const initialCarbon = (await screen.findByText(/Carbone :/)).textContent;

    await editReference(user);
    await user.click(screen.getByText('Paramètres avancés'));
    const alpha = screen.getByLabelText('Constante énergie alpha (Wh/token)');
    await user.clear(alpha);
    await user.type(alpha, '0.00001');
    await user.click(screen.getByRole('button', { name: 'Appliquer les paramètres' }));
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: 'Recalculer cet échange' }));
    expect((await screen.findByText(/Carbone :/)).textContent).not.toBe(initialCarbon);
  });

  it('applique le pays d’hébergement choisi aux calculs et au risque du bilan', async () => {
    const user = userEvent.setup();
    const french = await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays d’hébergement'), 'FR');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    const frenchCarbon = (await screen.findByText(/Carbone :/)).textContent;
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    const summary = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    expect(summary.parentElement).toHaveTextContent('Medium - High (0.6-0.8)');
    expect(summary.parentElement).toHaveTextContent('Carbone:');
    french.unmount();

    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    expect((await screen.findByText(/Carbone :/)).textContent).not.toBe(frenchCarbon);
  });

  it('calcule les seuls échanges renseignés puis affiche leur bilan et le risque pays', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByRole('button', { name: 'Déplier l’échange 1' }));
    await user.type(screen.getAllByLabelText('Question de la personne')[0], 'Premier échange');
    await user.type(screen.getAllByLabelText('Question de la personne')[1], 'Deuxième échange plus long');
    await user.click(screen.getByRole('button', { name: 'Tout calculer' }));
    const summaryHeading = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    const summaryEnergy = Number(summaryHeading.parentElement!.textContent!.match(/Énergie: ([\d,]+)/)![1].replace(',', '.'));
    expect(document.querySelectorAll('.impact-result')).toHaveLength(2);
    expect(screen.getAllByText(/Énergie:/)).toHaveLength(1);
    expect(summaryEnergy).toBeGreaterThan(0);
    expect(screen.getByText(/Risque de sécheresse du pays d’hébergement:/)).toBeVisible();
  });

  it('invite à saisir un échange sans afficher de bilan si tous les blocs sont vides', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Tout calculer' }));
    expect(screen.getByText('Saisissez au moins un échange avant de calculer le bilan.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Bilan de la conversation' })).not.toBeInTheDocument();
  });

  it('signale un risque de sécheresse indisponible sans inventer de niveau', () => {
    const fingerprint = impactFingerprint(initialConversationState);
    let state = conversationReducer(initialConversationState, { type: 'summaryRequested', fingerprint });
    state = conversationReducer(state, {
      type: 'summaryResolved', fingerprint,
      total: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
      droughtRisk: { status: 'unavailable' },
    });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByText(/Risque de sécheresse du pays d’hébergement:/)).toHaveTextContent('Indisponible pour ce pays d’hébergement');
    expect(screen.getByRole('heading', { name: 'Bonnes pratiques de sobriété' })).toBeVisible();
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

  it('formate quatre chiffres significatifs et annonce un blocage de données', () => {
    expect(formatImpact(0.00123456)).toBe('0,001235');
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    state = conversationReducer(state, { type: 'impactBlocked', blockId: 'one', fingerprint: impactFingerprint(state, 'one'), code: 'invalid-data' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('donnée indispensable');
    expect(screen.queryByRole('heading', { name: 'Bonnes pratiques de sobriété' })).not.toBeInTheDocument();
  });

  it('adapte les unités sans modifier les valeurs calculées et développe leur nom accessible', () => {
    expect(formatExchangeQuantity(0, 'carbon')).toEqual({ display: '0 gCO₂e', accessible: '0 grammes de dioxyde de carbone équivalent' });
    expect(formatExchangeQuantity(0.0000000001, 'carbon').display).toBe('< 0,001 µgCO₂e');
    expect(formatExchangeQuantity(0.0012, 'carbon')).toEqual({ display: '1,2 mgCO₂e', accessible: '1,2 milligrammes de dioxyde de carbone équivalent' });
    expect(formatExchangeQuantity(1, 'carbon').display).toBe('1 gCO₂e');
    expect(formatExchangeQuantity(999.9, 'carbon').display).toBe('1 kgCO₂e');
    expect(formatExchangeQuantity(0.002, 'water')).toEqual({ display: '2 mL', accessible: '2 millilitres d’eau' });
  });

  it('annonce explicitement le repli Monde auprès du résultat concerné', () => {
    const fingerprint = impactFingerprint(initialConversationState);
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const blockFingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint: blockFingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'one', fingerprint: blockFingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
      factorSources: { pue: 'world', wue: 'country', carbonIntensity: 'country' },
    });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByText(/donnée de repli « Monde »/)).toBeVisible();
    expect(fingerprint).toBeTypeOf('string');
  });

  it('montre carbone et eau sur une carte calculée repliée avec les unités développées accessibles', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'blockAdded', blockId: 'two' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);

    const first = within(screen.getByRole('region', { name: 'Échange 1' }));
    expect(first.getByRole('button', { name: 'Déplier l’échange 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(first.getByText('2 gCO₂e')).toBeVisible();
    expect(first.getByText('3 L')).toBeVisible();
    expect(first.getByText('2 grammes de dioxyde de carbone équivalent')).toHaveClass('visually-hidden');
    expect(first.getByText('3 litres d’eau')).toHaveClass('visually-hidden');
    expect(first.getByText('2 gCO₂e')).toHaveAttribute('aria-hidden', 'true');
    expect(first.getByText('3 L')).toHaveAttribute('aria-hidden', 'true');
  });

  it('garde les deux aperçus et les avis d’import visibles sur une ancienne carte repliée', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Pourquoi ?' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'finalResponse', value: 'Voir sandbox:/mnt/data/rapport.csv et fileciteturn0file0' });
    state = conversationReducer(state, { type: 'blockAdded', blockId: 'two' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    const first = screen.getByRole('region', { name: 'Échange 1' });
    expect(first).toHaveTextContent('Question : Pourquoi ?');
    expect(first).toHaveTextContent('Réponse : Voir sandbox:/mnt/data/rapport.csv');
    expect(first).toHaveTextContent('Artifact détecté');
    expect(first).toHaveTextContent('Fichier source détecté');
    expect(screen.getByRole('button', { name: 'Déplier l’échange 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(first.querySelector('.block-actions')).not.toBeVisible();
  });

  it('réserve la durée de douche au bilan même si une équivalence individuelle existe en mémoire', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'userCountrySelected', country: 'ID' });
    const shower = showerFingerprint(state, 2);
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', blockId: 'one', fingerprint: shower, equivalence: { status: 'available', seconds: 1, factorSource: 'world' } });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.queryByText(/Estimation : environ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/facteur carbone de repli « Monde »/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Énergie:/)).not.toBeInTheDocument();
  });

  it('masque un impact périmé, explique le recalcul et liste les échanges bloquants', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, {
      type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
    });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonsoir' });
    state = conversationReducer(state, { type: 'summaryRecalculationRequested', fingerprint: summaryFingerprint(state) });

    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);

    expect(screen.getByText(/Ce résultat est périmé/)).toBeVisible();
    expect(screen.queryByText('Énergie: 1 Wh')).not.toBeInTheDocument();
    expect(screen.getByText('L’échange 1 doit être calculé ou recalculé.')).toBeVisible();
  });

  it('affiche après tous les résultats actuels une liste sémantique des cinq conseils, mais jamais sans résultat actuel', () => {
    const renderBlocks = (state = initialConversationState) => render(
      <ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />,
    );
    const empty = renderBlocks();
    expect(screen.queryByRole('heading', { name: 'Bonnes pratiques de sobriété' })).not.toBeInTheDocument();
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
      total: { energyWh: 5, carbonGco2e: 7, waterL: 9 }, droughtRisk: { status: 'available', level: 'Low', source: 'country' },
    });
    const current = renderBlocks(state);
    const heading = screen.getByRole('heading', { name: 'Bonnes pratiques de sobriété' });
    const practices = screen.getByRole('region', { name: 'Bonnes pratiques de sobriété' });
    expect(practices).toContainElement(heading);
    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Choisissez un petit modèle adapté à votre besoin lorsque cela suffit.',
      'Ne demandez pas un raisonnement détaillé si vous n’en avez pas besoin. Cela ne désactive pas le raisonnement du chatbot.',
      'Réduisez les textes envoyés et les textes générés au nécessaire.',
      'Commencez une nouvelle conversation lorsque l’ancien contexte ne vous est plus utile.',
      'Lorsque cela convient, modifiez un message existant plutôt que d’en envoyer un nouveau.',
    ]);
    expect([...document.querySelectorAll('.summary-panel, .impact-result')]).toHaveLength(3);
    for (const result of document.querySelectorAll('.summary-panel, .impact-result')) {
      expect(practices.compareDocumentPosition(result)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    }
    current.unmount();

    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'À recalculer' });
    renderBlocks(state);
    expect(screen.queryByRole('heading', { name: 'Bonnes pratiques de sobriété' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Ce résultat est périmé/)).toHaveLength(2);
    expect(screen.getByText(/Le bilan précédent est périmé/)).toBeVisible();
  });

  it('déclenche seulement le recalcul du total sans appeler de calcul individuel', async () => {
    const user = userEvent.setup();
    const calculate = vi.fn();
    const recalculateSummary = vi.fn();
    render(<ConversationBlocks
      state={initialConversationState}
      dispatch={() => undefined}
      onCalculate={calculate}
      onCalculateAll={() => undefined}
      onRecalculateSummary={recalculateSummary}
    />);

    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));

    expect(recalculateSummary).toHaveBeenCalledOnce();
    expect(calculate).not.toHaveBeenCalled();
  });

  it('recalcule le bilan dans l’application depuis un impact individuel existant', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Un échange déjà calculé');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    await screen.findByText('Estimation pour cet échange');
    expect(screen.queryByRole('heading', { name: 'Bilan de la conversation' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    const summary = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    expect(summary.parentElement).toHaveTextContent('Énergie:');
  });

  it('actualise l’équivalence du bilan après un changement de pays sans recalculer le bloc', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'US');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bilan conservé');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    await screen.findByText('Estimation pour cet échange');
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    const summaryEnergy = screen.getByText(/Énergie:/).textContent;

    await editReference(user);
    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'FR');
    await returnToThread(user);
    expect(screen.getByText(/estimation de durée de douche est périmée/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));

    expect(await screen.findByText(/Estimation : environ/)).toBeVisible();
    expect(screen.getByText(/Énergie:/).textContent).toBe(summaryEnergy);
  });

  it('réserve le repli de la douche au bilan calculé', async () => {
    const user = userEvent.setup();
    await startThread(user);
    await editReference(user);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'ID');
    await returnToThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Repli mondial');
    await user.click(screen.getByRole('button', { name: 'Calculer cet échange' }));
    await screen.findByText('Estimation pour cet échange');
    expect(screen.queryByText(/Estimation : environ/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    await screen.findByRole('heading', { name: 'Bilan de la conversation' });

    expect(screen.getByText(/facteur carbone de repli « Monde »/)).toBeVisible();
  });
});
