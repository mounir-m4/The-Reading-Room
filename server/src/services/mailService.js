import { sendMail } from '../config/mail.js';

const t = (templates, lang = 'en', key, vars = {}) => {
  let text = templates[lang]?.[key] || templates.en?.[key] || key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${name}}}`, String(value ?? ''));
  }
  return text;
};

const TEMPLATES = {
  welcome: {
    en: { subject: 'Welcome to {{store}}', body: 'Hello {{name}}, welcome to {{store}}. We are glad you joined us.' },
    fr: { subject: 'Bienvenue chez {{store}}', body: 'Bonjour {{name}}, bienvenue chez {{store}}. Nous sommes ravis de vous compter parmi nous.' },
    ar: { subject: 'مرحباً بك في {{store}}', body: 'مرحباً {{name}}، أهلاً بك في {{store}}. يسعدنا انضمامك إلينا.' },
  },
  verify: {
    en: { subject: 'Verify your email', body: 'Hello {{name}}, verify your email with this code: {{code}}' },
    fr: { subject: 'Vérifiez votre e-mail', body: 'Bonjour {{name}}, vérifiez votre e-mail avec ce code : {{code}}' },
    ar: { subject: 'تأكيد بريدك الإلكتروني', body: 'مرحباً {{name}}، أكّد بريدك الإلكتروني بهذا الرمز: {{code}}' },
  },
  reset: {
    en: { subject: 'Reset your password', body: 'Hello {{name}}, reset your password using this link: {{url}} (expires in 1 hour).' },
    fr: { subject: 'Réinitialisez votre mot de passe', body: 'Bonjour {{name}}, réinitialisez votre mot de passe via : {{url}} (expire dans 1 heure).' },
    ar: { subject: 'إعادة تعيين كلمة المرور', body: 'مرحباً {{name}}، أعد تعيين كلمة المرور عبر الرابط: {{url}} (تنتهي بعد ساعة).' },
  },
  orderConfirmation: {
    en: { subject: 'Order {{orderNumber}} confirmed', body: 'Thank you {{name}}! Your order {{orderNumber}} has been received. Total: {{total}}.' },
    fr: { subject: 'Commande {{orderNumber}} confirmée', body: 'Merci {{name}} ! Votre commande {{orderNumber}} a été reçue. Total : {{total}}.' },
    ar: { subject: 'تم تأكيد الطلب {{orderNumber}}', body: 'شكراً لك {{name}}! لقد استلمنا طلبك {{orderNumber}}. الإجمالي: {{total}}.' },
  },
  orderShipped: {
    en: { subject: 'Your order is on its way', body: 'Hello {{name}}, order {{orderNumber}} has been shipped.' },
    fr: { subject: 'Votre commande est en route', body: 'Bonjour {{name}}, la commande {{orderNumber}} a été expédiée.' },
    ar: { subject: 'طلبك في الطريق', body: 'مرحباً {{name}}، تم شحن طلبك {{orderNumber}}.' },
  },
  lowStock: {
    en: { subject: 'Low stock: {{title}}', body: 'The book {{title}} has only {{stock}} copies left.' },
    fr: { subject: 'Stock faible : {{title}}', body: 'Le livre {{title}} n’a plus que {{stock}} exemplaires.' },
    ar: { subject: 'مخزون منخفض: {{title}}', body: 'لم يتبقَّ من كتاب {{title}} سوى {{stock}} نسخ.' },
  },
  newsletter: {
    en: { subject: 'Welcome to our newsletter', body: 'Thanks for subscribing to {{store}} news.' },
    fr: { subject: 'Bienvenue à notre newsletter', body: 'Merci pour votre inscription aux actualités de {{store}}.' },
    ar: { subject: 'أهلاً بك في نشرتنا البريدية', body: 'شكراً لاشتراكك في أخبار {{store}}.' },
  },
};

export async function sendTemplate(to, templateKey, vars = {}, lang = 'en') {
  const subject = t(TEMPLATES[templateKey] || {}, lang, 'subject', vars);
  const body = t(TEMPLATES[templateKey] || {}, lang, 'body', vars);
  const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#242424">
    <h1 style="color:#783D45">${vars.store || 'The Reading Room'}</h1>
    <p>${body}</p>
    <hr style="border:none;border-top:1px solid #F0EDE6"/>
    <small style="color:#777">${lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</small>
  </div>`;
  return sendMail({ to, subject, html, text: body });
}

export const EMAIL_KEYS = Object.keys(TEMPLATES);
