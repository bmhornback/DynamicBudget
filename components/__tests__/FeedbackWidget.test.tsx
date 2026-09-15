/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FeedbackWidget from '@/components/FeedbackWidget';
import { DEFAULT_INPUTS } from '@/lib/defaultScenarios';

describe('FeedbackWidget', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds a prefilled GitHub issue with optional budget context', () => {
    render(<FeedbackWidget currentInputs={DEFAULT_INPUTS} />);

    fireEvent.click(screen.getByRole('button', { name: '💬 Feedback' }));
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'education' },
    });
    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'Please add more first-home guidance.' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include a plain-text budget summary for context' }));

    const issueLink = screen.getByRole('link', { name: 'Open GitHub issue' });
    const href = issueLink.getAttribute('href') ?? '';

    expect(href).toContain('issues/new?title=');
    expect(decodeURIComponent(href)).toContain('Learn/content feedback');
    expect(decodeURIComponent(href)).toContain('Please add more first-home guidance.');
    expect(decodeURIComponent(href)).toContain('## Budget Context');
  });

  it('tracks feedback submission clicks locally', () => {
    render(<FeedbackWidget />);

    fireEvent.click(screen.getByRole('button', { name: '💬 Feedback' }));
    fireEvent.click(screen.getByRole('link', { name: 'Open GitHub issue' }));

    expect(window.localStorage.getItem('dynamicbudget_analytics_counts')).toContain('feedback_submitted');
  });
});
