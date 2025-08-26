﻿import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI fehlt");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}
