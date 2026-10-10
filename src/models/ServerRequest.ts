import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { IServerRequest } from '@/types';

export interface IServerRequestDocument extends Omit<IServerRequest, '_id' | 'userId' | 'assignedServerId'>, Document {
  userId: Types.ObjectId;
  assignedServerId?: Types.ObjectId;
}

const ServerRequestSchema = new Schema<IServerRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedRamMB: { type: Number, required: true, default: 2048 },
    requestedDiskMB: { type: Number, required: true, default: 20480 },
    purpose: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    assignedServerId: { type: Schema.Types.ObjectId, ref: 'Server' },
    adminNotes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

const ServerRequest: Model<IServerRequestDocument> =
  mongoose.models.ServerRequest ||
  mongoose.model<IServerRequestDocument>('ServerRequest', ServerRequestSchema);

export default ServerRequest;
