import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { impactTexts } from './App';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { ConversationBlocks, formatImpact } from './ConversationBlocks';
import {
  conversationReducer,
  impactFingerprint,
  initialConversationState,
  showerFingerprint,
  summaryFingerprint,
} from '../application/conversationReducer';

describe('composition de la conversation', () => {
  it('ajoute un bloc avec quatre champs libellés accessibles', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByLabelText('Message')).toBeVisible();
    expect(screen.getByLabelText('Réponse finale')).toBeVisible();
    expect(screen.getByLabelText('Raisonnement visible')).toBeVisible();
    expect(screen.getByLabelText('Artifact optionnel')).toBeVisible();
  });

  it('importe via le registre, conserve les avis de contenus inaccessibles, puis ajoute un échange manuel', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue(new Response('<script type="application/json">{"messages":[{"author":{"role":"user"},"content":{"parts":["Question"]}},{"author":{"role":"assistant"},"content":{"parts":["[artifact](sandbox:/mnt/data/a.csv) fileciteturn0file0L1"]}}]}</script>'));
    vi.stubGlobal('fetch', fetch);
    try {
      render(<App />);
      await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
      await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
      await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });
      await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
      expect(screen.getByLabelText('Message')).toHaveValue('Question');
      expect(screen.getAllByText('Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter.').some((element) => element.getAttribute('role') === 'status')).toBe(true);
      expect(screen.getAllByText('Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée.').some((element) => element.getAttribute('role') === 'status')).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
      expect(screen.getAllByLabelText('Message')).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });

  it('signale un bloc vide comme ignoré et conserve le texte renseigné durant la session', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByText('Ce bloc sera ignoré pour les calculs futurs.')).toBeVisible();
    await user.type(screen.getByLabelText('Message'), ' Bonjour ');
    expect(screen.queryByText('Ce bloc sera ignoré pour les calculs futurs.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue(' Bonjour ');
  });

  it('isole deux blocs, génère des identifiants distincts et déplace le focus après une suppression ciblée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    const messages = screen.getAllByLabelText('Message');
    expect(messages[0].id).not.toBe(messages[1].id);
    await user.type(messages[0], 'à supprimer');
    await user.type(messages[1], 'à conserver');
    const removeFirst = screen.getByRole('button', { name: 'Supprimer l’échange 1' });
    removeFirst.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByLabelText('Message')).toHaveLength(1);
    expect(screen.getByLabelText('Message')).toHaveValue('à conserver');
    expect(screen.getByRole('button', { name: 'Supprimer l’échange 1' })).toHaveFocus();
  });

  it('reste utilisable au clavier et ne persiste pas les blocs au nouveau montage', async () => {
    const user = userEvent.setup();
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const historyPush = vi.spyOn(History.prototype, 'pushState');
    const historyReplace = vi.spyOn(History.prototype, 'replaceState');
    const first = render(<App />);
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ajouter un échange' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.type(screen.getByLabelText('Message'), 'éphémère');
    expect(storageSet).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(storageClear).not.toHaveBeenCalled();
    expect(historyPush).not.toHaveBeenCalled();
    expect(historyReplace).not.toHaveBeenCalled();
    first.unmount();
    render(<App />);
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });

  it('calcule explicitement un seul échange et affiche ses impacts avec leurs limites', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByText(/Énergie:/)).toBeVisible();
    expect(screen.getByText(/Estimation incertaine/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Calculer' })).toHaveLength(1);
  });

  it('applique une constante avancée validée au calcul suivant', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const initialEnergy = (await screen.findByText(/Énergie:/)).textContent;

    await user.click(screen.getByText('Paramètres avancés'));
    const alpha = screen.getByLabelText('Constante énergie alpha (Wh/token)');
    await user.clear(alpha);
    await user.type(alpha, '0.00001');
    await user.click(screen.getByRole('button', { name: 'Appliquer les paramètres' }));
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect((await screen.findByText(/Énergie:/)).textContent).not.toBe(initialEnergy);
  });

  it('applique le pays d’hébergement choisi aux calculs et au risque du bilan', async () => {
    const user = userEvent.setup();
    const french = render(<App />);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays d’hébergement'), 'FR');
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const frenchCarbon = (await screen.findByText(/Carbone:/)).textContent;
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    const summary = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    expect(summary.parentElement).toHaveTextContent('Medium - High (0.6-0.8)');
    expect(summary.parentElement).toHaveTextContent(frenchCarbon!);
    french.unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect((await screen.findByText(/Carbone:/)).textContent).not.toBe(frenchCarbon);
  });

  it('calcule les seuls échanges renseignés puis affiche leur bilan et le risque pays', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getAllByLabelText('Message')[0], 'Premier échange');
    await user.type(screen.getAllByLabelText('Message')[1], 'Deuxième échange plus long');
    await user.click(screen.getByRole('button', { name: 'Tout calculer' }));
    const summaryHeading = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    const individualEnergies = [...document.querySelectorAll('.impact-result')].map((element) => (
      Number(element.textContent!.match(/[\d,]+/)![0].replace(',', '.'))
    ));
    const summaryEnergy = Number(summaryHeading.parentElement!.textContent!.match(/Énergie: ([\d,]+)/)![1].replace(',', '.'));
    expect(screen.getAllByText(/Énergie:/)).toHaveLength(3);
    expect(summaryEnergy).toBeGreaterThan(Math.max(...individualEnergies));
    expect(summaryEnergy).toBeCloseTo(individualEnergies[0] + individualEnergies[1], 4);
    expect(screen.getByText(/Risque de sécheresse du pays d’hébergement:/)).toBeVisible();
  });

  it('invite à saisir un échange sans afficher de bilan si tous les blocs sont vides', async () => {
    const user = userEvent.setup();
    render(<App />);
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

  it('formate quatre chiffres significatifs et annonce un blocage de données', () => {
    expect(formatImpact(0.00123456)).toBe('0,001235');
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    state = conversationReducer(state, { type: 'impactBlocked', blockId: 'one', fingerprint: impactFingerprint(state, 'one'), code: 'invalid-data' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('donnée indispensable');
    expect(screen.queryByRole('heading', { name: 'Bonnes pratiques de sobriété' })).not.toBeInTheDocument();
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

  it('rend une estimation de douche, annonce le repli Monde et masque seulement cette estimation quand le pays change', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    state = conversationReducer(state, { type: 'userCountrySelected', country: 'ID' });
    const shower = showerFingerprint(state, 2);
    state = conversationReducer(state, { type: 'showerEquivalenceResolved', blockId: 'one', fingerprint: shower, equivalence: { status: 'available', seconds: 1, factorSource: 'world' } });
    const rendered = render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByText(/Estimation : environ/)).toBeVisible();
    expect(screen.getByText(/facteur carbone de repli « Monde »/)).toBeVisible();
    rendered.unmount();

    state = conversationReducer(state, { type: 'userCountrySelected', country: 'FR' });
    render(<ConversationBlocks state={state} dispatch={() => undefined} onCalculate={() => undefined} onCalculateAll={() => undefined} />);
    expect(screen.getByText(/estimation de durée de douche est périmée/)).toBeVisible();
    expect(screen.getByText('Énergie: 1 Wh')).toBeVisible();
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
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Un échange déjà calculé');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const impact = await screen.findByText(/Énergie:/);
    const individualEnergy = impact.parentElement!.textContent!.match(/Énergie: ([\d,]+)/)![1];
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    const summary = await screen.findByRole('heading', { name: 'Bilan de la conversation' });
    expect(summary.parentElement).toHaveTextContent(`Énergie: ${individualEnergy}`);
  });

  it('actualise l’équivalence du bilan après un changement de pays sans recalculer le bloc', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'US');
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Bilan conservé');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    const individualEnergy = (await screen.findByText(/Énergie:/)).parentElement!.textContent!.match(/Énergie: ([\d,]+)/)![1];
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    await screen.findByRole('heading', { name: 'Bilan de la conversation' });

    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'FR');
    expect(screen.getAllByText(/estimation de durée de douche est périmée/)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));

    expect(await screen.findByText(/Estimation : environ/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Bilan de la conversation' }).parentElement).toHaveTextContent(`Énergie: ${individualEnergy}`);
  });

  it('rend le repli Monde pour l’équivalence du bloc et du bilan calculés', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.selectOptions(screen.getByLabelText('Pays de la personne'), 'ID');
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Message'), 'Repli mondial');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByText(/Estimation : environ/);
    await user.click(screen.getByRole('button', { name: 'Recalculer le total' }));
    await screen.findByRole('heading', { name: 'Bilan de la conversation' });

    expect(screen.getAllByText(/facteur carbone de repli « Monde »/)).toHaveLength(2);
  });
});
