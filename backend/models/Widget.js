import mongoose from "mongoose";

const WidgetSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, trim: true },
    // normalisierte Variante für Eindeutigkeit
    location_norm: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

WidgetSchema.pre("validate", function (next) {
  if (this.location) this.location_norm = this.location.trim().toLowerCase();
  next();
});

WidgetSchema.index({ location_norm: 1 }, { unique: true });

export default mongoose.model("Widget", WidgetSchema);
