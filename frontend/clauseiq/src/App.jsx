import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import PlaceholderPage from "./components/PlaceholderPage";
import AuthPage from "./pages/AuthPage";

import Layout from "./layouts/Layout";
import ContractIntake from "./pages/business/ContractIntake";
import ProcessingStatus from "./pages/business/ProcessingStatus";
import ExtractedClauses from "./pages/reviewer/ExtractedClauses";
import PlaybookManagement from "./pages/admin/PlaybookManagement";
import ReviewerQueue from "./pages/reviewer/ReviewerQueue";
import RiskScoringDashboard from "./pages/reviewer/RiskScoringDashboard";
import ClauseReview from "./pages/reviewer/ClauseReview";
import RedlineSuggestion from "./pages/reviewer/RedlineSuggestion";
import VersionComparison from "./pages/reviewer/VersionComparison";
import KeyDatesCalendar from "./pages/shared/KeyDatesCalendar";
import RepositorySearch from "./pages/shared/RepositorySearch";
import ContractQA from "./pages/shared/ContractQA";
import BusinessDashboard from "./pages/business/BusinessDashboard";
import ReviewOutcome from "./pages/business/ReviewOutcome";
import ApprovalScreen from "./pages/shared/ApprovalScreen";
import ContractSummary from "./pages/shared/ContractSummary";
import ComplianceFlags from "./pages/reviewer/ComplianceFlags";
import NotificationHistory from "./pages/shared/NotificationHistory";
import PortfolioAnalytics from "./pages/admin/PortfolioAnalytics";
import BulkImport from "./pages/reviewer/BulkImport";
import AuditTrail from "./pages/reviewer/AuditTrail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* Every authenticated page shares one Layout (sidebar + logout).
          Per-route ProtectedRoute still enforces role access; Layout
          itself just renders whatever nav links match the logged-in
          user's role. */}
      <Route element={<Layout />}>
       {/* Business User */}
<Route
  path="/business"
  element={
    <ProtectedRoute allowedRoles={["business_user"]}>
      <BusinessDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/business/intake"
  element={
    <ProtectedRoute allowedRoles={["business_user"]}>
      <ContractIntake />
    </ProtectedRoute>
  }
/>
<Route
  path="/business/processing/:contractId"
  element={
    <ProtectedRoute allowedRoles={["business_user"]}>
      <ProcessingStatus />
    </ProtectedRoute>
  }
/>
<Route
  path="/business/contracts/:contractId/review"
  element={
    <ProtectedRoute allowedRoles={["business_user"]}>
      <ReviewOutcome />
    </ProtectedRoute>
  }
/>

        {/* Legal Reviewer */}
        <Route
          path="/reviewer/queue"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <ReviewerQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/contracts/:contractId/clauses"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <ExtractedClauses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/contracts/:contractId/risk"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <RiskScoringDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/clauses/:clauseId"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <ClauseReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/clauses/:clauseId/redline"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <RedlineSuggestion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/contracts/:contractId/compare"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <VersionComparison />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/contracts/:contractId/compliance"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer"]}>
              <ComplianceFlags />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/bulk-import"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer", "admin"]}>
              <BulkImport />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/playbook"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PlaybookManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin", "legal_reviewer"]}>
              <PortfolioAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Shared — accessible by multiple roles, now under the same Layout */}
        <Route
          path="/search"
          element={
            <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
              <RepositorySearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:contractId/chat"
          element={
            <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
              <ContractQA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:contractId/summary"
          element={
            <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
              <ContractSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:contractId/audit"
          element={
            <ProtectedRoute allowedRoles={["legal_reviewer", "admin"]}>
              <AuditTrail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deadlines"
          element={
            <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
              <KeyDatesCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals/:contractId"
          element={
            <ProtectedRoute allowedRoles={["business_user", "legal_reviewer"]}>
              <ApprovalScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationHistory />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}