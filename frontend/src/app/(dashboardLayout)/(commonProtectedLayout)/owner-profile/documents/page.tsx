import { Metadata } from "next";
import DocumentsClient from "./DocumentsClient";

export const metadata: Metadata = {
  title: "Owner Documents",
  description: "Upload required documents for owner verification",
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}


