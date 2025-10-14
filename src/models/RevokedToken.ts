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
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' }, 
    },
  },
  { timestamps: false }
);

const RevokedToken: Model<IRevokedToken> = 
  models.RevokedToken || mongoose.model<IRevokedToken>('RevokedToken', RevokedTokenSchema);

export default RevokedToken;
