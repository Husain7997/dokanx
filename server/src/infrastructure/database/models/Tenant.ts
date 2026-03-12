import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tenant MongoDB Model
 * 
 * ব্যবসায়িক নিয়ম:
 * - subdomain ইউনিক হতে হবে
 * - নাম কমপক্ষে ২ ক্যারেক্টার
 * - স্ট্যাটাস: PENDING | ACTIVE | SUSPENDED
 */
export interface ITenant extends Document {
  name: string;
  subdomain: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  ownerId: string; // User ID (future auth system)
  plan: 'FREE' | 'BASIC' | 'PREMIUM';
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema<ITenant>({
  name: { 
    type: String, 
    required: true,
    minlength: 2,
    trim: true
  },
  subdomain: { 
    type: String, 
    required: true,
    unique: true,
    match: /^[a-z0-9-]{3,30}$/
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED'],
    default: 'PENDING'
  },
  ownerId: { 
    type: String, 
    required: true 
  },
  plan: { 
    type: String, 
    enum: ['FREE', 'BASIC', 'PREMIUM'],
    default: 'FREE'
  }
}, {
  timestamps: true // অটোমেটিক createdAt & updatedAt
});

// ইনডেক্স برای পারফরম্যান্স (১০০k+ টেন্যান্ট সাপোর্ট)
TenantSchema.index({ subdomain: 1 });
TenantSchema.index({ status: 1 });

const TenantModel = mongoose.model<ITenant>('Tenant', TenantSchema);

export default TenantModel;