import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import PlaceholderPage from "./components/PlaceholderPage";
import AuthPage from "./pages/AuthPage";

import BusinessLayout from "./layouts/BusinessLayout";
import ReviewerLayout from "./layouts/ReviewerLayout";
import AdminLayout from "./layouts/AdminLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      {/* Business User */}
      <Route
        path="/business"
        element={
          <ProtectedRoute allowedRoles={["business_user"]}>
            <BusinessLayout />
          </ProtectedRoute>
        }
      >
        <Route path="intake" element={<PlaceholderPage title="Contract Intake & Upload" useCase={2} />} />
        <Route path="processing/:contractId" element={<PlaceholderPage title="Document Processing Status" useCase={3} />} />
      </Route>

      {/* Legal Reviewer */}
      <Route
        path="/reviewer"
        element={
          <ProtectedRoute allowedRoles={["legal_reviewer"]}>
            <ReviewerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="queue" element={<PlaceholderPage title="Legal Reviewer Queue" useCase={13} />} />
        <Route path="contracts/:contractId/clauses" element={<PlaceholderPage title="Extracted Clauses" useCase={4} />} />
        <Route path="contracts/:contractId/risk" element={<PlaceholderPage title="Risk Scoring Dashboard" useCase={5} />} />
        <Route path="clauses/:clauseId" element={<PlaceholderPage title="Clause-Level Review" useCase={6} />} />
        <Route path="clauses/:clauseId/redline" element={<PlaceholderPage title="AI-Suggested Redline" useCase={7} />} />
        <Route path="contracts/:contractId/compare" element={<PlaceholderPage title="Version Comparison" useCase={8} />} />
        <Route path="contracts/:contractId/compliance" element={<PlaceholderPage title="Compliance Flags" useCase={15} />} />
        <Route path="bulk-import" element={<PlaceholderPage title="Bulk Contract Import" useCase={20} />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="playbook" element={<PlaceholderPage title="Clause Playbook Management" useCase={16} />} />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Portfolio Risk Analytics" useCase={18} />}
        />
      </Route>

      {/* Shared — accessible by multiple roles, no single layout */}
      <Route
        path="/search"
        element={
          <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
            <PlaceholderPage title="Semantic Repository Search" useCase={10} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:contractId/chat"
        element={
          <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
            <PlaceholderPage title="Contract Q&A Chatbot (RAG)" useCase={11} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:contractId/summary"
        element={
          <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
            <PlaceholderPage title="AI Contract Summary" useCase={14} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:contractId/audit"
        element={
          <ProtectedRoute allowedRoles={["legal_reviewer", "admin"]}>
            <PlaceholderPage title="Audit Trail" useCase={19} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deadlines"
        element={
          <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
            <PlaceholderPage title="Key Dates Calendar" useCase={9} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals/:contractId"
        element={
          <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
            <PlaceholderPage title="Approval & Signature Routing" useCase={12} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Deadline & Risk Notifications" useCase={17} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}