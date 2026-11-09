import type { Metadata } from "next";
import { SavedTestEditView } from "@/components/saved-tests/SavedTestEditView";

export const metadata: Metadata = { title: "Edit saved test" };

export default function EditSavedTestPage() {
  return <SavedTestEditView />;
}
