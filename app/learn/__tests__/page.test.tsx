import React from 'react';
import { render, screen } from '@testing-library/react';
import LearnPage from '../page';

describe('Learn page', () => {
  it('renders educational guides and planner CTA', () => {
    render(<LearnPage />);

    expect(screen.getByRole('heading', { name: 'Budgeting concepts tied directly to your plan' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the planner' }).getAttribute('href')).toBe('/');
    expect(screen.getByText('How much should rent cost?')).toBeTruthy();
    expect(screen.getByText('How should you pick a 401(k) contribution rate?')).toBeTruthy();
  });
});
