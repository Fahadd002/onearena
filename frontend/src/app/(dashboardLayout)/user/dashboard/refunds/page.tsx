import { Metadata } from "next";
import PageClient from "../pageClient";


export const metadata: Metadata = {
  title: "My Refunds",
  description: "View your refunds",
};

export default function Page() {
  return <PageClient />;
}



