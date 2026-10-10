import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { IDomain } from '@/types';

export interface IDomainDocument extends Omit<IDomain, '_id' | 'serverId' | 'userId'>, Document {
  serverId: Types.ObjectId;
  userId: Types.ObjectId;
}

const DomainSchema = new Schema<IDomainDocument>(
  {
    domainName: { type: String, required: true, lowercase: true, trim: true, unique: true },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetPort: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'pending', 'error'],
      default: 'pending',
    },
    sslStatus: {
      type: String,
      enum: ['none', 'pending', 'active', 'failed'],
      default: 'none',
    },
    nginxConfigPath: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

const Domain: Model<IDomainDocument> =
  mongoose.models.Domain || mongoose.model<IDomainDocument>('Domain', DomainSchema);

export default Domain;
