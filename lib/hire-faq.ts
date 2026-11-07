/**
 * FAQ on /hire.
 * TODO(review): these answers are drafts. Payment terms, revision rounds and turnaround are
 * promises to clients, so change them to match how you actually work before going live.
 */

export type FaqItem = { id: string; question: string; answer: string };

export const HIRE_FAQ: FaqItem[] = [
  {
    id: 'pricing',
    question: 'How is pricing worked out?',
    answer:
      'Each package has a starting price for a typical scope. After a short call or your brief, I send a fixed quote for your project, so you know the full cost before any work starts. No hourly surprises.',
  },
  {
    id: 'turnaround',
    question: 'How fast can you deliver?',
    answer:
      'Most financial models take 5–10 working days, websites 1–2 weeks and AI automations 1–3 weeks. Urgent work is possible when my schedule allows; mention your deadline in the brief.',
  },
  {
    id: 'revisions',
    question: 'How many revisions are included?',
    answer:
      'Two rounds of revisions are included in every quote. Changes outside the agreed scope are quoted separately before I start on them.',
  },
  {
    id: 'payment',
    question: 'What are the payment terms?',
    answer:
      '50% upfront to book the work and 50% on delivery. Payment by UPI or bank transfer in India; international clients can pay by PayPal or Wise. You get an invoice for every payment.',
  },
  {
    id: 'confidentiality',
    question: 'Will you keep my data and idea confidential?',
    answer:
      'Yes. Your files, numbers and ideas are used only for your project and never shared. I’m happy to sign an NDA before you send anything sensitive, and I only show work in my portfolio with your permission.',
  },
  {
    id: 'time-zones',
    question: 'Do you work with clients outside India?',
    answer:
      'Yes. I’m based in India (IST, UTC+5:30) and overlap with the UK and Europe during their working day, and with the US in their morning or evening. Updates are async by email or WhatsApp, with calls at a time that suits you.',
  },
];
