import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IRevokedToken extends Document {
  jti: string;
  expiresAt: Date;
}

const RevokedTokenSchema: Schema<IRevokedToken> = new Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true, // Index for faster lookups
    },
    expiresAt: {
      type: Date,
      required: true,
      // Create a TTL index so MongoDB automatically removes documents after they expire.
      // The 'expireAfterSeconds: 0' means documents are deleted when 'expiresAt' time is reached.
      index: { expires: '0s' }, 
    },
  },
  { timestamps: false } // No need for createdAt/updatedAt for this collection
);

const RevokedToken: Model<IRevokedToken> = 
  models.RevokedToken || mongoose.model<IRevokedToken>('RevokedToken', RevokedTokenSchema);

export default RevokedToken;
