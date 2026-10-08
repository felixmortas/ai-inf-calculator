import { screen } from '@testing-library/react';
import { renderWithI18n as render } from '../test/renderWithI18n';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { CalculationBar } from './CalculationBar';
import { conversationReducer, impactFingerprint, initialConversationState } from '../application/conversationReducer';

vi.mock('../domain/impact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domain/impact')>()),
  calculateImpact: () => ({ ok: false, code: 'invalid-parameters' }),
}));

describe('échec de calcul', () => {
  it('annonce l’échec près de l’action, lève le verrou et laisse « Calculer » réutilisable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le calcul a échoué');
    expect(screen.queryByRole('heading', { name: 'Résultat' })).not.toBeInTheDocument();
    expect(document.querySelector('.calculation-overlay')).toBeNull();
    expect(document.querySelector('.app-shell')).not.toHaveAttribute('inert');
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('Bonjour');
    const calculate = screen.getByRole('button', { name: 'Calculer' });
    expect(calculate).not.toHaveAttribute('aria-disabled');
    await user.click(calculate);
    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it('affiche l’alerte quand un échange est en erreur sans résumé', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    state = conversationReducer(state, { type: 'impactBlocked', blockId: 'one', fingerprint: impactFingerprint(state, 'one'), code: 'invalid-data' });
    render(<CalculationBar state={state} onCalculate={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Le calcul a échoué');
  });
});
