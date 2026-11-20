import Stripe from 'stripe';
import { env } from './env.js';

export const stripeEnabled = Boolean(env.stripe.secretKey);
export const stripe = stripeEnabled
  ? new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' })
  : null;
