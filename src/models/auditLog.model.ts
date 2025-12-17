import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: string;
  role: string;
  action: string;
  targetId?: string; // ID of the entity being accessed (e.g., service provider, agent, etc.)
  timestamp: Date;
  metadata?: any; // Optional field for storing additional data (e.g., IP, location, device)
  serviceProviderId:string;
  username:string;

}

const auditLogSchema = new Schema<IAuditLog>({
  userId: { type: String, required: true },
  role: { type: String, enum: ['CLIENT', 'AGENT'], required: true },
  action: { type: String, required: true }, // e.g., 'VIEW_SERVICE', 'LOGIN', 'UPDATE_PROFILE'
  targetId: { type: String }, // Optional, if applicable
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Object },
  serviceProviderId: {
      type: String,
      required: true,
  },
  username:{
      type: String,
  }
});

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
