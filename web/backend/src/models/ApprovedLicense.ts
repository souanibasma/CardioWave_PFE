import mongoose, { Schema } from "mongoose";

export interface IApprovedLicense {
  licenseNumber: string;
}

const approvedLicenseSchema = new Schema<IApprovedLicense>(
  {
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IApprovedLicense>(
  "ApprovedLicense",
  approvedLicenseSchema
);
