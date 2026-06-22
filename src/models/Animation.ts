import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const animationSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    format: { type: String, required: true },
    mimeType: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: null },
    status: { type: String, default: "Draft" },
    tags: { type: String, default: null },
    description: { type: String, default: null },
    order: { type: Number, default: 0 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  },
  { timestamps: true }
);

animationSchema.index({ order: 1 });
animationSchema.index({ status: 1, order: 1 });
animationSchema.index({ categoryId: 1, order: 1 });
animationSchema.index({ status: 1 });
animationSchema.index({ createdAt: 1 });

export type AnimationDocument = InferSchemaType<typeof animationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Animation: Model<AnimationDocument> =
  mongoose.models.Animation ?? mongoose.model<AnimationDocument>("Animation", animationSchema);
