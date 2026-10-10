import mongoose, { Schema, Document, Model } from 'mongoose';
import { IServer } from '@/types';

export interface IServerDocument extends Omit<IServer, '_id'>, Document {}

const ServerSchema = new Schema<IServerDocument>(
  {
    name: { type: String, required: true, trim: true },
    ip: { type: String, required: true, trim: true },
    sshPort: { type: Number, default: 22 },
    agentPort: { type: Number, default: 4000 },
    agentApiKey: { type: String, required: true },
    status: {
      type: String,
      enum: ['online', 'offline', 'pending', 'unreachable'],
      default: 'pending',
    },
    os: { type: String, default: 'Ubuntu Linux' },
    specs: {
      cpuUsage: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
      totalMemoryMB: { type: Number, default: 0 },
      freeMemoryMB: { type: Number, default: 0 },
      diskUsage: { type: Number, default: 0 },
      uptimeSeconds: { type: Number, default: 0 },
    },
    lastPing: { type: Date, default: null },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

const Server: Model<IServerDocument> =
  mongoose.models.Server || mongoose.model<IServerDocument>('Server', ServerSchema);

export default Server;
