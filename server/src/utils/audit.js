import { AuditLog } from '../models/Operations.js';

export async function audit(req, action, module, targetId = '', details = {}) {
  if (!req.admin) return;
  await AuditLog.create({
    actor: req.admin._id,
    actorName: req.admin.name,
    action,
    module,
    targetId: String(targetId || ''),
    details,
    ip: req.ip,
  });
}
