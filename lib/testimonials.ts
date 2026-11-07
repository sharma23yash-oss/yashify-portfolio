/**
 * Client quotes for /hire. While this list is empty the Testimonials section renders nothing.
 * Only add quotes you have permission to publish.
 */

export type Testimonial = {
  quote: string;
  name: string;
  /** e.g. "Founder, Acme Fintech" */
  role: string;
  /** Optional link to the person's LinkedIn or company. */
  href?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  // { quote: '…', name: 'Full Name', role: 'Founder, Company' },
];
