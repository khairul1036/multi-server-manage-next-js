import mongoose, { Schema, Document, Model } from 'mongoose';
import { IActivityLog } from '@/types';

export interface IActivityLogDocument extends Omit<IActivityLog, '_id'>, Document {}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    target: { type: String },
    status: {
      type: String,
      enum: ['success', 'failure', 'warning', 'info'],
      default: 'info',
    },
    details: { type: String },
  },
  {
    timestamps: true,
  }
);

const ActivityLog: Model<IActivityLogDocument> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
