import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ order: 1 });
CategorySchema.index({ createdAt: -1 });

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Category: Model<CategoryDocument> =
  (mongoose.models.Category as Model<CategoryDocument> | undefined) ??
  mongoose.model<CategoryDocument>("Category", CategorySchema);
