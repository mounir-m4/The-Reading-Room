import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Badge, Input } from '../components/common/UI.jsx';
import { formatMoney } from '../utils/currency.js';
import { localize } from '../utils/localized.js';
import { asLocalized, toMinor, fromMinor, statusTone } from '../pages/admin/adminUtils.js';
import { store } from '../store/index.js';

describe('currency and localization utilities', () => {
  it('formats minor units using the selected locale', () => {
    expect(formatMoney(12900, 'MAD', 'en')).toContain('129.00');
    expect(formatMoney(12900, 'MAD', 'fr')).toContain('129');
  });

  it('falls back through localized values', () => {
    expect(localize({ en: 'Dune', fr: 'Dune' }, 'ar')).toBe('Dune');
    expect(localize('Plain title', 'fr')).toBe('Plain title');
  });

  it('normalizes localized admin fields and converts money', () => {
    expect(asLocalized('Title')).toEqual({ en: 'Title', fr: '', ar: '' });
    expect(toMinor('129.50')).toBe(12950);
    expect(fromMinor(12950)).toBe('129.50');
    expect(statusTone('Delivered')).toBe('green');
  });
});

describe('redux store', () => {
  it('configures all slices without duplicate reducer cases', () => {
    expect(Object.keys(store.getState())).toEqual(['auth', 'cart', 'wishlist', 'ui', 'toast']);
  });
});

describe('common UI primitives', () => {
  it('renders a button and disables it while loading', () => {
    const { rerender } = render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();

    rerender(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('renders labels, badges and input errors', () => {
    render(
      <>
        <Input label="Email" error="Required" />
        <Badge tone="gold">Featured</Badge>
      </>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toHaveClass('bg-gold');
  });
});
